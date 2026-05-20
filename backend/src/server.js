import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
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

import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env') })

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
  origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path })
})

// Error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`CyberCli API server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app
