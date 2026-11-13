export type WorkspaceRestoreIntent =
  | { kind: 'blank' }
  | { kind: 'new-project'; projectPath: string }
  | { kind: 'resume'; projectPath: string | null; threadId: string | null }

/** Interpret per-window startup parameters without inheriting a project by accident. */
export const getWorkspaceRestoreIntent = (search: string): WorkspaceRestoreIntent => {
  const params = new URLSearchParams(search)
  const projectPath = params.get('project')
  const threadId = params.get('thread')

  if (params.get('new') === '1') {
    return projectPath ? { kind: 'new-project', projectPath } : { kind: 'blank' }
  }

  return { kind: 'resume', projectPath, threadId }
}
