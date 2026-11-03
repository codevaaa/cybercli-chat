import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readmeFromSpec } from './classroom.js'
import { fault, assertNoSecrets } from './domain.js'
import { validateFiles } from './sandbox.js'

export async function snapshotZip(d, snapshot) {
  validateFiles(snapshot.files)
  const payload = { snapshot, readme: readmeFromSpec(d), judge: d.judge, spec: d.spec, prompt_original: d.prompt_original }
  assertNoSecrets(JSON.stringify({ files: snapshot.files, spec: d.spec }))
  return new Promise((resolve, reject) => {
    const child = execFile('python', [fileURLToPath(new URL('./sandbox/export_dossier.py', import.meta.url))], { windowsHide: true, timeout: 60000, encoding: 'buffer', maxBuffer: 16 * 1024 * 1024 }, (error, stdout) => error ? reject(fault('Snapshot ZIP could not be generated', 503)) : resolve(stdout))
    child.stdin.on('error', () => {}); child.stdin.end(JSON.stringify(payload))
  })
}
