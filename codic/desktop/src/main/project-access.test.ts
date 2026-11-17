import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { requireSavedProject } from './project-access.js'

const temporaryDirectories: string[] = []
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

function makeProject(name: string) {
  const parent = mkdtempSync(path.join(tmpdir(), 'codic-project-access-'))
  temporaryDirectories.push(parent)
  const projectPath = path.join(parent, name)
  mkdirSync(projectPath)
  return { id: name, name, path: projectPath, createdAt: '', updatedAt: '' }
}

it('allows only a canonical folder already saved by the main process', () => {
  const saved = makeProject('saved')
  const store = { findProjectByPath: vi.fn((candidate: string) => candidate === saved.path ? saved : null) }
  expect(requireSavedProject(store, saved.path)).toEqual(saved)
  expect(() => requireSavedProject(store, makeProject('unapproved').path)).toThrow('Open this project in Codic')
  expect(store.findProjectByPath).toHaveBeenCalledTimes(2)
})

it('rejects malformed, missing, and unsaved renderer paths', () => {
  const store = { findProjectByPath: vi.fn(() => null) }
  expect(() => requireSavedProject(store, path.join(tmpdir(), `codic-missing-${randomUUID()}`))).toThrow()
  expect(() => requireSavedProject(store, '  ')).toThrow('Choose a saved project folder first')
  expect(() => requireSavedProject(store, null)).toThrow('Choose a saved project folder first')
  expect(store.findProjectByPath).not.toHaveBeenCalled()
})
