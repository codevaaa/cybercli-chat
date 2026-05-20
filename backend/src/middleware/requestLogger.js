import { randomUUID } from 'crypto'

export const requestLogger = (req, res, next) => {
  const requestId = randomUUID()
  req.id = requestId
  res.setHeader('X-Request-ID', requestId)

  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(
      `[${new Date().toISOString()}] ${requestId} ${req.method} ${req.path} ${res.statusCode} ${duration}ms - ${req.ip}`
    )
  })

  next()
}
