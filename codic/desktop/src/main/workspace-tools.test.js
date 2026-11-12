import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { readWorkspaceDiff, runWorkspaceCommand } from './workspace-tools.ts'

describe('workspace tools', () => {
it('returns tracked and safe untracked files from the selected Git root', async () => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'codic-diff-'))
  try {
    execFileSync('git', ['init', '-q'], { cwd: workspace })
    execFileSync('git', ['config', 'user.name', 'Codic Test'], { cwd: workspace })
    execFileSync('git', ['config', 'user.email', 'codic-test@example.invalid'], { cwd: workspace })
    writeFileSync(path.join(workspace, 'tracked.txt'), 'before\n')
    execFileSync('git', ['add', 'tracked.txt'], { cwd: workspace })
    execFileSync('git', ['commit', '-qm', 'initial'], { cwd: workspace })
    writeFileSync(path.join(workspace, 'tracked.txt'), 'after\n')
    mkdirSync(path.join(workspace, 'src'))
    writeFileSync(path.join(workspace, 'src', 'new.ts'), 'export const ready = true\n')

    const diff = await readWorkspaceDiff(workspace)
    expect(diff.isGitRepository).toBe(true)
    expect(diff.patch).toMatch(/\+after/)
    expect(diff.untrackedFiles).toEqual([{ path: 'src/new.ts', content: 'export const ready = true\n' }])
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

it('reports non-Git folders without trying to treat them as repositories', async () => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'codic-non-git-'))
  try {
    const diff = await readWorkspaceDiff(workspace)
    expect(diff.isGitRepository).toBe(false)
    expect(diff.error).toMatch(/not a Git repository/)
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

it('runs terminal commands in the selected workspace and returns bounded output', async () => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'codic-terminal-'))
  try {
    const command = process.platform === 'win32'
      ? 'Get-Location | Select-Object -ExpandProperty Path'
      : 'pwd'
    const result = await runWorkspaceCommand(workspace, command)
    expect(result.exitCode).toBe(0)
    expect(result.output.trim()).toBe(workspace)
    expect(result.truncated).toBe(false)
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})
})
