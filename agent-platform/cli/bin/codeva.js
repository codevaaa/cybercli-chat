#!/usr/bin/env node
/**
 * CodeVaa CLI — Command-line interface for the Agent Platform
 *
 * Commands:
 *   codeva run "<goal>"          — Run a goal with the full agent swarm
 *   codeva agent <type> "<task>" — Run a single specific agent
 *   codeva skills list           — List installed skills
 *   codeva skills add <file>     — Install a skill from a file
 *   codeva status                — Show platform status
 *   codeva logs [sessionId]      — View session logs
 *   codeva ui                    — Open the Agent Manager UI
 *   codeva init                  — Initialize CodeVaa in current project
 */
import { program }    from 'commander'
import chalk          from 'chalk'
import ora            from 'ora'
import boxen          from 'boxen'
import gradient       from 'gradient-string'
import { WebSocket }  from 'ws'
import { v4 as uuid } from 'uuid'
import fs             from 'fs/promises'
import path           from 'path'
import open           from 'open'
import Table          from 'cli-table3'
import { PLATFORM_PORT, PLATFORM_HOST, PLATFORM_VERSION, PLATFORM_NAME } from '../../src/config.js'

const PLATFORM_URL = `http://${PLATFORM_HOST}:${PLATFORM_PORT}`
const WS_URL       = `ws://${PLATFORM_HOST}:${PLATFORM_PORT}/ws`

// ── Banner ─────────────────────────────────────────────────────────────────
function printBanner() {
  const banner = gradient(['#D97757', '#FF6B35', '#FFD700'])(
    `  ██████╗ ██████╗ ██████╗ ███████╗██╗   ██╗ █████╗ 
  ██╔════╝██╔═══██╗██╔══██╗██╔════╝██║   ██║██╔══██╗
  ██║     ██║   ██║██║  ██║█████╗  ██║   ██║███████║
  ██║     ██║   ██║██║  ██║██╔══╝  ╚██╗ ██╔╝██╔══██║
  ╚██████╗╚██████╔╝██████╔╝███████╗ ╚████╔╝ ██║  ██║
   ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝  ╚═══╝  ╚═╝  ╚═╝`
  )
  console.log('\n' + banner)
  console.log(chalk.dim(`  Agent Platform v${PLATFORM_VERSION} — by Chandan Pandey\n`))
}

// ── Platform connectivity check ────────────────────────────────────────────
async function checkPlatform() {
  try {
    const res = await fetch(`${PLATFORM_URL}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

// ── WebSocket run with live streaming ─────────────────────────────────────
async function runWithStreaming(goal, options = {}) {
  return new Promise((resolve, reject) => {
    const sessionId = uuid()
    const ws        = new WebSocket(WS_URL)
    const spinner   = ora({ text: chalk.cyan('Connecting to CodeVaa platform...'), color: 'cyan' }).start()

    let agentOutputs  = {}
    let currentAgent  = null
    let taskCount     = 0
    let completedCount = 0
    let tokenBuffer   = ''
    let flushInterval

    ws.on('open', () => {
      spinner.text = chalk.cyan('Planning your goal...')
      ws.send(JSON.stringify({
        type:           'run',
        sessionId,
        goal,
        projectPath:    options.projectPath || process.cwd(),
        projectContext: options.context || '',
        maxParallel:    parseInt(options.parallel || '4', 10),
      }))
    })

    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString())

      switch (msg.type) {
        case 'orchestrator:planning':
          spinner.text = chalk.yellow(`📋 Planning: "${goal.slice(0, 60)}..."`)
          break

        case 'orchestrator:graph_ready': {
          const snap = msg.tasks ? msg : msg.graph || msg
          taskCount  = snap?.stats?.total || (snap?.tasks?.length) || 0
          spinner.succeed(chalk.green(`Plan ready: ${taskCount} tasks across specialized agents`))

          if (snap?.tasks) {
            console.log()
            const table = new Table({
              head: [chalk.bold('Task'), chalk.bold('Agent'), chalk.bold('Priority'), chalk.bold('Deps')],
              style: { head: [], border: [] },
            })
            for (const t of snap.tasks) {
              table.push([t.title, t.agentType, t.priority, t.dependencies?.length || 0])
            }
            console.log(table.toString())
            console.log()
          }
          break
        }

        case 'task:started': {
          const t = msg.task
          if (!t) break
          const persona = getPersonaForType(t.agentType)
          console.log(chalk.cyan(`\n${persona.emoji} [${persona.name.toUpperCase()}] Starting: "${t.title}"`))
          currentAgent = t.agentType
          break
        }

        case 'agent:token':
          process.stdout.write(msg.token || '')
          break

        case 'agent:tool': {
          const tool = msg.tool || {}
          console.log(chalk.dim(`\n  🔧 ${tool.tool}(${JSON.stringify(tool.args || {}).slice(0, 80)})`))
          break
        }

        case 'agent:info':
          if (msg.info) console.log(chalk.dim(`  ℹ ${msg.info}`))
          break

        case 'task:completed': {
          completedCount++
          const t = msg.task
          console.log(chalk.green(`\n  ✅ Done (${completedCount}/${taskCount}): "${t?.title}"`))
          break
        }

        case 'task:failed': {
          const t = msg.task
          console.log(chalk.red(`\n  ❌ Failed: "${t?.title}" — ${msg.error}`))
          break
        }

        case 'orchestrator:synthesizing':
          console.log(chalk.yellow(`\n🔄 Synthesizing final result from ${msg.count} agents...`))
          break

        case 'orchestrator:completed': {
          ws.close()
          const durationSec = ((msg.durationMs || 0) / 1000).toFixed(1)
          console.log('\n')
          console.log(boxen(
            chalk.bold.green('✨ COMPLETED') + '\n\n' +
            chalk.white(msg.result || '') + '\n\n' +
            chalk.dim(`${msg.stats?.completed || 0} tasks · ${durationSec}s · Session: ${sessionId}`),
            { padding: 1, margin: 1, borderColor: 'green', borderStyle: 'round' }
          ))
          resolve({ result: msg.result, stats: msg.stats, sessionId })
          break
        }

        case 'orchestrator:failed':
        case 'orchestrator:error': {
          ws.close()
          const errMsg = msg.error || 'Unknown error'
          console.error(chalk.red(`\n❌ Session failed: ${errMsg}`))
          reject(new Error(errMsg))
          break
        }
      }
    })

    ws.on('error', (err) => {
      spinner.fail(chalk.red(`Connection failed: ${err.message}`))
      reject(err)
    })

    ws.on('close', () => {
      clearInterval(flushInterval)
    })
  })
}

function getPersonaForType(type) {
  const map = {
    orchestrator: { emoji: '🗺️', name: 'Chanakya' },
    coder:        { emoji: '👑', name: 'Ravan'    },
    tester:       { emoji: '🏹', name: 'Arjun'    },
    debugger:     { emoji: '🧠', name: 'Madhav'   },
    devops:       { emoji: '💪', name: 'Bheem'    },
    researcher:   { emoji: '🔍', name: 'Sahadeva' },
    writer:       { emoji: '🎨', name: 'Nakul'    },
    reviewer:     { emoji: '⚖️', name: 'Yudhishthir' },
    security:     { emoji: '💀', name: 'Shiv'     },
  }
  return map[type] || { emoji: '🤖', name: type }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

program
  .name('codeva')
  .description('CodeVaa Agent Platform CLI')
  .version(PLATFORM_VERSION)

// ── codeva run ──────────────────────────────────────────────────────────────
program
  .command('run <goal>')
  .description('Run a goal with the full multi-agent swarm')
  .option('-p, --project <path>', 'Project directory path', process.cwd())
  .option('-c, --context <text>', 'Additional project context')
  .option('-n, --parallel <num>', 'Max parallel agents', '4')
  .option('--no-banner', 'Skip banner')
  .action(async (goal, opts) => {
    if (opts.banner !== false) printBanner()

    const alive = await checkPlatform()
    if (!alive) {
      console.error(chalk.red('\n❌ CodeVaa platform is not running.'))
      console.log(chalk.yellow('   Start it with: codeva start\n'))
      process.exit(1)
    }

    try {
      await runWithStreaming(goal, opts)
    } catch (err) {
      console.error(chalk.red(`\nFailed: ${err.message}`))
      process.exit(1)
    }
  })

// ── codeva start ─────────────────────────────────────────────────────────────
program
  .command('start')
  .description('Start the CodeVaa Agent Platform server')
  .option('-p, --port <port>', 'Port to listen on', String(PLATFORM_PORT))
  .action(async (opts) => {
    printBanner()
    console.log(chalk.cyan(`Starting CodeVaa Agent Platform on port ${opts.port}...\n`))
    process.env.CODEVA_PLATFORM_PORT = opts.port
    await import('../../src/index.js')
  })

// ── codeva status ──────────────────────────────────────────────────────────
program
  .command('status')
  .description('Show platform status and active sessions')
  .action(async () => {
    const alive = await checkPlatform()
    if (!alive) {
      console.log(boxen(chalk.red('● Platform OFFLINE'), { padding: 1, borderColor: 'red', borderStyle: 'round' }))
      return
    }

    const res  = await fetch(`${PLATFORM_URL}/api/platform/status`)
    const data = await res.json()

    console.log(boxen(
      chalk.green('● Platform ONLINE') + `  v${PLATFORM_VERSION}\n` +
      chalk.dim(`Active sessions: ${data.count || 0}`),
      { padding: 1, borderColor: 'green', borderStyle: 'round' }
    ))

    if (data.sessions?.length > 0) {
      const table = new Table({
        head: [chalk.bold('Session ID'), chalk.bold('Status'), chalk.bold('Goal'), chalk.bold('Tasks')],
      })
      for (const s of data.sessions) {
        table.push([
          s.sessionId?.slice(0, 8) + '...',
          s.status,
          (s.goal || '').slice(0, 40),
          s.graph?.stats ? `${s.graph.stats.completed}/${s.graph.stats.total}` : '-',
        ])
      }
      console.log(table.toString())
    }
  })

// ── codeva skills ──────────────────────────────────────────────────────────
const skillsCmd = program.command('skills').description('Manage agent skills')

skillsCmd
  .command('list')
  .description('List all installed skills')
  .action(async () => {
    const alive = await checkPlatform()
    const url   = alive ? `${PLATFORM_URL}/api/skills` : null

    if (!url) {
      // Load directly if platform not running
      const { SkillsLoader } = await import('../../src/skills/SkillsLoader.js')
      const loader = new SkillsLoader(process.cwd())
      const skills = await loader.listSkills()
      _printSkillsTable(skills)
      return
    }

    const res    = await fetch(url)
    const data   = await res.json()
    _printSkillsTable(data.skills || [])
  })

skillsCmd
  .command('add <file>')
  .description('Install a skill from a markdown file')
  .option('-s, --scope <scope>', 'Scope: project or global', 'project')
  .action(async (file, opts) => {
    const content = await fs.readFile(file, 'utf8')
    const name    = path.basename(file, '.md')
    const { SkillsLoader } = await import('../../src/skills/SkillsLoader.js')
    const loader  = new SkillsLoader(process.cwd())
    await loader.installSkill(name, content, opts.scope)
    console.log(chalk.green(`✅ Installed skill: ${name} (${opts.scope})`))
  })

function _printSkillsTable(skills) {
  if (skills.length === 0) {
    console.log(chalk.yellow('No skills installed. Add skills to .codeva/skills/ or SKILLS.md'))
    return
  }
  const table = new Table({ head: [chalk.bold('Name'), chalk.bold('Agents'), chalk.bold('Tags'), chalk.bold('Source')] })
  for (const s of skills) {
    table.push([s.name, (s.agents || []).join(', '), (s.tags || []).join(', '), s.source])
  }
  console.log(table.toString())
}

// ── codeva ui ──────────────────────────────────────────────────────────────
program
  .command('ui')
  .description('Open the Agent Manager UI in browser')
  .action(async () => {
    const uiUrl = `http://localhost:5174`
    console.log(chalk.cyan(`Opening Agent Manager UI: ${uiUrl}`))
    await open(uiUrl)
  })

// ── codeva init ────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Initialize CodeVaa in current project (creates AGENTS.md and SKILLS.md)')
  .action(async () => {
    const cwd = process.cwd()
    const spinner = ora('Initializing CodeVaa project...').start()

    // Create AGENTS.md
    const agentsMd = await fs.readFile(
      new URL('../templates/AGENTS.md', import.meta.url), 'utf8'
    ).catch(() => DEFAULT_AGENTS_MD)
    await fs.writeFile(path.join(cwd, 'AGENTS.md'), agentsMd)

    // Create SKILLS.md
    const skillsMd = await fs.readFile(
      new URL('../templates/SKILLS.md', import.meta.url), 'utf8'
    ).catch(() => DEFAULT_SKILLS_MD)
    await fs.writeFile(path.join(cwd, 'SKILLS.md'), skillsMd)

    // Create .codeva/skills/ directory
    await fs.mkdir(path.join(cwd, '.codeva', 'skills'), { recursive: true })

    spinner.succeed('CodeVaa initialized!')
    console.log(chalk.dim('\nCreated:'))
    console.log(chalk.green('  ✓ AGENTS.md   — Configure agent team for this project'))
    console.log(chalk.green('  ✓ SKILLS.md   — Add domain knowledge for agents'))
    console.log(chalk.green('  ✓ .codeva/     — Local skills and session data'))
    console.log(chalk.cyan('\nRun your first task: codeva run "describe your goal"\n'))
  })

// ── codeva logs ───────────────────────────────────────────────────────────
program
  .command('logs [sessionId]')
  .description('View session logs')
  .action(async (sessionId) => {
    if (!sessionId) {
      const res  = await fetch(`${PLATFORM_URL}/api/platform/status`).catch(() => null)
      if (!res?.ok) { console.log(chalk.red('Platform not running')); return }
      const data = await res.json()
      if (!data.sessions?.length) { console.log('No active sessions'); return }
      console.log(chalk.bold('Active sessions:'))
      for (const s of data.sessions) {
        console.log(`  ${s.sessionId} — ${s.status} — ${s.goal?.slice(0, 50)}`)
      }
      return
    }

    const res  = await fetch(`${PLATFORM_URL}/api/sessions/${sessionId}`)
    if (!res.ok) { console.log(chalk.red('Session not found')); return }
    const snap = await res.json()
    console.log(JSON.stringify(snap, null, 2))
  })

const DEFAULT_AGENTS_MD = `# AGENTS.md — CodeVaa Agent Team Configuration

## Project Context
<!-- Describe your project here — this is injected into every agent's context -->
This is a [project type] built with [technologies].

## Team Configuration
<!-- Override default agent models or add custom instructions per agent type -->

### coder
model: codeva/ravan
instructions: |
  Follow the existing code patterns in this project.
  Prefer TypeScript over JavaScript.
  Always add JSDoc comments to exported functions.

### reviewer
model: codeva/yudhishthir
instructions: |
  Focus especially on security and performance.
  Check for proper error handling and input validation.

## Custom Agents
<!-- Define project-specific agent types -->

### api-specialist
model: codeva/arjun
tools: [file_read, file_write, web_search]
instructions: |
  You specialize in designing and implementing REST APIs.
  Always follow OpenAPI 3.0 spec conventions.
`

const DEFAULT_SKILLS_MD = `# SKILLS.md — Agent Knowledge Base

## Project Architecture
<!-- Describe your architecture so agents understand the codebase -->
This project uses [architecture description].

Key patterns:
- [Pattern 1]
- [Pattern 2]

## Coding Standards
<!-- Rules agents must follow when writing code -->
- Use [language/framework] conventions
- File naming: [convention]
- Error handling: [approach]

## API Documentation
<!-- Any APIs agents need to call or implement -->
See: [link or inline docs]
`

program.parse()
