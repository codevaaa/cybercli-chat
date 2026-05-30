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
import feedbackRoutes from './routes/feedback.routes.js'
import supportRoutes from './routes/support.routes.js'
import cliRoutes from './routes/cli.routes.js'
import downloadsRoutes from './routes/downloads.routes.js'
import v1Routes from './routes/v1.routes.js'
import http from 'http'
import { WebSocketServer } from 'ws'
import ApiKey from './models/ApiKey.js'
import Feedback from './models/Feedback.js'
import { registerDaemon, removeDaemon, handleDaemonResponse } from './utils/daemonBridge.js'


import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
import { optionalAuth } from './middleware/auth.js'
import { PLANS } from './config/plans.js'

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
      'https://codeva-chat.vercel.app',
      'https://codeva.vercel.app',
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

// Rate limiting — per-plan throughput from the single source of truth (plans.js).
// The window is 15 min, so we scale the plan's hourly budget to the window and
// add headroom for guests. Authenticated users resolve their real plan upstream.
const RATE_WINDOW_MS = 15 * 60 * 1000
const limiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: (req) => {
    const planId = req.user?.plan || 'free'
    const plan = PLANS[planId] || PLANS.free
    if (!req.user) return 20 // guests
    // hourly budget → per-15-min window (¼), min 25 so paid users never starve
    return Math.max(25, Math.ceil((plan.requestsPerHour || 50) / 4))
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    })
  },
})
app.use(optionalAuth)
app.use(limiter)

// Stripe webhook needs the RAW request body for signature verification, so it
// must be registered BEFORE the global JSON body parser below.
app.post('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  import('./routes/stripe.routes.js').then((m) => m.handleWebhook(req, res, next)).catch(next)
})

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
    message: 'Codeva API',
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
app.use('/api/v1/feedback', feedbackRoutes)
app.use('/api/v1/support', supportRoutes)
app.use('/api/v1/cli', cliRoutes)
app.use('/api/v1/downloads', downloadsRoutes)
app.use('/v1', v1Routes)


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

      const apiKeyDoc = await ApiKey.findOne({ key_hash: ApiKey.hashKey(apiKey), is_active: true })
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

connectMongoDB().then(async () => {
  // Seed feedback testimonials if none exist
  try {
    const feedbackCount = await Feedback.countDocuments()
    if (feedbackCount === 0) {
      const defaultTestimonials = [
        {
          user_id: 'seed-user-1',
          name: 'Riya Mehta',
          initials: 'RM',
          quote: 'Council Mode completely changed how I analyse threat models. Three different AI perspectives on the same CVE in under 10 seconds — nothing else comes close.',
          role: 'Senior Security Researcher',
          company: 'Trail of Bits',
          stars: 5,
          accentColor: '#D97757',
        },
        {
          user_id: 'seed-user-2',
          name: 'James Okafor',
          initials: 'JO',
          quote: 'I switched from Claude Pro the moment I tried conversation branching. Being able to explore two hypotheses in parallel without losing context is a game-changer.',
          role: 'Staff Software Engineer',
          company: 'Linear',
          stars: 5,
          accentColor: '#D97757',
        },
        {
          user_id: 'seed-user-3',
          name: 'Sara Chen',
          initials: 'SC',
          quote: 'As a PhD student on a tight budget, having 200K+ free models is wild. Codeva lets me run literature reviews and summarise papers without paying a cent.',
          role: 'PhD Candidate',
          company: 'MIT CSAIL',
          stars: 5,
          accentColor: '#06B6D4',
        },
        {
          user_id: 'seed-user-4',
          name: 'Tomás Vélez',
          initials: 'TV',
          quote: "The ElevenLabs voice integration is silky smooth. I use it for hands-free code reviews while I'm in the gym. The audio quality beats every other AI voice I've tried.",
          role: 'Indie Developer',
          company: '',
          stars: 5,
          accentColor: '#10B981',
        },
        {
          user_id: 'seed-user-5',
          name: 'Priya Nair',
          initials: 'PN',
          quote: 'Custom Agents saved our team hours a week. We built a security-policy agent with our internal docs and now junior devs get instant, accurate answers without pinging us.',
          role: 'Head of Platform Security',
          company: 'Stripe',
          stars: 5,
          accentColor: '#F59E0B',
        },
        {
          user_id: 'seed-user-6',
          name: 'Luca Moretti',
          initials: 'LM',
          quote: "The fact that it's truly free — not some freemium bait-and-switch — is what won me over. I've recommended Codeva to my entire bootcamp cohort.",
          role: 'Full-Stack Developer',
          company: 'Freelance',
          stars: 5,
          accentColor: '#D97757',
        }
      ]
      await Feedback.insertMany(defaultTestimonials)
      console.log('Seeded default feedback testimonials into MongoDB.')
    }
  } catch (seedErr) {
    console.error('Error seeding testimonials:', seedErr.message)
  }

  server.listen(PORT, () => {
    console.log(`Codeva API server running on port ${PORT}`)
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  })
})

export default app
