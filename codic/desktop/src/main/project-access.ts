import { realpathSync } from 'node:fs'
import path from 'node:path'
import type { CodicLocalStore, LocalProject } from './local-store.js'

/** Resolve renderer input only to a folder the user already opened in Codic. */
export function requireSavedProject(store: Pick<CodicLocalStore, 'findProjectByPath'> | null, workspacePath: unknown): LocalProject {
  if (typeof workspacePath !== 'string' || !workspacePath.trim() || workspacePath.includes('\0')) {
    throw new Error('Choose a saved project folder first.')
  }
  const canonicalPath = realpathSync(path.resolve(workspacePath))
  const project = store?.findProjectByPath(canonicalPath)
  if (!project) throw new Error('Open this project in Codic before using workspace tools.')
  return project
}
