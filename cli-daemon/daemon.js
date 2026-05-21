import WebSocket from 'ws'
import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import readline from 'readline'

// Parse CLI arguments
const args = {}
process.argv.slice(2).forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=')
    args[key] = value || true
  } else if (arg.startsWith('-')) {
    const key = arg.slice(1)
    args[key] = true
  }
})

const apiKey = args.key || args.k || process.env.CYBERCLI_API_KEY
const serverUrl = args.server || args.s || 'ws://localhost:3000/api/v1/daemon'

if (!apiKey) {
  console.error('\x1b[31mError: API key is required. Run with --key=sk_cyber_... or set CYBERCLI_API_KEY environment variable.\x1b[0m')
  process.exit(1)
}

console.log('\x1b[36mConnecting to CyberCli Daemon Bridge...\x1b[0m')
console.log(`Server: ${serverUrl}`)

const ws = new WebSocket(`${serverUrl}?apiKey=${apiKey}`)

ws.on('open', () => {
  console.log('\x1b[32mSuccessfully connected to CyberCli Server! Daemon is running...\x1b[0m')
  console.log('\x1b[33mWaiting for actions from CyberCli web interface...\x1b[0m\n')
})

ws.on('close', (code, reason) => {
  console.log(`\n\x1b[31mConnection closed by server (Code: ${code}, Reason: ${reason || 'None'}). Exiting...\x1b[0m`)
  process.exit(0)
})

ws.on('error', (err) => {
  console.error('\x1b[31mWebSocket Error:\x1b[0m', err.message)
})

// Queue for terminal prompts to avoid overlapping stdin inputs
let promptQueue = Promise.resolve()

function askApproval(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    rl.question(message, (answer) => {
      rl.close()
      const normalized = answer.trim().toLowerCase()
      resolve(normalized === 'y' || normalized === 'yes')
    })
  })
}

function askApprovalSequential(message) {
  return new Promise((resolve) => {
    promptQueue = promptQueue
      .then(async () => {
        const approved = await askApproval(message)
        resolve(approved)
      })
      .catch((err) => {
        console.error('Prompt queue error:', err)
        resolve(false)
      })
  })
}

ws.on('message', async (message) => {
  let data
  try {
    data = JSON.parse(message.toString())
  } catch (err) {
    console.error('Failed to parse WebSocket message:', err)
    return
  }

  if (data.type !== 'action') return

  const { actionId, action } = data
  console.log(`\n\x1b[34m[Received Action Request]\x1b[0m ID: ${actionId} | Action: ${action}`)

  try {
    if (action === 'read_file') {
      const filePath = path.resolve(data.path)
      const approved = await askApprovalSequential(`\x1b[33m[CyberCli] Request: READ file "${filePath}". Approve? (y/n): \x1b[0m`)
      
      if (!approved) {
        console.log('\x1b[31mAction Denied by User.\x1b[0m')
        ws.send(JSON.stringify({ type: 'response', actionId, success: false, error: 'User denied file read permission' }))
        return
      }

      const content = await fs.readFile(filePath, 'utf-8')
      console.log(`\x1b[32mAction Executed: Successfully read file "${filePath}"\x1b[0m`)
      ws.send(JSON.stringify({ type: 'response', actionId, success: true, data: { content } }))

    } else if (action === 'write_file') {
      const filePath = path.resolve(data.path)
      const content = data.content || ''
      const approved = await askApprovalSequential(`\x1b[33m[CyberCli] Request: WRITE file "${filePath}" (${content.length} bytes). Approve? (y/n): \x1b[0m`)

      if (!approved) {
        console.log('\x1b[31mAction Denied by User.\x1b[0m')
        ws.send(JSON.stringify({ type: 'response', actionId, success: false, error: 'User denied file write permission' }))
        return
      }

      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, content, 'utf-8')
      console.log(`\x1b[32mAction Executed: Successfully wrote file "${filePath}"\x1b[0m`)
      ws.send(JSON.stringify({ type: 'response', actionId, success: true, data: { success: true } }))

    } else if (action === 'run_command') {
      const command = data.command
      const cwd = data.cwd ? path.resolve(data.cwd) : process.cwd()
      const approved = await askApprovalSequential(`\x1b[33m[CyberCli] Request: RUN command "${command}" in "${cwd}". Approve? (y/n): \x1b[0m`)

      if (!approved) {
        console.log('\x1b[31mAction Denied by User.\x1b[0m')
        ws.send(JSON.stringify({ type: 'response', actionId, success: false, error: 'User denied command execution permission' }))
        return
      }

      console.log(`\x1b[36mRunning command: "${command}"...\x1b[0m`)
      exec(command, { cwd }, (err, stdout, stderr) => {
        if (err) {
          console.log(`\x1b[31mCommand failed with exit code ${err.code}\x1b[0m`)
          ws.send(JSON.stringify({
            type: 'response',
            actionId,
            success: false,
            error: err.message,
            data: { stdout, stderr, code: err.code }
          }))
        } else {
          console.log('\x1b[32mCommand completed successfully!\x1b[0m')
          ws.send(JSON.stringify({
            type: 'response',
            actionId,
            success: true,
            data: { stdout, stderr, code: 0 }
          }))
        }
      })
    } else {
      console.log(`\x1b[31mUnknown action: ${action}\x1b[0m`)
      ws.send(JSON.stringify({ type: 'response', actionId, success: false, error: `Unknown action: ${action}` }))
    }
  } catch (err) {
    console.error(`\x1b[31mError handling action ${action}:\x1b[0m`, err)
    ws.send(JSON.stringify({ type: 'response', actionId, success: false, error: err.message }))
  }
})
