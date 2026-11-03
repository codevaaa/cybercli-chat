import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DockerSandbox, TEST_COMMAND, projectName } from './sandbox.js'

const id = '507f1f77bcf86cd799439011', name = projectName(id)
function fixture({ existing = false, unsafe = false, failedTest = false } = {}) {
  const calls = []
  const config = { Config: { Image: 'codeva-dossier-python:3.12.8-1' }, HostConfig: { NetworkMode: unsafe ? 'bridge' : 'none', Memory: 268435456, MemorySwap: 268435456, NanoCpus: 1000000000, PidsLimit: 64, ReadonlyRootfs: true, CapDrop: ['ALL'], SecurityOpt: ['no-new-privileges:true'] }, Mounts: [{ Type: 'volume', Name: `${name}-data`, Destination: '/workspace' }], State: { Running: false } }
  const sandbox = new DockerSandbox({ execute(binary, args, options, done) {
    const entry = { binary, args, options, input: '' }; calls.push(entry)
    queueMicrotask(() => {
      let response = ''
      if (args[0] === 'ps') response = existing ? name : ''
      else if (args[0] === 'inspect') response = JSON.stringify([config])
      else if (args[0] === 'exec') {
        const action = args.at(-1)
        response = JSON.stringify(action === 'request' ? { status: 200, headers: {}, body_base64: Buffer.from('owned preview').toString('base64') } : action === 'test' ? { exit_code: failedTest ? 1 : 0, output: failedTest ? 'wrong password entered' : 'trusted output' } : action === 'read' ? [{ path: 'features.py', content: 'sample' }] : action === 'snapshot' ? { files: [], database_base64: 'c2FtcGxl' } : { restored: true })
      }
      done(null, response, '')
    })
    return { stdin: { on() {}, end(input) { entry.input = input } } }
  } })
  return { sandbox, calls, config }
}

test('only one project container is requested with network, CPU/memory, filesystem and capability restrictions', async () => {
  const f = fixture()
  await f.sandbox.ensure(id)
  const run = f.calls.find(c => c.args[0] === 'run').args
  for (const [flag, value] of [['--network', 'none'], ['--cpus', '1'], ['--memory', '256m'], ['--memory-swap', '256m'], ['--pids-limit', '64'], ['--cap-drop', 'ALL']]) assert.equal(run[run.indexOf(flag) + 1], value)
  assert.ok(run.includes('--read-only')); assert.ok(!run.includes('-p')); assert.ok(!run.includes('--privileged'))
  assert.equal(f.calls.filter(c => c.args[0] === 'run').length, 1)
  assert.ok(f.calls.every(c => c.binary === 'docker' && c.options.windowsHide && !c.options.shell))
  const resumed = fixture({ existing: true }); await resumed.sandbox.ensure(id)
  assert.equal(resumed.calls.filter(c => c.args[0] === 'run').length, 0)
  assert.ok(resumed.calls.some(c => c.args[0] === 'start'))
  await assert.rejects(() => fixture({ existing: true, unsafe: true }).sandbox.ensure(id), /isolation/)
  const mounted = fixture({ existing: true }); mounted.config.Mounts.push({ Type: 'bind', Source: 'C:\\', Destination: '/host' })
  await assert.rejects(() => mounted.sandbox.ensure(id), /isolation/)
})

test('tester only executes the trusted allowlist; sandbox failure remains a failure, and no external target is accepted', async () => {
  const f = fixture({ failedTest: true })
  assert.equal((await f.sandbox.test(id)).exit_code, 1)
  assert.equal(f.calls[0].args.at(-1), 'test')
  assert.equal(TEST_COMMAND, 'python /runtime/runtime.py test')
  await assert.rejects(() => f.sandbox.test(id, 'echo passed'), /allowlisted/)
  await assert.rejects(() => f.sandbox.request(id, { path: 'https://external.invalid' }), /relative/)
  await assert.rejects(() => f.sandbox.request(id, { path: '/', method: 'DELETE' }), /method/)
  await assert.rejects(() => f.sandbox.request(id, { path: '/', body: 'x'.repeat(65537) }), /large/)
  await assert.rejects(() => f.sandbox.write(id, [{ path: '../x.py', content: '' }]), /file/)
  await f.sandbox.write(id, [{ path: 'features.py', content: 'owned source' }])
  assert.ok(f.calls.at(-1).input.includes('owned source'))
  assert.equal((await f.sandbox.read(id))[0].path, 'features.py')
  await assert.rejects(() => f.sandbox.artifact('../outside.png'), /not found/)
})

test('snapshot restore controls code/database and restarts the same preview container', async () => {
  const f = fixture({ existing: true }), snapshot = await f.sandbox.snapshot(id)
  await f.sandbox.restore(id, snapshot)
  assert.ok(f.calls.some(c => c.args[0] === 'stop'))
  assert.ok(f.calls.some(c => c.args[0] === 'restart'))
  assert.deepEqual(JSON.parse(f.calls.find(c => c.args.at(-1) === 'restore').input), snapshot)
  assert.ok(f.calls.every(c => c.args[0] !== 'run'))
})
