/**
 * CodeVaa Agent Platform — Main Entry Point
 * Starts the platform server, exposes WebSocket + REST API,
 * and boots the orchestrator ready to accept tasks.
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { PLATFORM_PORT, PLATFORM_HOST, PLATFORM_NAME, PLATFORM_VERSION } from './config.js'
import { PlatformRouter } from './routes/platform.routes.js'
import { AgentRouter } from './routes/agent.routes.js'
import { SkillsRouter } from './routes/skills.routes.js'
import { SessionRouter } from './routes/session.routes.js'
import { ProjectsRouter } from './routes/projects.routes.js'
import { WebSocketHandler } from './ws/wsHandler.js'
import { ensureDirectories } from './utils/fs.js'
import { logger } from './utils/logger.js'

await ensureDirectories()

const app    = express()
const server = createServer(app)
const wss    = new WebSocketServer({ server, path: '/ws' })

app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '50mb' }))

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/platform',  PlatformRouter)
app.use('/api/agents',    AgentRouter)
app.use('/api/skills',    SkillsRouter)
app.use('/api/sessions',  SessionRouter)
app.use('/api/projects',  ProjectsRouter)

app.get('/health', (_, res) => res.json({
  status: 'ok',
  platform: PLATFORM_NAME,
  version: PLATFORM_VERSION,
  timestamp: new Date().toISOString(),
}))

// ── WebSocket ─────────────────────────────────────────────────────────────
wss.on('connection', (socket, req) => {
  WebSocketHandler(socket, req, wss)
})

// ── Start ─────────────────────────────────────────────────────────────────
server.listen(PLATFORM_PORT, PLATFORM_HOST, () => {
  logger.success(`${PLATFORM_NAME} Agent Platform v${PLATFORM_VERSION} running`)
  logger.info(`REST   → http://${PLATFORM_HOST}:${PLATFORM_PORT}`)
  logger.info(`WS     → ws://${PLATFORM_HOST}:${PLATFORM_PORT}/ws`)
  logger.info(`Health → http://${PLATFORM_HOST}:${PLATFORM_PORT}/health`)
})

export { app, server, wss }
