import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
const exec = promisify(execFile), project = `codeva-acceptance-${randomBytes(4).toString('hex')}`
const folder = 'artifacts/codeva-editor/on-prem-audit'
await fs.mkdir(folder, { recursive: true })
for (const name of ['api', 'runtime', 'preview']) await fs.writeFile(`${folder}/${name}.jsonl`, '')
// No production credential is necessary to observe boot: no auth request is made.
const env = { ...process.env, SUPABASE_URL: 'http://127.0.0.1:9', SUPABASE_SERVICE_KEY: 'acceptance-auth-unavailable-no-real-secret' }
const args = ['compose', '-p', project, '-f', 'compose.on-prem.yml', '-f', 'scripts/ide/on-prem-acceptance.yml', '--profile', 'on-prem']
const command = tail => exec('docker', [...args, ...tail], { env, timeout: 600000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 })
const evidence = { executed_at: new Date().toISOString(), project, real_docker: true, auth_certified: false }
try {
  await command(['up', '-d', '--no-build'])
  for (const port of [13891, 13892]) {
    let response
    for (let tries = 0; tries < 60; tries++) {
      response = await fetch(`http://127.0.0.1:${port}/health`).catch(() => null)
      if (response?.ok) break
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    assert.equal(response?.ok, true, `Existing API failed to boot at ${port}`)
    assert.equal((await response.json()).status, 'ok')
  }
  const { stdout } = await command(['ps', '--format', 'json'])
  evidence.services = stdout.split('\n').filter(Boolean).map(line => { const value = JSON.parse(line); return { service: value.Service, state: value.State } })
  for (const service of ['api', 'runtime', 'preview-api', 'mongo', 'queue', 'local-gateway', 'sandbox']) assert.ok(evidence.services.some(s => s.service === service && s.state === 'running'), `${service} did not boot`)
  evidence.network = []
  for (const name of ['api', 'runtime', 'preview']) {
    const records = (await fs.readFile(`${folder}/${name}.jsonl`, 'utf8')).split('\n').filter(Boolean).map(JSON.parse)
    assert.ok(records.some(r => r.kind === 'observer_started' && r.local_gateway), `Observer not loaded in ${name}`)
    evidence.network.push({ service: name, records })
    assert.ok(!records.some(r => r.public_model), `A public model was attempted by ${name}`)
  }
  evidence.result = 'PASS'
} catch (error) { evidence.result = 'FAIL'; evidence.error = error.stderr?.slice(-2000) || error.message.split('\n')[0]; process.exitCode = 1 }
finally {
  const logs = await command(['logs', '--no-color', '--tail', '80']).catch(() => ({ stdout: '' }))
  await fs.writeFile('artifacts/codeva-editor/on-prem-service.log', logs.stdout)
  await fs.writeFile('artifacts/codeva-editor/on-prem.json', JSON.stringify(evidence, null, 2))
  await command(['down', '--volumes', '--remove-orphans']).catch(async error => { evidence.cleanup_error = error.stderr?.slice(-1000) || 'Cleanup failed'; process.exitCode = 1; await fs.writeFile('artifacts/codeva-editor/on-prem.json', JSON.stringify(evidence, null, 2)) })
}
console.log(JSON.stringify(evidence))
