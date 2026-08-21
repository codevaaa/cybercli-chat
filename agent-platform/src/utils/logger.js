/**
 * Logger — Structured, coloured logger for the platform.
 * Also emits events that the WebSocket handler can forward to UI.
 */
import { EventEmitter } from 'eventemitter3'

class Logger extends EventEmitter {
  constructor() {
    super()
    this.level  = process.env.LOG_LEVEL || 'info'
    this.levels = { debug: 0, info: 1, warn: 2, error: 3, success: 1 }
  }

  _log(level, ...args) {
    const text = args.join(' ')
    const ts   = new Date().toISOString()

    if ((this.levels[level] ?? 1) >= (this.levels[this.level] ?? 1)) {
      const prefix = {
        debug:   '  [DEBUG]',
        info:    '  [INFO] ',
        warn:    '  [WARN] ',
        error:   '  [ERR]  ',
        success: '  [OK]   ',
      }[level] || '  [LOG]  '

      process.stderr.write(`${ts} ${prefix} ${text}\n`)
    }

    this.emit('log', { level, text, timestamp: ts })
  }

  debug(...args)   { this._log('debug',   ...args) }
  info(...args)    { this._log('info',    ...args) }
  warn(...args)    { this._log('warn',    ...args) }
  error(...args)   { this._log('error',   ...args) }
  success(...args) { this._log('success', ...args) }
}

export const logger = new Logger()
