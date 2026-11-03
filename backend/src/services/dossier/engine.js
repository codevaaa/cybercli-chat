import { randomUUID } from 'node:crypto'
import { activeLines, addFix, assertNoSecrets, block, event, installSpec, judgeInput, lines, queueTasks, ready, transition, validateVerdicts, fault } from './domain.js'
import { TEST_COMMAND, validateFiles } from './sandbox.js'
import { recordedTool } from './tools.js'
import { modelClass } from './modelTier.js'
import { visualApproval } from './visual.js'
import { assertEditable, installDesigns } from './roles.js'
import { buildWithRoles, phase3Gates } from './phase3.js'

export class DossierEngine {
  constructor({ store, models, sandbox, leaseOwner }) { Object.assign(this, { store, models, sandbox, leaseOwner }) }
  async mutate(doc, change) { return this.store.mutate(doc.project_id, doc.user_id, change, this.leaseOwner) }
  async model(doc, role, payload, extra = {}) {
    let attempted = false
    return this.models.call({ role, payload, plan: doc.plan, userId: doc.user_id, projectId: String(doc.project_id), ...extra,
      onRoute: async detail => {
        const firstAttempt = ['Builder', 'Frontend'].includes(role) && payload.instruction === undefined && detail.kind === 'provider_attempt' && !attempted
        await this.mutate(doc, d => {
          if (firstAttempt) d.tasks.find(t => t.id === d.current_task).attempts++
          event(d, role, { ...detail, tier: detail.provider === 'local' ? 'local' : modelClass(detail.provider, detail.model), spec_line_ids: activeLines(doc.data).map(l => l.id) })
        })
        if (firstAttempt) attempted = true
      } })
  }
  async step(doc) {
    const d = doc.data
    try {
      assertEditable(d)
      if (['tasks', 'build', 'judge'].includes(d.state) && activeLines(d).some(l => !['accepted', 'edited'].includes(l.status))) return this.mutate(doc, data => {
        block(data, 'New fix requires user acceptance', 'wait_for_user')
        transition(data, 'wait_for_user')
      })
      if (d.state === 'listen') return this.mutate(doc, data => transition(data, 'spec'))
      if (d.state === 'spec') {
        const result = await this.model(doc, 'Conductor', { prompt_original: d.prompt_original, pack: d.pack,
          prompts_added: d.prompts_added,
          format: { will_build: ['small concrete build goal'], must_never: ['prohibited outcome'], acceptance: ['observable pass/fail requirement'] } })
        const specified = await this.mutate(doc, data => installSpec(data, result.value))
        if (d.pipeline_version === 3) {
          const designs = await this.model(specified, 'Designer', { prompt_original: d.prompt_original, spec: activeLines(specified.data), format: { proposals: [{ title: 'short title', summary: 'short design; no code, at most 800 characters', spec_line_ids: ['covered spec ids'] }, { title: 'second different design', summary: 'short alternative; length is never a winner reason', spec_line_ids: ['covered spec ids'] }] } })
          await this.mutate(specified, data => installDesigns(data, designs.value.proposals))
        }
        return this.mutate(doc, data => transition(data, 'wait_for_user'))
      }
      if (['wait_for_user', 'live', 'done', 'blocked'].includes(d.state)) return doc
      if (d.state === 'tasks') {
        ready(d)
        const task = d.tasks.find(t => t.status !== 'tested')
        return this.mutate(doc, data => {
          if (task) { data.current_task = task.id; transition(data, 'build', 'Builder', { task_id: task.id, spec_line_ids: task.spec_line_ids }) }
          else transition(data, 'judge', 'Judge')
        })
      }
      if (d.state === 'build') {
        ready(d)
        const task = d.tasks.find(t => t.id === d.current_task)
        if (!task) throw fault('Current task is missing')
        if (d.pipeline_version === 3) return await buildWithRoles(this, doc, task)
        await this.sandbox.ensure(d.project_id)
        const read = await recordedTool(this, doc, 'read', {}, () => this.sandbox.read(d.project_id))
        if (read.error) throw fault(read.error)
        const files = read.value
        await this.mutate(doc, data => event(data, 'Builder', { kind: 'build_attempt', task_id: task.id, reason: task.attempts >= 2 ? 'two_mid_failures' : 'mid_default' }))
        const result = await this.model(doc, 'Builder', { prompt_original: d.prompt_original, pack: d.pack,
          spec: activeLines(d).map(({ id, group, final_text }) => ({ id, group, text: final_text })), task_spec_line_ids: task.spec_line_ids, files,
          previous_test_output: task.output, previous_judge_lines: d.judge.map(j => ({ agent_id: j.agent_id, lines: j.lines.filter(line => task.spec_line_ids.includes(line.id)) })),
          contract: 'Python 3.12.8 stdlib/SQLite app. Return {files:[{path,content}]}. Write features.py with render(user, rows) returning a nonempty complete HTML document with inline CSS/JS. Every visible generated UI label needs data-i18n-en and data-i18n-hi attributes (literal English and Hindi translations); the immutable runtime supplies the language toggle and window.codevaSetLanguage. Dynamic messages must update both attributes. User row data is not a UI label. Auth and seeded owner-scoped data are supplied by the immutable runtime. GET rows returns {rows:[{id,owner,title}]}. POST rows takes {action:create,title}, {action:update,id,title} or {action:delete,id}; ownership is enforced server-side. Use these relative URLs, no dependencies, no network, no external targets. Implement only the accepted task lines. If this fixed stack cannot satisfy them return {blocked:reason}, not fake functionality.' }, { failures: task.attempts })
        if (result.value.blocked) throw fault('Builder cannot satisfy the accepted spec within this stack')
        validateFiles(result.value.files)
        const written = await recordedTool(this, doc, 'write', { paths: result.value.files.map(f => f.path) }, () => this.sandbox.write(d.project_id, result.value.files))
        if (written.error) throw fault(written.error)
        const diff = written.value
        return this.mutate(doc, data => { const t = data.tasks.find(t => t.id === task.id); t.diff = diff; t.builder = { provider: result.provider, model: result.model }; t.status = 'built'; transition(data, 'test', 'Tester', { task_id: task.id, spec_line_ids: task.spec_line_ids }) })
      }
      if (d.state === 'test') {
        const task = d.tasks.find(t => t.id === d.current_task)
        const [read, search, tested] = await Promise.all([
          recordedTool(this, doc, 'read', {}, () => this.sandbox.read(d.project_id)),
          recordedTool(this, doc, 'search', { query: 'render' }, () => this.sandbox.search(d.project_id, 'render')),
          recordedTool(this, doc, 'test', { command: TEST_COMMAND }, () => this.sandbox.test(d.project_id, TEST_COMMAND)),
        ])
        const result = tested.value?.exit_code === undefined ? { exit_code: 1, output: tested.error || 'Missing test output', tests: [] } : tested.value
        let screen = null, failure = null
        let recordedResult = result
        try { assertNoSecrets(JSON.stringify(result)) }
        catch (error) {
          failure = error.message
          recordedResult = { exit_code: result.exit_code, output: 'Test output redacted by secret scan', tests: [], redacted: true }
        }
        try {
          if (failure) throw fault(failure)
          if (read.error || search.error || tested.error) throw fault(read.error || search.error || tested.error)
          assertNoSecrets(JSON.stringify(read.value))
          if (result.exit_code !== 0) throw fault('Trusted contract test failed')
          if (d.pipeline_version === 3) await phase3Gates(this, doc, task)
          if (task.ui) {
            const captured = await recordedTool(this, doc, 'browser', {}, () => this.sandbox.browser(d.project_id))
            if (captured.error) throw fault(captured.error)
            screen = captured.value
            const previous = d.tasks.filter(t => t.id !== task.id && t.screen?.screenshot).at(-1)?.screen || task.screen
            if (previous) {
              const compared = await recordedTool(this, doc, 'visual_compare', { before: previous.screenshot, after: screen.screenshot }, () => this.sandbox.compare(previous.screenshot, screen.screenshot))
              if (compared.error) throw fault(compared.error)
              screen.visual_diff = compared.value
              Object.assign(screen.visual_diff, visualApproval(d, task, screen.visual_diff.ratio))
              if (!screen.visual_diff.allowed) throw fault('Unexpected visual change exceeds 20%; accept an explicit appearance/layout spec line', 422)
            } else screen.visual_diff = { baseline: true, ratio: 0, allowed: true }
          }
        } catch (error) { failure = error.message }
        return this.mutate(doc, data => {
          const t = data.tasks.find(t => t.id === task.id)
          t.command = TEST_COMMAND; t.output = recordedResult; t.screenshot = screen?.screenshot_path || null; t.screen = screen; t.test_id = randomUUID()
          data.sources.push({ type: 'test', test_id: t.test_id, spec_line_ids: t.spec_line_ids })
          if (failure) { t.status = 'failed'; block(data, failure, 'build') }
          else { t.status = 'tested'; transition(data, 'tasks', 'Tester', { task_id: t.id, test_id: t.test_id, spec_line_ids: t.spec_line_ids }) }
        })
      }
      if (d.state === 'judge') {
        ready(d)
        if (d.tasks.some(t => t.status !== 'tested')) throw fault('Untested task blocks judging')
        const tests = await this.sandbox.test(d.project_id)
        if (tests.exit_code !== 0) throw fault('Current running app failed contract tests')
        const screen = await this.sandbox.browser(d.project_id)
        screen.source_id = `screen:${randomUUID()}`
        tests.source_id = `test:${randomUUID()}`
        const image = await this.sandbox.artifact(screen.screenshot)
        await this.mutate(doc, data => data.sources.push({ type: 'screen', id: screen.source_id, path: screen.screenshot_path }, { type: 'test', id: tests.source_id, output: tests }))
        const input = judgeInput(d, { screen, tests, sources: d.sources })
        const sourceIds = new Set([screen.source_id, tests.source_id])
        const payload = { ...input, format: { lines: [{ id: 'each supplied spec id', verdict: 'pass|fail|needs_user', evidence: 'specific observed app/test evidence', source_ids: ['supplied screen or test source_id'] }] } }
        // Same parallel-result pattern as Council, without modifying Council.
        const results = await Promise.all(['Judge', 'Judge-cheap'].map(async role => {
          const result = await this.model(doc, role, payload, { image })
          const verdicts = Array.isArray(result.value.lines) ? result.value.lines : []
          return { agent_id: role, provider: result.provider, model: result.model, lines: activeLines(d).map(line => {
            const matches = verdicts.filter(v => v.id === line.id)
            const value = matches.length === 1 ? matches[0] : null
            const verifiedSource = Array.isArray(value?.source_ids) && value.source_ids.length > 0 && value.source_ids.every(id => sourceIds.has(id))
            const verdict = value && ['pass', 'fail', 'needs_user'].includes(value.verdict) && typeof value.evidence === 'string' && value.evidence.trim() && (value.verdict !== 'pass' || verifiedSource) ? value.verdict : 'fail'
            return { id: line.id, verdict, evidence: typeof value?.evidence === 'string' && value.evidence.trim() ? value.evidence.slice(0, 2000) : 'Missing independent acceptance evidence', source_ids: verifiedSource ? value.source_ids : [] }
          }) }
        }))
        const current = await this.store.get(doc.project_id, doc.user_id)
        if (activeLines(current.data).some(l => !['accepted', 'edited'].includes(l.status)) || !validateVerdicts(current.data, results)) {
          return this.mutate(doc, data => {
            data.judge = results
            if (activeLines(data).some(l => !['accepted', 'edited'].includes(l.status))) {
              block(data, 'New fix requires user acceptance', 'wait_for_user')
              transition(data, 'wait_for_user')
              return
            }
            const failed = new Set(results.flatMap(j => j.lines.filter(l => l.verdict === 'fail').map(l => l.id)))
            const task = data.tasks.find(t => t.spec_line_ids.some(id => failed.has(id)))
            if (task) {
              for (const bound of data.tasks.filter(t => t.spec_line_ids.some(id => failed.has(id)))) bound.status = 'failed'
              data.current_task = task.id
            }
            const resume = results.some(j => j.lines.some(l => l.verdict === 'needs_user')) ? 'wait_for_user' : task ? 'build' : 'judge'
            block(data, 'Judge failure, missing line, or model disagreement', resume)
          })
        }
        // Replay only the actual previously stored clicks, never invented clicks.
        const clicks = d.live.filter(l => l.type === 'click')
        const replays = []
        for (const click of clicks) replays.push({ type: 'replay', click_id: click.id, generation: d.generation, result: await this.sandbox.browser(d.project_id, click.click) })
        const snapshot = await this.sandbox.snapshot(d.project_id)
        return this.mutate(doc, data => {
          if (activeLines(data).some(l => !['accepted', 'edited'].includes(l.status))) { block(data, 'Fix arrived during judging', 'wait_for_user'); return }
          data.judge = results; data.live.push(...replays); data.last_green = { generation: data.generation, snapshot, judge: results, tasks: data.tasks, spec: structuredClone(data.spec), time: new Date().toISOString() }
          transition(data, 'live', 'Judge', { verdict: 'pass', spec_line_ids: activeLines(data).map(l => l.id) })
        })
      }
      throw fault('Unknown dossier state')
    } catch (error) {
      return this.mutate(doc, data => {
        const reason = error.status ? error.message : 'Runtime dependency or operation failed'
        if (d.pipeline_version === 3 && d.state === 'build') {
          const task = data.tasks.find(t => t.id === data.current_task)
          if (task) { task.status = 'failed'; task.output = { exit_code: 1, output: reason, tests: ['role_build_contract'] } }
        }
        block(data, reason, d.state)
      })
    }
  }
  async start(projectId, userId) {
    return this.store.mutate(projectId, userId, d => {
      assertEditable(d)
      if (d.editor_reviews?.some(r => r.status === 'pending')) throw fault('Accept or reject the pending diff before running')
      if (d.state === 'blocked') {
        if (d.blocked.resume_state === 'wait_for_user' || activeLines(d).some(l => !['accepted', 'edited'].includes(l.status))) { transition(d, 'wait_for_user'); return }
        else transition(d, d.blocked.resume_state)
      }
      if (d.state === 'wait_for_user') { ready(d); if (d.pipeline_version === 3 && !d.design?.selected) throw fault('Choose one of the two design proposals before coding'); d.generation++; queueTasks(d) }
      else if (!['listen', 'spec', 'tasks', 'build', 'test', 'judge'].includes(d.state)) throw fault('Project is not ready to run')
    })
  }
  async listener(projectId, userId, text) {
    if (typeof text !== 'string' || !text.trim() || text.length > 2000) throw fault('Question is required', 400)
    assertNoSecrets(text)
    const doc = await this.store.get(projectId, userId)
    // Read-only answer from stored evidence. No inference presented as fact.
    const answer = `Stored state: ${doc.data.state}. ${doc.data.tasks.filter(t => t.status === 'tested').length}/${doc.data.tasks.length} tasks tested. ${doc.data.blocked ? `Block: ${doc.data.blocked.reason}` : 'No stored block.'} The dossier contains no further verified answer to this question.`
    await this.store.mutate(projectId, userId, d => {
      d.prompts_added.push({ id: randomUUID(), type: 'question', text, answer, time: new Date().toISOString() })
      event(d, 'Listener', { kind: 'question' })
    })
    return { answer, source: { type: 'dossier', revision: doc.revision, state: doc.data.state } }
  }
  async fix(projectId, userId, text) { return this.store.mutate(projectId, userId, d => { assertEditable(d); addFix(d, text) }) }
}
