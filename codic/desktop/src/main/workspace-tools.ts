import { spawn } from 'node:child_process'
import { lstatSync, readFileSync, realpathSync, statSync } from 'node:fs'
import path from 'node:path'

const MAX_GIT_OUTPUT_BYTES = 1_500_000
const MAX_PREVIEW_FILE_BYTES = 200_000
const MAX_TERMINAL_OUTPUT_BYTES = 200_000

export interface UntrackedPreview {
  path: string
  content: string
}

export interface WorkspaceDiff {
  isGitRepository: boolean
  patch: string
  untrackedFiles: UntrackedPreview[]
  error?: string
}

export interface TerminalCommandResult {
  exitCode: number
  output: string
  truncated: boolean
  timedOut: boolean
}

export async function readWorkspaceDiff(workspacePath: string): Promise<WorkspaceDiff> {
  const root = resolveWorkspace(workspacePath)
  const rootResult = await spawnLimited('git', ['rev-parse', '--show-toplevel'], root, 8_000, 16_000)
  if (rootResult.exitCode !== 0) {
    return { isGitRepository: false, patch: '', untrackedFiles: [], error: 'This folder is not a Git repository.' }
  }
  let gitRoot: string
  try {
    gitRoot = realpathSync(rootResult.output.trim())
  } catch {
    return { isGitRepository: false, patch: '', untrackedFiles: [], error: 'The Git repository path could not be verified.' }
  }
  const sameRoot = process.platform === 'win32'
    ? path.normalize(gitRoot).toLowerCase() === path.normalize(root).toLowerCase()
    : path.normalize(gitRoot) === path.normalize(root)
  if (!sameRoot) {
    return { isGitRepository: true, patch: '', untrackedFiles: [], error: 'Open the repository root to review its changes safely.' }
  }

  const status = await spawnLimited('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], root, 10_000, 500_000)
  if (status.exitCode !== 0) {
    return { isGitRepository: true, patch: '', untrackedFiles: [], error: status.output.trim() || 'Git could not read the workspace status.' }
  }

  const head = await spawnLimited('git', ['rev-parse', '--verify', 'HEAD'], root, 8_000, 4_000)
  const diffArgs = ['-c', 'core.fsmonitor=false', 'diff', '--no-ext-diff', '--no-textconv', '--no-color', '--unified=3']
  if (head.exitCode === 0) diffArgs.push('HEAD')
  diffArgs.push('--')
  const diff = await spawnLimited('git', diffArgs, root, 15_000, MAX_GIT_OUTPUT_BYTES)
  if (diff.exitCode !== 0) {
    return { isGitRepository: true, patch: '', untrackedFiles: [], error: diff.output.trim() || 'Git could not create the workspace diff.' }
  }

  const untrackedFiles = []
  let previewBytes = 0
  for (const entry of parseStatus(status.output)) {
    if (entry.status !== '??') continue
    const preview = readSafeTextFile(root, entry.path)
    if (preview && previewBytes + Buffer.byteLength(preview.content, 'utf8') <= MAX_GIT_OUTPUT_BYTES) {
      untrackedFiles.push(preview)
      previewBytes += Buffer.byteLength(preview.content, 'utf8')
    }
    if (untrackedFiles.length >= 100) break
  }
  return {
    isGitRepository: true,
    patch: diff.output,
    untrackedFiles,
    ...(diff.truncated ? { error: 'The diff is large; only its first section is shown.' } : {}),
  }
}

/** Runs a command explicitly entered by the user in a fresh, project-scoped shell. */
export async function runWorkspaceCommand(workspacePath: string, command: string): Promise<TerminalCommandResult> {
  const root = resolveWorkspace(workspacePath)
  const trimmed = command.trim()
  if (!trimmed) throw new Error('Enter a command to run.')
  if (trimmed.length > 10_000) throw new Error('Commands must be 10,000 characters or less.')

  const windows = process.platform === 'win32'
  const shell = windows ? (process.env.ComSpec || 'cmd.exe') : '/bin/bash'
  const encodedPowerShellCommand = Buffer.from(`$ProgressPreference = 'SilentlyContinue'; ${trimmed}`, 'utf16le').toString('base64')
  const args = windows
    ? ['/d', '/s', '/c', `powershell.exe -NoLogo -NoProfile -NonInteractive -EncodedCommand ${encodedPowerShellCommand}`]
    : ['--noprofile', '--norc', '-c', trimmed]
  const result = await spawnLimited(shell, args, root, 60_000, MAX_TERMINAL_OUTPUT_BYTES)
  return { exitCode: result.exitCode, output: result.output, truncated: result.truncated, timedOut: result.timedOut }
}

function resolveWorkspace(workspacePath: string): string {
  if (typeof workspacePath !== 'string' || !workspacePath.trim() || workspacePath.includes('\0')) {
    throw new Error('Choose a valid project folder first.')
  }
  const root = realpathSync(path.resolve(workspacePath))
  if (!statSync(root).isDirectory()) throw new Error('The selected project path must be a folder.')
  return root
}

function parseStatus(output: string): Array<{ status: string; path: string }> {
  return output.split('\0').filter(Boolean).flatMap((record) => {
    if (record.length < 4) return []
    const status = record.slice(0, 2)
    const filePath = record.slice(3)
    if (!filePath || filePath.includes('\n') || filePath.includes('\r')) return []
    return [{ status, path: filePath }]
  })
}

function readSafeTextFile(root: string, relativePath: string): UntrackedPreview | null {
  const absolute = path.resolve(root, relativePath)
  if (!isWithin(root, absolute)) return null
  try {
    const stats = lstatSync(absolute)
    if (!stats.isFile() || stats.size > MAX_PREVIEW_FILE_BYTES) return null
    const realPath = realpathSync(absolute)
    if (!isWithin(root, realPath)) return null
    const content = readFileSync(absolute)
    if (content.includes(0)) return null
    return { path: relativePath.replace(/\\/g, '/'), content: content.toString('utf8') }
  } catch {
    return null
  }
}

function isWithin(root: string, candidate: string): boolean {
  const pathFromRoot = path.relative(root, candidate)
  return pathFromRoot === '' || (!path.isAbsolute(pathFromRoot) && pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${path.sep}`))
}

interface SpawnResult extends TerminalCommandResult {}

function spawnLimited(executable: string, args: string[], cwd: string, timeoutMs: number, maxOutputBytes: number): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      env: allowedEnvironment(process.env),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const chunks: Buffer[] = []
    let size = 0
    let truncated = false
    let timedOut = false
    let settled = false
    const append = (chunk: Buffer) => {
      if (size >= maxOutputBytes) {
        truncated = true
        child.kill()
        return
      }
      const remaining = maxOutputBytes - size
      const part = chunk.byteLength > remaining ? chunk.subarray(0, remaining) : chunk
      chunks.push(part)
      size += part.byteLength
      if (part.byteLength !== chunk.byteLength) {
        truncated = true
        child.kill()
      }
    }
    child.stdout.on('data', append)
    child.stderr.on('data', append)
    const timer = setTimeout(() => {
      timedOut = true
      child.kill()
    }, timeoutMs)
    child.once('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(error)
    })
    child.once('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        exitCode: code ?? -1,
        output: Buffer.concat(chunks).toString('utf8'),
        truncated,
        timedOut,
      })
    })
  })
}

function allowedEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const names = process.platform === 'win32'
    ? ['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'ComSpec']
    : ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'TERM']
  const env: NodeJS.ProcessEnv = {
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_OPTIONAL_LOCKS: '0',
  }
  for (const name of names) if (source[name]) env[name] = source[name]
  return env
}
