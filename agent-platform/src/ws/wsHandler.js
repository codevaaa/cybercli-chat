/**
 * WebSocketHandler — Real-time bridge between Orchestrator events and UI clients.
 *
 * Protocol (JSON over WS):
 *   Client → Server:  { type: 'run', sessionId, goal, projectPath }
 *                     { type: 'cancel', sessionId }
 *                     { type: 'subscribe', sessionId }
 *                     { type: 'ping' }
 *
 *   Server → Client:  { type: 'orchestrator:planning', ... }
 *                     { type: 'orchestrator:graph_ready', ... }
 *                     { type: 'task:started', ... }
 *                     { type: 'agent:token', agentId, taskId, token }
 *                     { type: 'agent:tool', agentId, taskId, tool }
 *                     { type: 'task:completed', ... }
 *                     { type: 'task:failed', ... }
 *                     { type: 'orchestrator:completed', result, stats }
 *                     { type: 'error', message }
 *                     { type: 'pong' }
 */
import { Orchestrator } from '../orchestrator/Orchestrator.js'
import { logger }       from '../utils/logger.js'
import { v4 as uuid }   from 'uuid'

// Active orchestrator sessions keyed by sessionId
const sessions = new Map()

// Client subscriptions: clientId → Set<sessionId>
const subscriptions = new Map()

export function WebSocketHandler(socket, req, wss) {
  const clientId = uuid()
  subscriptions.set(clientId, new Set())

  logger.info(`[WS] Client connected: ${clientId}`)

  socket.on('message', async (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      send(socket, { type: 'error', message: 'Invalid JSON' })
      return
    }

    switch (msg.type) {
      case 'ping':
        send(socket, { type: 'pong' })
        break

      case 'subscribe': {
        const { sessionId } = msg
        subscriptions.get(clientId)?.add(sessionId)
        // Send current state if session exists
        const orch = sessions.get(sessionId)
        if (orch) {
          send(socket, { type: 'session:snapshot', snapshot: orch.getSnapshot() })
        }
        break
      }

      case 'run': {
        const {
          sessionId    = uuid(),
          goal,
          projectPath,
          projectContext,
          maxParallel,
        } = msg

        if (!goal) {
          send(socket, { type: 'error', message: 'goal is required' })
          return
        }

        // Subscribe this client to the session automatically
        subscriptions.get(clientId)?.add(sessionId)

        // Create orchestrator
        const orch = new Orchestrator({ sessionId, projectPath, projectContext, maxParallel })
        sessions.set(sessionId, orch)

        // Forward all orchestrator events to subscribed clients
        const events = [
          'orchestrator:planning', 'orchestrator:graph_ready', 'orchestrator:status',
          'orchestrator:synthesizing', 'orchestrator:completed', 'orchestrator:failed',
          'orchestrator:cancelled',
          'task:started', 'task:completed', 'task:failed',
          'agent:token', 'agent:info', 'agent:tool',
        ]
        for (const ev of events) {
          orch.on(ev, (data) => {
            broadcast(wss, sessionId, subscriptions, { type: ev, sessionId, ...data })
          })
        }

        send(socket, { type: 'session:created', sessionId })

        // Run async
        orch.run(goal, { projectPath, projectContext }).catch(err => {
          logger.error(`[WS] Session ${sessionId} error: ${err.message}`)
          broadcast(wss, sessionId, subscriptions, {
            type: 'orchestrator:error', sessionId, error: err.message
          })
        })
        break
      }

      case 'cancel': {
        const { sessionId } = msg
        const orch = sessions.get(sessionId)
        if (orch) {
          orch.cancel()
          send(socket, { type: 'session:cancelled', sessionId })
        }
        break
      }

      case 'list_sessions': {
        const list = [...sessions.entries()].map(([id, orch]) => orch.getSnapshot())
        send(socket, { type: 'sessions:list', sessions: list })
        break
      }

      default:
        send(socket, { type: 'error', message: `Unknown message type: ${msg.type}` })
    }
  })

  socket.on('close', () => {
    logger.info(`[WS] Client disconnected: ${clientId}`)
    subscriptions.delete(clientId)
  })

  socket.on('error', (err) => {
    logger.warn(`[WS] Socket error for ${clientId}: ${err.message}`)
  })
}

function send(socket, data) {
  try {
    if (socket.readyState === 1) { // OPEN
      socket.send(JSON.stringify(data))
    }
  } catch (err) {
    logger.warn(`[WS] Send error: ${err.message}`)
  }
}

function broadcast(wss, sessionId, subscriptions, data) {
  const payload = JSON.stringify(data)
  for (const [clientId, subs] of subscriptions.entries()) {
    if (!subs.has(sessionId)) continue
    for (const ws of wss.clients) {
      if (ws.readyState === 1) {
        try { ws.send(payload) } catch { /* client gone */ }
      }
    }
  }
}

export { sessions }
