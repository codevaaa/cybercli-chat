import crypto from 'crypto'

// Map of user_id -> ws_connection
const connectedDaemons = new Map()

// Map of actionId -> { resolve, reject, timer }
const pendingRequests = new Map()

export function registerDaemon(userId, ws) {
  connectedDaemons.set(userId, ws)
}

export function getDaemon(userId) {
  return connectedDaemons.get(userId)
}

export function removeDaemon(userId) {
  connectedDaemons.delete(userId)
}

export function handleDaemonResponse(actionId, response) {
  const pending = pendingRequests.get(actionId)
  if (pending) {
    clearTimeout(pending.timer)
    pendingRequests.delete(actionId)
    if (response.success) {
      pending.resolve(response.data)
    } else {
      pending.reject(new Error(response.error || 'Daemon action failed'))
    }
  }
}

export function sendActionToDaemon(userId, action, payload = {}) {
  return new Promise((resolve, reject) => {
    const ws = connectedDaemons.get(userId)
    if (!ws) {
      return reject(new Error('No active local CLI daemon connected for this user'))
    }

    const actionId = crypto.randomUUID()
    const msg = {
      type: 'action',
      actionId,
      action,
      ...payload
    }

    // Set a 60-second timeout for the user to approve the command in their console
    const timer = setTimeout(() => {
      pendingRequests.delete(actionId)
      reject(new Error('Daemon action request timed out (no user approval received in 60s)'))
    }, 60000)

    pendingRequests.set(actionId, { resolve, reject, timer })

    try {
      ws.send(JSON.stringify(msg))
    } catch (err) {
      clearTimeout(timer)
      pendingRequests.delete(actionId)
      reject(new Error(`Failed to send request to daemon: ${err.message}`))
    }
  })
}
