import { describe, expect, it } from 'vitest'
import { getWorkspaceRestoreIntent } from './workspaceRestore'

describe('getWorkspaceRestoreIntent', () => {
  it('keeps a new blank window independent of previously saved projects', () => {
    expect(getWorkspaceRestoreIntent('?new=1')).toEqual({ kind: 'blank' })
  })

  it('opens a requested project as a fresh conversation', () => {
    expect(getWorkspaceRestoreIntent('?new=1&project=C%3A%5Cwork%5Csite')).toEqual({
      kind: 'new-project', projectPath: 'C:\\work\\site',
    })
  })

  it('restores only the project and thread requested for a task window', () => {
    const intent = getWorkspaceRestoreIntent('?project=C%3A%5Cwork%5Csite&thread=thread-1')
    expect(intent).toEqual({ kind: 'resume', projectPath: 'C:\\work\\site', threadId: 'thread-1' })
  })

  it('leaves ordinary startup on the primary restore path', () => {
    expect(getWorkspaceRestoreIntent('')).toEqual({ kind: 'resume', projectPath: null, threadId: null })
  })
})
