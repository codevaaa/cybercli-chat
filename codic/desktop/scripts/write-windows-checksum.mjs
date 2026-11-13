import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const releaseDirectory = process.env.CODIC_RELEASE_DIRECTORY
  ? path.resolve(process.env.CODIC_RELEASE_DIRECTORY)
  : path.resolve(scriptDirectory, '..', 'release')
const artifactNames = await readdir(releaseDirectory)
const packageInfo = JSON.parse(await readFile(path.resolve(scriptDirectory, '..', 'package.json'), 'utf8'))
const filename = `Codic Setup ${packageInfo.version}.exe`
if (!artifactNames.includes(filename)) throw new Error(`Could not find the current Windows installer ${filename} in ${releaseDirectory}.`)
const artifactPath = path.join(releaseDirectory, filename)
const hash = createHash('sha256')
const updaterHash = createHash('sha512')
for await (const chunk of createReadStream(artifactPath)) {
  hash.update(chunk)
  updaterHash.update(chunk)
}
const checksum = hash.digest('hex')
const sha512 = updaterHash.digest('base64')
const size = (await stat(artifactPath)).size
const updaterManifest = await readFile(path.join(releaseDirectory, 'latest.yml'), 'utf8')
const manifestSha512 = updaterManifest.match(/^\s+sha512:\s*'?([^'\r\n]+)'?\s*$/m)?.[1]
const manifestSize = updaterManifest.match(/^\s+size:\s*(\d+)\s*$/m)?.[1]
if (manifestSha512 !== sha512 || Number(manifestSize) !== size) {
  throw new Error('The generated latest.yml does not match the installer SHA-512 and size.')
}
await writeFile(`${artifactPath}.sha256`, `${checksum} *${filename}\n`, 'utf8')
process.stdout.write(`Verified latest.yml; SHA-256 ${checksum}, SHA-512 ${sha512}, ${size} bytes: ${filename}\n`)
