import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const directory = path.dirname(fileURLToPath(import.meta.url)), file = path.join(directory, 'editor-api.md')
const old = await fs.readFile(file, 'utf8'), captures = JSON.parse(await fs.readFile(path.join(directory, 'dossier-api-fixtures.json'), 'utf8'))
const byLabel = Object.fromEntries(captures.map(c => [c.label, c]))
const labels = ['create project', 'attach existing project', 'read dossier', 'accept spec line', 'edit spec line', 'start or resume', 'listener question', 'fix line', 'preview URL', 'judge lines', 'store click', 'store button click', 'rollback', 'complete', 'upload notes', 'upload PDF', 'material cited question', 'PDF cited question', 'material absent question', 'project model meter', 'replay stored tools', 'local tab completion']
let prefix = old.split('## Captured JSON by action')[0]
const suffix = old.split('## Existing-project attach and private preview exchange')[1]
prefix = prefix.replace(/```text\n[\s\S]*?\n```/, '```text\n' + (await fs.readFile(path.join(directory, 'dossier-progress-fixture.txt'), 'utf8')).trimEnd() + '\n```')
const parts = [prefix.trimEnd(), '\n\n## Captured JSON by action\n\nEvery response below is the complete captured handler response. GET actions have no body. The tab capture uses a fixed local HTTP inference fixture, not a verified neural model.\n']
for (const label of labels) {
  const c = byLabel[label]; if (!c) throw new Error('Missing route capture: ' + label)
  parts.push('\n### ' + label[0].toUpperCase() + label.slice(1) + `\n\n\`${c.method} ${c.path}\`\n\n`)
  if (Object.hasOwn(c, 'request')) parts.push('Request JSON:\n\n```json\n' + JSON.stringify(c.request, null, 2) + '\n```\n\n')
  parts.push(`Response: HTTP ${c.status}.\n\n<details>\n<summary>Complete captured response JSON</summary>\n\n\`\`\`json\n` + JSON.stringify(c.response, null, 2) + '\n```\n\n</details>\n')
}
parts.push('\n## Existing-project attach and private preview exchange' + suffix)
await fs.writeFile(file, parts.join(''))
console.log('Rendered ' + labels.length + ' exact captured route examples.')
