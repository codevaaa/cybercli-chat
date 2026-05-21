import vm from 'vm'

/**
 * Execute JavaScript code in a sandboxed context and return the captured output.
 * @param {string} code The code to run.
 * @param {number} timeoutMs Maximum execution time in milliseconds.
 */
export function executeCodeSandbox(code, timeoutMs = 2000) {
  let logs = []
  
  // Set up sandbox context
  const sandbox = {
    console: {
      log: (...args) => {
        logs.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '))
      },
      error: (...args) => {
        logs.push('[ERROR] ' + args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '))
      },
      warn: (...args) => {
        logs.push('[WARN] ' + args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '))
      }
    },
    process: {
      env: {}
    },
    // Prevent some globals if needed, keeping context minimal and safe
    setTimeout: null,
    setInterval: null,
    require: null,
  }

  const context = vm.createContext(sandbox)

  try {
    const script = new vm.Script(code)
    
    // Execute
    const result = script.runInContext(context, {
      timeout: timeoutMs,
      breakOnSigint: true
    })

    let stdout = logs.join('\n')
    let returned = result !== undefined ? (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)) : ''

    return {
      success: true,
      stdout,
      returned,
      output: stdout + (returned ? (stdout ? '\n' : '') + 'Returned: ' + returned : '') || 'Code executed successfully with no output.'
    }
  } catch (err) {
    return {
      success: false,
      error: err.message,
      output: logs.join('\n') + (logs.length ? '\n' : '') + `Execution Error: ${err.message}`
    }
  }
}
