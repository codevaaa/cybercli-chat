import fs from 'fs/promises'
import { CODEVA_HOME, SKILLS_DIR, AGENTS_DIR, LOGS_DIR, SESSIONS_DIR, MEMORY_DIR } from '../config.js'

export async function ensureDirectories() {
  const dirs = [CODEVA_HOME, SKILLS_DIR, AGENTS_DIR, LOGS_DIR, SESSIONS_DIR, MEMORY_DIR]
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true }).catch(() => {})
  }
}
