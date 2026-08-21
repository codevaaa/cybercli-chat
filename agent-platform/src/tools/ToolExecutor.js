/**
 * ToolExecutor — 15+ Production Tools for CodeVaa Agents
 *
 * Tools available to agents (OpenAI function-calling format):
 *
 *   FILE OPERATIONS:
 *     file_read       — Read file contents (with optional line range)
 *     file_write      — Create or overwrite a file
 *     file_edit       — Surgical string replacement in a file (safe targeted edits)
 *     file_search     — Regex search across files (like ripgrep)
 *     file_list       — List directory contents (with glob patterns)
 *     file_delete     — Delete a file
 *
 *   EXECUTION:
 *     terminal_exec   — Execute shell commands (with timeout + working dir)
 *     code_exec       — Run code snippets in isolated context (Node/Python)
 *
 *   WEB:
 *     web_search      — Search the web (routes through backend search API)
 *     browser_fetch   — Fetch URL and extract text content
 *
 *   GIT:
 *     git_ops         — Git operations (status, diff, log, add, commit, branch, checkout)
 *
 *   PACKAGE MANAGEMENT:
 *     package_manager — npm/pip/cargo install, uninstall, list, audit
 *
 *   MEMORY:
 *     memory_read     — Read from shared session memory
 *     memory_write    — Write to shared session memory
 *
 *   MCP:
 *     mcp_call        — Call an MCP server tool
 *
 *   SKILLS:
 *     skill_exec      — Execute a skill's bundled script
 */
import fs from 'fs/promises'
import path from 'path'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { glob } from 'glob'
import { logger } from '../utils/logger.js'
import { BACKEND_API_BASE } from '../config.js'

const execAsync = promisify(exec)

// ═══════════════════════════════════════════════════════════════════════════
// TOOL SCHEMA DEFINITIONS (OpenAI function-calling format)
// ═══════════════════════════════════════════════════════════════════════════

const TOOL_SCHEMAS = {

  // ── FILE OPERATIONS ─────────────────────────────────────────────────────

  file_read: {
    type: 'function',
    function: {
      name: 'file_read',
      description: 'Read the contents of a file. Always read existing code before writing new code.',
      parameters: {
        type: 'object',
        properties: {
          path:       { type: 'string', description: 'Relative or absolute path to the file' },
          start_line: { type: 'number', description: 'Start line (1-indexed, optional)' },
          end_line:   { type: 'number', description: 'End line (1-indexed, optional)' },
        },
        required: ['path'],
      },
    },
  },

  file_write: {
    type: 'function',
    function: {
      name: 'file_write',
      description: 'Create or completely overwrite a file. Creates parent directories automatically. Use file_edit for targeted changes to existing files.',
      parameters: {
        type: 'object',
        properties: {
          path:    { type: 'string', description: 'Relative or absolute path to write to' },
          content: { type: 'string', description: 'Full content to write to the file' },
        },
        required: ['path', 'content'],
      },
    },
  },

  file_edit: {
    type: 'function',
    function: {
      name: 'file_edit',
      description: 'Make targeted edits to an existing file by replacing a specific string with new content. Safer than file_write for modifications — preserves the rest of the file.',
      parameters: {
        type: 'object',
        properties: {
          path:        { type: 'string', description: 'Path to the file to edit' },
          old_string:  { type: 'string', description: 'Exact string to find and replace (must match precisely including whitespace)' },
          new_string:  { type: 'string', description: 'Replacement string' },
          replace_all: { type: 'boolean', description: 'Replace all occurrences (default: false, replace first only)' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
  },

  file_search: {
    type: 'function',
    function: {
      name: 'file_search',
      description: 'Search for a regex pattern across files in the project. Returns matching lines with file paths and line numbers. Like ripgrep.',
      parameters: {
        type: 'object',
        properties: {
          pattern:  { type: 'string', description: 'Regex pattern to search for' },
          path:     { type: 'string', description: 'Directory or file to search in (default: project root)' },
          include:  { type: 'string', description: 'Glob pattern for files to include, e.g. "**/*.js"' },
          exclude:  { type: 'string', description: 'Glob pattern for files to exclude, e.g. "node_modules/**"' },
          max_results: { type: 'number', description: 'Maximum results to return (default: 50)' },
        },
        required: ['pattern'],
      },
    },
  },

  file_list: {
    type: 'function',
    function: {
      name: 'file_list',
      description: 'List files and directories at a path. Use to understand project structure.',
      parameters: {
        type: 'object',
        properties: {
          path:      { type: 'string', description: 'Directory path to list (default: project root)' },
          recursive: { type: 'boolean', description: 'List recursively (default: false)' },
          pattern:   { type: 'string', description: 'Glob pattern filter, e.g. "**/*.ts"' },
          max_depth: { type: 'number', description: 'Max recursion depth (default: 3)' },
        },
        required: [],
      },
    },
  },

  file_delete: {
    type: 'function',
    function: {
      name: 'file_delete',
      description: 'Delete a file. Use with caution. Cannot delete directories (use terminal_exec for that).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file to delete' },
        },
        required: ['path'],
      },
    },
  },

  // ── EXECUTION ───────────────────────────────────────────────────────────

  terminal_exec: {
    type: 'function',
    function: {
      name: 'terminal_exec',
      description: 'Execute a shell command and return stdout + stderr. Use for running builds, tests, installs, git commands, or any CLI operation.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command to execute' },
          cwd:     { type: 'string', description: 'Working directory (default: project root)' },
          timeout: { type: 'number', description: 'Timeout in milliseconds (default: 30000)' },
        },
        required: ['command'],
      },
    },
  },

  code_exec: {
    type: 'function',
    function: {
      name: 'code_exec',
      description: 'Execute a code snippet in an isolated context. Supports JavaScript/Node.js and Python. Returns stdout output.',
      parameters: {
        type: 'object',
        properties: {
          language: { type: 'string', enum: ['javascript', 'python'], description: 'Language to execute' },
          code:     { type: 'string', description: 'Code to execute' },
          timeout:  { type: 'number', description: 'Timeout in milliseconds (default: 10000)' },
        },
        required: ['language', 'code'],
      },
    },
  },

  // ── WEB ─────────────────────────────────────────────────────────────────

  web_search: {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for information. Returns titles, URLs, and snippets from top results.',
      parameters: {
        type: 'object',
        properties: {
          query:       { type: 'string', description: 'Search query' },
          num_results: { type: 'number', description: 'Number of results (default: 5, max: 10)' },
        },
        required: ['query'],
      },
    },
  },

  browser_fetch: {
    type: 'function',
    function: {
      name: 'browser_fetch',
      description: 'Fetch and extract text content from a URL. Use for reading documentation, API references, web pages.',
      parameters: {
        type: 'object',
        properties: {
          url:       { type: 'string', description: 'URL to fetch' },
          selector:  { type: 'string', description: 'CSS selector to extract specific content (optional)' },
          max_chars: { type: 'number', description: 'Max characters to return (default: 30000)' },
        },
        required: ['url'],
      },
    },
  },

  // ── GIT ─────────────────────────────────────────────────────────────────

  git_ops: {
    type: 'function',
    function: {
      name: 'git_ops',
      description: 'Perform git operations: status, diff, log, add, commit, branch, checkout, stash. Never force-push or reset --hard without explicit permission.',
      parameters: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['status', 'diff', 'log', 'add', 'commit', 'branch', 'checkout', 'stash', 'pull', 'push'], description: 'Git operation to perform' },
          args:      { type: 'string', description: 'Additional arguments for the operation' },
          message:   { type: 'string', description: 'Commit message (for commit operation)' },
          files:     { type: 'array', items: { type: 'string' }, description: 'Files to add (for add operation)' },
        },
        required: ['operation'],
      },
    },
  },

  // ── PACKAGE MANAGEMENT ──────────────────────────────────────────────────

  package_manager: {
    type: 'function',
    function: {
      name: 'package_manager',
      description: 'Manage project dependencies. Detects package manager (npm, yarn, pnpm, pip, cargo) from project files.',
      parameters: {
        type: 'object',
        properties: {
          action:   { type: 'string', enum: ['install', 'uninstall', 'list', 'audit', 'outdated', 'run'], description: 'Action to perform' },
          packages: { type: 'array', items: { type: 'string' }, description: 'Package names (for install/uninstall)' },
          dev:      { type: 'boolean', description: 'Install as dev dependency (default: false)' },
          script:   { type: 'string', description: 'Script name (for run action)' },
        },
        required: ['action'],
      },
    },
  },

  // ── MEMORY ──────────────────────────────────────────────────────────────

  memory_read: {
    type: 'function',
    function: {
      name: 'memory_read',
      description: 'Read a value from shared session memory. Useful for accessing context or results from other agents.',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Memory key to read. Use "all" to list all keys.' },
        },
        required: ['key'],
      },
    },
  },

  memory_write: {
    type: 'function',
    function: {
      name: 'memory_write',
      description: 'Write a value to shared session memory. Share important findings, decisions, or data with other agents.',
      parameters: {
        type: 'object',
        properties: {
          key:   { type: 'string', description: 'Memory key (descriptive name)' },
          value: { type: 'string', description: 'Value to store' },
        },
        required: ['key', 'value'],
      },
    },
  },

  // ── MCP ─────────────────────────────────────────────────────────────────

  mcp_call: {
    type: 'function',
    function: {
      name: 'mcp_call',
      description: 'Call a tool provided by an MCP (Model Context Protocol) server. MCP servers extend agent capabilities with external tools.',
      parameters: {
        type: 'object',
        properties: {
          server:    { type: 'string', description: 'MCP server name' },
          tool:      { type: 'string', description: 'Tool name to call' },
          arguments: { type: 'object', description: 'Arguments to pass to the tool' },
        },
        required: ['server', 'tool'],
      },
    },
  },

  // ── SKILLS ──────────────────────────────────────────────────────────────

  skill_exec: {
    type: 'function',
    function: {
      name: 'skill_exec',
      description: 'Execute a script bundled with an installed skill. Skills provide domain-specific scripts for validation, generation, etc.',
      parameters: {
        type: 'object',
        properties: {
          skill_id: { type: 'string', description: 'Skill identifier' },
          script:   { type: 'string', description: 'Script filename within the skill\'s scripts/ directory' },
          args:     { type: 'array', items: { type: 'string' }, description: 'Arguments to pass to the script' },
        },
        required: ['skill_id', 'script'],
      },
    },
  },
}

// ── Permission Groups ─────────────────────────────────────────────────────
const PERMISSION_MAP = {
  file_read:       'file_read',
  file_write:      'file_write',
  file_edit:       'file_write',
  file_search:     'file_read',
  file_list:       'file_read',
  file_delete:     'file_write',
  terminal_exec:   'terminal_exec',
  code_exec:       'code_exec',
  web_search:      'web_search',
  browser_fetch:   'browser',
  git_ops:         'terminal_exec',
  package_manager: 'terminal_exec',
  memory_read:     'memory_read',
  memory_write:    'memory_write',
  mcp_call:        'mcp',
  skill_exec:      'terminal_exec',
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL EXECUTOR CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class ToolExecutor {
  constructor({ agentId, agentType, projectPath, memory, permissions = [], skillsLoader = null }) {
    this.agentId      = agentId
    this.agentType    = agentType
    this.projectPath  = projectPath || process.cwd()
    this.memory       = memory
    this.permissions  = permissions
    this.skillsLoader = skillsLoader
  }

  hasPermission(toolName) {
    if (this.permissions.includes('all')) return true
    const required = PERMISSION_MAP[toolName]
    return required ? this.permissions.includes(required) : false
  }

  getToolDefinitions() {
    return Object.entries(TOOL_SCHEMAS)
      .filter(([name]) => this.hasPermission(name))
      .map(([, schema]) => schema)
  }

  async execute(toolName, args) {
    if (!this.hasPermission(toolName)) {
      return { error: `Permission denied: ${this.agentType} cannot use ${toolName}` }
    }

    const startTime = Date.now()
    logger.debug(`[Tool:${this.agentType}] ${toolName}(${JSON.stringify(args).slice(0, 120)})`)

    let result
    try {
      switch (toolName) {
        case 'file_read':       result = await this._fileRead(args); break
        case 'file_write':      result = await this._fileWrite(args); break
        case 'file_edit':       result = await this._fileEdit(args); break
        case 'file_search':     result = await this._fileSearch(args); break
        case 'file_list':       result = await this._fileList(args); break
        case 'file_delete':     result = await this._fileDelete(args); break
        case 'terminal_exec':   result = await this._terminalExec(args); break
        case 'code_exec':       result = await this._codeExec(args); break
        case 'web_search':      result = await this._webSearch(args); break
        case 'browser_fetch':   result = await this._browserFetch(args); break
        case 'git_ops':         result = await this._gitOps(args); break
        case 'package_manager': result = await this._packageManager(args); break
        case 'memory_read':     result = await this._memoryRead(args); break
        case 'memory_write':    result = await this._memoryWrite(args); break
        case 'mcp_call':        result = await this._mcpCall(args); break
        case 'skill_exec':      result = await this._skillExec(args); break
        default:                result = { error: `Unknown tool: ${toolName}` }
      }
    } catch (err) {
      result = { error: `Tool ${toolName} failed: ${err.message}` }
    }

    const elapsed = Date.now() - startTime
    logger.debug(`[Tool:${this.agentType}] ${toolName} → ${elapsed}ms`)
    return result
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL IMPLEMENTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async _fileRead({ path: filePath, start_line, end_line }) {
    const fullPath = this._resolve(filePath)
    const content  = await fs.readFile(fullPath, 'utf8')
    if (start_line || end_line) {
      const lines = content.split('\n')
      const start = Math.max(0, (start_line || 1) - 1)
      const end   = end_line ? Math.min(lines.length, end_line) : lines.length
      return lines.slice(start, end).map((l, i) => `${start + i + 1}│ ${l}`).join('\n')
    }
    if (content.length > 100000) {
      return content.slice(0, 100000) + '\n\n[... truncated at 100KB — use start_line/end_line for specific sections ...]'
    }
    return content
  }

  async _fileWrite({ path: filePath, content }) {
    const fullPath = this._resolve(filePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, content, 'utf8')
    const lines = content.split('\n').length
    return { success: true, path: fullPath, lines, bytes: Buffer.byteLength(content) }
  }

  async _fileEdit({ path: filePath, old_string, new_string, replace_all = false }) {
    const fullPath = this._resolve(filePath)
    let content    = await fs.readFile(fullPath, 'utf8')

    if (!content.includes(old_string)) {
      return { error: `old_string not found in file. Make sure it matches exactly (including whitespace and indentation).` }
    }

    if (replace_all) {
      content = content.replaceAll(old_string, new_string)
    } else {
      content = content.replace(old_string, new_string)
    }

    await fs.writeFile(fullPath, content, 'utf8')
    return { success: true, path: fullPath, message: `Replaced ${replace_all ? 'all occurrences' : 'first occurrence'} in ${filePath}` }
  }

  async _fileSearch({ pattern, path: searchPath, include, exclude, max_results = 50 }) {
    const dir = searchPath ? this._resolve(searchPath) : this.projectPath
    const globPattern = include || '**/*'
    const ignorePatterns = [
      'node_modules/**', '.git/**', 'dist/**', 'build/**', '*.lock',
      ...(exclude ? [exclude] : [])
    ]

    const files = await glob(globPattern, {
      cwd: dir, absolute: true, ignore: ignorePatterns, nodir: true
    })

    const regex   = new RegExp(pattern, 'gi')
    const results = []

    for (const file of files) {
      if (results.length >= max_results) break
      try {
        const content = await fs.readFile(file, 'utf8')
        const lines   = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            results.push({
              file: path.relative(this.projectPath, file),
              line: i + 1,
              content: lines[i].trim().slice(0, 200),
            })
            regex.lastIndex = 0
            if (results.length >= max_results) break
          }
        }
      } catch { /* skip binary/unreadable files */ }
    }

    if (results.length === 0) return `No matches found for pattern: ${pattern}`

    return results.map(r => `${r.file}:${r.line}  ${r.content}`).join('\n')
  }

  async _fileList({ path: dirPath, recursive = false, pattern, max_depth = 3 }) {
    const fullPath = dirPath ? this._resolve(dirPath) : this.projectPath

    if (pattern || recursive) {
      const globPattern = pattern || (recursive ? '**/*' : '*')
      const files = await glob(globPattern, {
        cwd: fullPath,
        ignore: ['node_modules/**', '.git/**'],
        maxDepth: max_depth,
      })
      return files.slice(0, 200).map(f => f).join('\n')
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true })
    return entries
      .sort((a, b) => (b.isDirectory() ? 1 : 0) - (a.isDirectory() ? 1 : 0) || a.name.localeCompare(b.name))
      .map(e => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`)
      .join('\n')
  }

  async _fileDelete({ path: filePath }) {
    const fullPath = this._resolve(filePath)
    const stat     = await fs.stat(fullPath)
    if (stat.isDirectory()) return { error: 'Cannot delete directories with this tool. Use terminal_exec with rm -rf.' }
    await fs.unlink(fullPath)
    return { success: true, deleted: path.relative(this.projectPath, fullPath) }
  }

  async _terminalExec({ command, cwd, timeout = 30000 }) {
    const workDir = cwd ? this._resolve(cwd) : this.projectPath

    // Security: block dangerous commands unless explicitly allowed
    const dangerous = ['rm -rf /', 'format c:', 'mkfs', ':(){:|:&};:']
    if (dangerous.some(d => command.includes(d))) {
      return { error: 'Blocked: dangerous command detected' }
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd:       workDir,
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        shell:     process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
      })
      return {
        stdout: (stdout || '').slice(0, 30000),
        stderr: (stderr || '').slice(0, 5000),
        exitCode: 0,
      }
    } catch (err) {
      return {
        stdout: (err.stdout || '').slice(0, 15000),
        stderr: (err.stderr || '').slice(0, 5000),
        exitCode: err.code || 1,
        error: err.killed ? 'Command timed out' : err.message?.slice(0, 200),
      }
    }
  }

  async _codeExec({ language, code, timeout = 10000 }) {
    const tmpDir = path.join(this.projectPath, '.codeva', 'tmp')
    await fs.mkdir(tmpDir, { recursive: true })

    let cmd, file
    if (language === 'javascript') {
      file = path.join(tmpDir, `exec_${Date.now()}.mjs`)
      await fs.writeFile(file, code, 'utf8')
      cmd = `node "${file}"`
    } else if (language === 'python') {
      file = path.join(tmpDir, `exec_${Date.now()}.py`)
      await fs.writeFile(file, code, 'utf8')
      cmd = `python "${file}"`
    } else {
      return { error: `Unsupported language: ${language}` }
    }

    try {
      const result = await this._terminalExec({ command: cmd, timeout })
      // Cleanup
      await fs.unlink(file).catch(() => {})
      return result
    } catch (err) {
      await fs.unlink(file).catch(() => {})
      return { error: err.message }
    }
  }

  async _webSearch({ query, num_results = 5 }) {
    try {
      const res = await fetch(`${BACKEND_API_BASE}/search`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query, limit: Math.min(num_results, 10) }),
        signal:  AbortSignal.timeout(15000),
      })
      if (!res.ok) throw new Error(`Search API returned ${res.status}`)
      const data    = await res.json()
      const results = (data.results || data.organic || []).slice(0, num_results)
      if (results.length === 0) return `No results found for: "${query}"`
      return results.map((r, i) =>
        `${i + 1}. **${r.title}**\n   URL: ${r.link || r.url}\n   ${(r.snippet || r.description || '').slice(0, 200)}`
      ).join('\n\n')
    } catch (err) {
      return { error: `Web search failed: ${err.message}` }
    }
  }

  async _browserFetch({ url, selector, max_chars = 30000 }) {
    try {
      const res  = await fetch(url, {
        headers: { 'User-Agent': 'CodeVaa-Agent/1.0 (compatible; research bot)' },
        signal:  AbortSignal.timeout(20000),
        redirect: 'follow',
      })
      if (!res.ok) return { error: `HTTP ${res.status} from ${url}` }

      const html = await res.text()

      // Strip HTML to text
      let text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim()

      return text.slice(0, max_chars)
    } catch (err) {
      return { error: `Browser fetch failed: ${err.message}` }
    }
  }

  async _gitOps({ operation, args = '', message, files }) {
    let command
    switch (operation) {
      case 'status':   command = 'git status --short'; break
      case 'diff':     command = `git diff ${args}`; break
      case 'log':      command = `git log --oneline -20 ${args}`; break
      case 'add':      command = files?.length ? `git add ${files.map(f => `"${f}"`).join(' ')}` : `git add ${args || '.'}`; break
      case 'commit':   command = `git commit -m "${(message || 'update').replace(/"/g, '\\"')}"`; break
      case 'branch':   command = `git branch ${args}`; break
      case 'checkout': command = `git checkout ${args}`; break
      case 'stash':    command = `git stash ${args}`; break
      case 'pull':     command = `git pull ${args}`; break
      case 'push':     command = `git push ${args}`; break
      default:         return { error: `Unknown git operation: ${operation}` }
    }
    return this._terminalExec({ command })
  }

  async _packageManager({ action, packages = [], dev = false, script }) {
    // Detect package manager
    const pm = await this._detectPackageManager()

    let command
    switch (action) {
      case 'install': {
        if (packages.length === 0) {
          command = pm === 'npm' ? 'npm install' : pm === 'yarn' ? 'yarn' : `${pm} install`
        } else {
          const devFlag = dev ? (pm === 'npm' ? '--save-dev' : '-D') : ''
          command = pm === 'npm'
            ? `npm install ${packages.join(' ')} ${devFlag}`
            : `${pm} add ${packages.join(' ')} ${devFlag}`
        }
        break
      }
      case 'uninstall':
        command = pm === 'npm'
          ? `npm uninstall ${packages.join(' ')}`
          : `${pm} remove ${packages.join(' ')}`
        break
      case 'list':
        command = pm === 'npm' ? 'npm list --depth=0' : `${pm} list`
        break
      case 'audit':
        command = `${pm} audit`
        break
      case 'outdated':
        command = `${pm} outdated`
        break
      case 'run':
        command = `${pm} run ${script || 'dev'}`
        break
      default:
        return { error: `Unknown package manager action: ${action}` }
    }
    return this._terminalExec({ command, timeout: 60000 })
  }

  async _memoryRead({ key }) {
    await this.memory.init()
    if (key === 'all') {
      return this.memory.getContextString(8000)
    }
    const value = this.memory.get(key)
    return value !== null ? String(value) : `Key "${key}" not found. Available keys: ${this.memory.getAll().map(e => e.key).join(', ') || '(empty)'}`
  }

  async _memoryWrite({ key, value }) {
    await this.memory.init()
    await this.memory.set(key, value, this.agentType)
    return { success: true, key, message: `Stored "${key}" in shared memory (visible to all agents)` }
  }

  async _mcpCall({ server, tool, arguments: args = {} }) {
    // MCP calls route through the backend
    try {
      const res = await fetch(`${BACKEND_API_BASE}/platform/mcp/call`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ server, tool, arguments: args }),
        signal:  AbortSignal.timeout(30000),
      })
      if (!res.ok) return { error: `MCP call failed: HTTP ${res.status}` }
      return await res.json()
    } catch (err) {
      return { error: `MCP call failed: ${err.message}. Is the MCP server "${server}" running?` }
    }
  }

  async _skillExec({ skill_id, script, args = [] }) {
    if (!this.skillsLoader) return { error: 'Skills system not available' }

    const skill = await this.skillsLoader.getSkill(skill_id)
    if (!skill) return { error: `Skill "${skill_id}" not found` }
    if (!skill.dirPath) return { error: `Skill "${skill_id}" has no directory (inline skills cannot have scripts)` }

    const scriptPath = path.join(skill.dirPath, 'scripts', script)
    try {
      await fs.access(scriptPath)
    } catch {
      return { error: `Script "${script}" not found in skill "${skill_id}". Available: ${skill.scripts.map(s => path.basename(s)).join(', ')}` }
    }

    // Detect script type and execute
    const ext = path.extname(script).toLowerCase()
    let command
    if (ext === '.py')       command = `python "${scriptPath}" ${args.join(' ')}`
    else if (ext === '.sh')  command = `bash "${scriptPath}" ${args.join(' ')}`
    else if (ext === '.js' || ext === '.mjs') command = `node "${scriptPath}" ${args.join(' ')}`
    else return { error: `Unsupported script type: ${ext}` }

    return this._terminalExec({ command, timeout: 30000 })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  _resolve(filePath) {
    if (!filePath) return this.projectPath
    if (path.isAbsolute(filePath)) return filePath
    return path.resolve(this.projectPath, filePath)
  }

  async _detectPackageManager() {
    const checks = [
      { file: 'pnpm-lock.yaml', pm: 'pnpm' },
      { file: 'yarn.lock',      pm: 'yarn' },
      { file: 'bun.lockb',      pm: 'bun' },
      { file: 'package-lock.json', pm: 'npm' },
      { file: 'requirements.txt', pm: 'pip' },
      { file: 'Cargo.toml',     pm: 'cargo' },
      { file: 'go.mod',         pm: 'go' },
    ]
    for (const { file, pm } of checks) {
      try {
        await fs.access(path.join(this.projectPath, file))
        return pm
      } catch { /* try next */ }
    }
    return 'npm' // default
  }
}
