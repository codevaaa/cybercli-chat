import dns from 'dns'
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
} catch (err) {
  console.warn('Failed to set custom DNS servers:', err.message)
}

import './config/env.js'
import connectMongoDB from './config/database.js'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'

import authRoutes from './routes/auth.routes.js'
import chatRoutes from './routes/chat.routes.js'
import completionsRoutes from './routes/completions.routes.js'
import modelsRoutes from './routes/models.routes.js'
import settingsRoutes from './routes/settings.routes.js'
import personasRoutes from './routes/personas.routes.js'
import foldersRoutes from './routes/folders.routes.js'
import snippetsRoutes from './routes/snippets.routes.js'
import usageRoutes from './routes/usage.routes.js'
import ttsRoutes from './routes/tts.routes.js'
import stripeRoutes from './routes/stripe.routes.js'
import searchRoutes from './routes/search.routes.js'
import webhookRoutes from './routes/webhook.routes.js'
import apiKeysRoutes from './routes/apiKeys.routes.js'
import daemonRoutes from './routes/daemon.routes.js'
import executeRoutes from './routes/execute.routes.js'
import imagesRoutes from './routes/images.routes.js'
import contactRoutes from './routes/contact.routes.js'
import projectsRoutes from './routes/projects.routes.js'
import workflowsRoutes from './routes/workflows.routes.js'
import inviteRoutes from './routes/invite.routes.js'
import http from 'http'
import { WebSocketServer } from 'ws'
import ApiKey from './models/ApiKey.js'
import { registerDaemon, removeDaemon, handleDaemonResponse } from './utils/daemonBridge.js'


import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
import { optionalAuth } from './middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('Supabase URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET')
console.log('Supabase Key:', process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET')
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET')

const app = express()
const PORT = process.env.PORT || 3000

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.groq.com", "https://generativelanguage.googleapis.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))

app.use(cors({
  origin: (origin, callback) => {
    const whitelist = process.env.FRONTEND_URL?.split(',') || []
    const defaults = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://cybercli-chat.vercel.app',
      'https://cybercli.vercel.app',
      'https://cybermindcli.info',
      'https://www.cybermindcli.info'
    ]
    if (!origin || whitelist.includes(origin) || defaults.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => req.user?.plan === 'pro' ? 500 : req.user ? 100 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    })
  },
})
app.use(optionalAuth)
app.use(limiter)

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging
app.use(requestLogger)

// Health check and root endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/', (req, res) => {
  res.json({ 
    message: 'CyberCli API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      docs: '/api/v1/docs'
    }
  })
})

// API routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/chat', chatRoutes)
app.use('/api/v1/completions', completionsRoutes)
app.use('/api/v1/models', modelsRoutes)
app.use('/api/v1/settings', settingsRoutes)
app.use('/api/v1/personas', personasRoutes)
app.use('/api/v1/folders', foldersRoutes)
app.use('/api/v1/snippets', snippetsRoutes)
app.use('/api/v1/usage', usageRoutes)
app.use('/api/v1/tts', ttsRoutes)
app.use('/api/v1/stripe', stripeRoutes)
app.use('/api/v1/search', searchRoutes)
app.use('/api/v1/webhook', webhookRoutes)
app.use('/api/v1/api-keys', apiKeysRoutes)
app.use('/api/v1/daemon', daemonRoutes)
app.use('/api/v1/execute', executeRoutes)
app.use('/api/v1/images', imagesRoutes)
app.use('/api/v1/contact', contactRoutes)
app.use('/api/v1/projects', projectsRoutes)
app.use('/api/v1/workflows', workflowsRoutes)
app.use('/api/v1/invite', inviteRoutes)


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path })
})

// Error handler
app.use(errorHandler)

// Connect to MongoDB then listen
const server = http.createServer(app)
const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', async (request, socket, head) => {
  try {
    const parsedUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
    const pathname = parsedUrl.pathname
    
    if (pathname === '/api/v1/daemon') {
      const apiKey = parsedUrl.searchParams.get('apiKey')
      if (!apiKey || !apiKey.startsWith('sk_cyber_')) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
        socket.destroy()
        return
      }

      const apiKeyDoc = await ApiKey.findOne({ key: apiKey, is_active: true })
      if (!apiKeyDoc) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
        socket.destroy()
        return
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, apiKeyDoc.user_id)
      })
    } else {
      socket.destroy()
    }
  } catch (err) {
    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n')
    socket.destroy()
  }
})

wss.on('connection', (ws, request, userId) => {
  registerDaemon(userId, ws)
  console.log(`Daemon connected for user: ${userId}`)

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString())
      if (data.type === 'response' && data.actionId) {
        handleDaemonResponse(data.actionId, data)
      }
    } catch (err) {
      console.error('Error handling daemon message:', err)
    }
  })

  ws.on('close', () => {
    removeDaemon(userId)
    console.log(`Daemon disconnected for user: ${userId}`)
  })

  ws.on('error', (err) => {
    console.error(`Daemon WebSocket error for user ${userId}:`, err)
    removeDaemon(userId)
  })
})

connectMongoDB().then(() => {
  server.listen(PORT, () => {
    console.log(`CyberCli API server running on port ${PORT}`)
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  })
})

export default app
