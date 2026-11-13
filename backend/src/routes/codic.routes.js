import { Router } from 'express'
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import CodicDevice from '../models/CodicDevice.js'
import CodicAuthHandoff from '../models/CodicAuthHandoff.js'
import UsageAnalytics from '../models/UsageAnalytics.js'
import { requireAuth } from '../middleware/auth.js'
import { llmGateway } from '../services/llm/gateway.js'
import { streamLifetime } from '../services/llm/streamLifetime.js'
import { getPlan } from '../config/plans.js'

const router = Router()
const MAX_MESSAGE_CHARS = 240_000
const MAX_TOOL_COUNT = 64
const MAX_TOOL_SCHEMA_CHARS = 96_000

const toolCallSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.literal('function'),
  function: z.object({
    name: z.string().min(1).max(128),
    arguments: z.string().max(80_000).optional(),
  }),
})

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.union([z.string().max(MAX_MESSAGE_CHARS), z.null()]).optional(),
  name: z.string().max(128).optional(),
  tool_call_id: z.string().max(200).optional(),
  tool_calls: z.array(toolCallSchema).max(MAX_TOOL_COUNT).optional(),
}).superRefine((message, ctx) => {
  if (message.role === 'assistant' && !message.content && !message.tool_calls?.length) {
    ctx.addIssue({ code: 'custom', message: 'Assistant messages need content or tool calls.' })
  }
  if (message.role === 'tool' && !message.tool_call_id) {
    ctx.addIssue({ code: 'custom', message: 'Tool results need a tool_call_id.' })
  }
  if (message.role !== 'assistant' && message.tool_calls?.length) {
    ctx.addIssue({ code: 'custom', message: 'Only assistant messages can contain tool calls.' })
  }
})

const functionToolSchema = z.object({
  type: z.literal('function'),
  function: z.object({
    name: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
    description: z.string().max(4_000).optional(),
    parameters: z.record(z.unknown()),
  }),
})

const modelCatalog = [
  { id: 'auto', name: 'Auto', description: 'Routes the request through Codeva’s model gateway.', tier: 'fast' },
  { id: 'codeva/ravan', name: 'Ravan', description: 'Codeva coding model route.', tier: 'reasoning' },
  { id: 'codeva/abhimanyu', name: 'Abhimanyu', description: 'Codeva general assistant route.', tier: 'balanced' },
  { id: 'codeva/madhav', name: 'Madhav', description: 'Codeva reasoning model route.', tier: 'reasoning' },
  { id: 'codeva/yudhishthir', name: 'Yudhishthir', description: 'Codeva review and policy route.', tier: 'reasoning' },
  { id: 'codeva/bheem', name: 'Bheem', description: 'Codeva coding model route.', tier: 'balanced' },
  { id: 'codeva/arjun', name: 'Arjun', description: 'Codeva fast response route.', tier: 'fast' },
  { id: 'codeva/nakul', name: 'Nakul', description: 'Codeva frontend assistance route.', tier: 'fast' },
  { id: 'codeva/sahadeva', name: 'Sahadeva', description: 'Codeva analysis route.', tier: 'reasoning' },
  { id: 'codeva/chanakya', name: 'Chanakya', description: 'Codeva strategy route.', tier: 'reasoning' },
  { id: 'codeva/shiv', name: 'Shiv', description: 'Codeva security review route.', tier: 'reasoning' },
]

const modelAliases = {
  ravan: 'codeva-ravan-v1',
  abhimanyu: 'cloudflare/@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  madhav: 'llm7/deepseek-v3.1:671b-terminus',
  yudhishthir: 'nvidia/llama-3.1-nemotron-70b',
  bheem: 'llm7/qwen3-235b',
  arjun: 'llm7/codestral-latest',
  nakul: 'llm7/GLM-4.6V-Flash',
  sahadeva: 'gemini/gemini-2.5-pro',
  chanakya: 'groq/deepseek-r1-distill-70b',
  shiv: 'llm7/kimi-k2.6',
  auto: 'auto',
}

const turnSchema = z.object({
  // Existing Codic 0.1.x clients send this hint. This endpoint always streams
  // SSE, so accept it for compatibility while keeping strict validation.
  stream: z.boolean().optional(),
  model: z.string().trim().min(1).max(160).optional().default('auto'),
  effort: z.enum(['low', 'medium', 'high']).optional().default('low'),
  messages: z.array(messageSchema).min(1).max(64),
  tools: z.array(functionToolSchema).max(MAX_TOOL_COUNT).optional(),
  tool_choice: z.union([
    z.enum(['auto', 'none', 'required']),
    z.object({ type: z.literal('function'), function: z.object({ name: z.string().min(1).max(128) }) }),
  ]).optional(),
  temperature: z.number().min(0).max(2).optional().default(0.4),
  max_tokens: z.number().int().min(1).max(32_768).optional(),
  system: z.string().max(32_000).optional(),
}).strict().superRefine((body, ctx) => {
  const messageChars = body.messages.reduce((total, message) => {
    const contentLength = typeof message.content === 'string' ? message.content.length : 0
    const toolLength = message.tool_calls ? JSON.stringify(message.tool_calls).length : 0
    return total + contentLength + toolLength
  }, 0)
  if (messageChars > MAX_MESSAGE_CHARS) {
    ctx.addIssue({ code: 'custom', message: `Conversation context exceeds ${MAX_MESSAGE_CHARS} characters.` })
  }
  if (body.tools && JSON.stringify(body.tools).length > MAX_TOOL_SCHEMA_CHARS) {
    ctx.addIssue({ code: 'custom', message: 'Tool definitions are too large.' })
  }
  if (body.tool_choice?.type === 'function' && body.tools && !body.tools.some(tool => tool.function.name === body.tool_choice.function.name)) {
    ctx.addIssue({ code: 'custom', message: 'tool_choice must refer to a tool in the request.' })
  }
})

const deviceSchema = z.object({
  deviceId: z.string().uuid(),
  platform: z.enum(['macos', 'windows', 'linux']),
  appVersion: z.string().trim().min(1).max(40).regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
  displayName: z.string().trim().max(80).optional().default(''),
}).strict()

const handoffIssueSchema = z.object({
  challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  // Supabase owns the refresh-token format and does not promise a fixed
  // minimum length. Require a nonblank bounded string; redemption validates it.
  refreshToken: z.string().trim().min(1).max(8_192),
}).strict()

const handoffRedeemSchema = z.object({
  ticket: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  verifier: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
}).strict()

const codicHandoffKey = () => {
  const encoded = process.env.CODEVA_CODIC_HANDOFF_KEY || ''
  if (!encoded) {
    const serverSecret = process.env.SUPABASE_SERVICE_KEY || ''
    if (serverSecret.length < 32) throw new Error('Codic sign-in handoff encryption is not configured.')
    return createHmac('sha256', serverSecret).update('codeva:codic:auth-handoff:v1').digest()
  }
  if (!/^[A-Za-z0-9+/]{43}=$/.test(encoded)) throw new Error('Codic sign-in handoff encryption is not configured.')
  const key = Buffer.from(encoded, 'base64')
  if (key.length !== 32 || key.toString('base64') !== encoded) throw new Error('Codic sign-in handoff encryption is not configured.')
  return key
}

const encryptHandoffSession = (session, key) => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map(value => value.toString('base64url')).join('.')
}

const decryptHandoffSession = (payload, key) => {
  const [ivText, tagText, encryptedText, extra] = String(payload || '').split('.')
  if (!ivText || !tagText || !encryptedText || extra) throw new Error('Invalid handoff payload.')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivText, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]).toString('utf8')
  return JSON.parse(decrypted)
}

const sha256Hex = value => createHash('sha256').update(value).digest('hex')

const messageTextLength = message => {
  const content = typeof message.content === 'string' ? message.content.length : 0
  const calls = message.tool_calls ? JSON.stringify(message.tool_calls).length : 0
  return content + calls
}

const resolveModel = model => {
  const normalized = model.toLowerCase().replace(/^codeva\//, '')
  return modelAliases[normalized] || model
}

const isCatalogModel = model => modelCatalog.some(item => item.id === model)

const emitEvent = (res, event) => {
  if (res.writableEnded || res.destroyed) return false
  return res.write(`data: ${JSON.stringify(event)}\n\n`)
}

const messageTokensEstimate = messages => Math.max(1, Math.ceil(messages.reduce((total, message) => total + messageTextLength(message), 0) / 4))

// Public only to the extent that the opaque, one-use ticket is. The desktop
// proves possession of its verifier before these encrypted session tokens are
// released; raw Supabase credentials never travel in the deep-link URL.
router.post('/auth-handoffs/redeem', async (req, res, next) => {
  const parsed = handoffRedeemSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Start sign-in again from Codic. The secure handoff is invalid.' })
  try {
    const { ticket, verifier } = parsed.data
    const ticketHash = sha256Hex(ticket)
    const record = await CodicAuthHandoff.findOne({ ticket_hash: ticketHash, expires_at: { $gt: new Date() } }).lean()
    if (!record) return res.status(410).json({ error: 'This Codic sign-in link has expired or was already used. Start sign-in again.' })
    const actualChallenge = createHash('sha256').update(verifier).digest('base64url')
    const actual = Buffer.from(actualChallenge)
    const expected = Buffer.from(record.challenge)
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return res.status(400).json({ error: 'This sign-in link belongs to another Codic request.' })
    const consumed = await CodicAuthHandoff.findOneAndDelete({ _id: record._id, ticket_hash: ticketHash, challenge: record.challenge, expires_at: { $gt: new Date() } }).lean()
    if (!consumed) return res.status(410).json({ error: 'This Codic sign-in link has already been used. Start sign-in again.' })
    const session = decryptHandoffSession(consumed.encrypted_session, codicHandoffKey())
    if (typeof session.access_token !== 'string' || typeof session.refresh_token !== 'string') throw new Error('Invalid handoff session.')
    res.set('Cache-Control', 'no-store')
    return res.json({ session })
  } catch (error) {
    if (/handoff encryption is not configured/i.test(error.message || '')) return res.status(503).json({ error: 'Codic sign-in is temporarily unavailable. Please contact Codeva support.' })
    return next(error)
  }
})

router.use(requireAuth)

router.post('/auth-handoffs', async (req, res, next) => {
  const parsed = handoffIssueSchema.safeParse(req.body)
  if (!parsed.success) {
    const invalidChallenge = parsed.error.issues.some(issue => issue.path[0] === 'challenge')
    return res.status(400).json({
      error: invalidChallenge
        ? 'The Codic sign-in challenge is invalid. Start sign-in again from Codic.'
        : 'The Codeva sign-in session is incomplete. Sign in to Codeva again, then return to Codic.',
    })
  }
  if (req.user?.viaApiKey) return res.status(403).json({ error: 'Sign in through the Codeva website to connect Codic.' })
  const accessToken = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1]
  if (!accessToken || accessToken.length > 8_192) return res.status(401).json({ error: 'A valid Codeva website session is required.' })
  try {
    const key = codicHandoffKey()
    const ticket = randomBytes(32).toString('base64url')
    const { challenge, refreshToken } = parsed.data
    await CodicAuthHandoff.create({
      ticket_hash: sha256Hex(ticket),
      challenge,
      encrypted_session: encryptHandoffSession({ access_token: accessToken, refresh_token: refreshToken }, key),
      expires_at: new Date(Date.now() + 2 * 60_000),
    })
    res.set('Cache-Control', 'no-store')
    return res.status(201).json({ ticket, expiresIn: 120 })
  } catch (error) {
    if (/handoff encryption is not configured/i.test(error.message || '')) return res.status(503).json({ error: 'Codic sign-in is not configured on this server yet.' })
    return next(error)
  }
})

router.post('/devices', async (req, res, next) => {
  const parsed = deviceSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Provide a valid device ID, platform, app version, and optional display name.' })

  try {
    const { deviceId, platform, appVersion, displayName } = parsed.data
    const device = await CodicDevice.findOneAndUpdate(
      { user_id: req.user.id, device_id: deviceId },
      {
        $set: { platform, app_version: appVersion, display_name: displayName, last_seen_at: new Date(), revoked_at: null },
        $setOnInsert: { user_id: req.user.id, device_id: deviceId },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).select('device_id platform app_version display_name created_at last_seen_at revoked_at').lean()

    return res.status(200).json({ device })
  } catch (error) {
    return next(error)
  }
})

router.delete('/devices/:deviceId', async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.deviceId).success) return res.status(400).json({ error: 'Provide a valid device ID.' })
  try {
    const result = await CodicDevice.updateOne(
      { user_id: req.user.id, device_id: req.params.deviceId, revoked_at: null },
      { $set: { revoked_at: new Date() } },
    )
    if (!result.matchedCount) return res.status(404).json({ error: 'Device not found.' })
    return res.json({ revoked: true, deviceId: req.params.deviceId })
  } catch (error) {
    return next(error)
  }
})

router.get('/models', async (req, res, next) => {
  const plan = getPlan(req.user?.plan)
  const models = modelCatalog.map(model => ({
    ...model,
    locked: model.id !== 'auto' && !plan.allowedTiers.includes(model.tier),
  }))
  try {
    const analytics = await UsageAnalytics.getOrCreate(req.user.id)
    const limit = Number(analytics?.quota?.monthly_token_limit)
    const used = Number(analytics?.quota?.tokens_used_this_month || 0)
    const finiteLimit = Number.isFinite(limit)
    return res.json({
      models,
      plan: plan.id,
      limits: {
        requestsPerHour: plan.requestsPerHour,
        monthlyTokens: {
          limit: finiteLimit ? limit : null,
          used: Number.isFinite(used) ? used : 0,
          remaining: finiteLimit ? Math.max(0, limit - used) : null,
          resetsAt: analytics?.quota?.resets_at || null,
        },
      },
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/turns', async (req, res, next) => {
  const parsed = turnSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid Codic turn.' })

  const body = parsed.data
  const catalogModel = modelCatalog.find(model => model.id === body.model)
  if (!catalogModel || !isCatalogModel(body.model)) return res.status(400).json({ error: 'Choose a model from the Codic model list.' })
  const planConfig = getPlan(req.user?.plan)
  if (catalogModel.id !== 'auto' && !planConfig.allowedTiers.includes(catalogModel.tier)) {
    return res.status(403).json({ error: 'This model is not available on your current plan.', plan: planConfig.id, model: catalogModel.id })
  }
  const plan = planConfig.id
  const requestedModel = resolveModel(body.model)
  const analyticsPromise = UsageAnalytics.getOrCreate(req.user.id)
  let analytics
  try {
    analytics = await analyticsPromise
  } catch (error) {
    return next(error)
  }

  const quotaLimit = Number(analytics?.quota?.monthly_token_limit)
  const quotaUsed = Number(analytics?.quota?.tokens_used_this_month || 0)
  const messages = body.system
    ? [{ role: 'system', content: body.system, _skip_inject: true }, ...body.messages]
    : body.messages.map(message => message.role === 'system' ? { ...message, _skip_inject: true } : message)
  const inputTokensEstimate = messageTokensEstimate(messages)
  const remainingTokens = Number.isFinite(quotaLimit) ? Math.max(0, quotaLimit - quotaUsed) : Infinity
  if (Number.isFinite(quotaLimit) && (quotaUsed >= quotaLimit || inputTokensEstimate >= remainingTokens)) {
    return res.status(429).json({
      error: 'Monthly token quota reached.',
      quota: { limit: quotaLimit, used: quotaUsed, remaining: remainingTokens, resetsAt: analytics.quota.resets_at || null },
    })
  }

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()

  const lifetime = streamLifetime(res)
  const startedAt = Date.now()
  let outputChars = 0
  let toolChars = 0
  let routedProvider = 'gateway'
  let routedModel = requestedModel
  let completed = false
  let failed = false
  let sawGatewayDone = false
  let finishReason = 'completed'
  let providerUsage = null
  const toolCalls = new Map()

  const sendError = (code, message) => emitEvent(res, { type: 'error', error: { code, message } })
  const flushToolCalls = () => {
    for (const toolCall of toolCalls.values()) {
      if (toolCall.processed) continue
      toolCall.processed = true
      const allowedByRequest = body.tools?.some(tool => tool.function.name === toolCall.name)
      if (!toolCall.id || !toolCall.name || !allowedByRequest) {
        failed = true
        sendError('INVALID_TOOL_CALL', 'The model returned a tool call that is not available for this request.')
        continue
      }
      let input
      try {
        input = toolCall.arguments ? JSON.parse(toolCall.arguments) : {}
      } catch {
        failed = true
        sendError('INVALID_TOOL_ARGUMENTS', 'The model returned incomplete tool arguments. Please retry this turn.')
        continue
      }
      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        failed = true
        sendError('INVALID_TOOL_ARGUMENTS', 'The model returned invalid tool arguments. Please retry this turn.')
        continue
      }
      emitEvent(res, { type: 'tool_call', toolCall: { id: toolCall.id, name: toolCall.name, input } })
    }
  }

  try {
    const generator = llmGateway.complete({
      messages,
      model: requestedModel,
      temperature: body.temperature,
      effort: body.effort,
      plan,
      tools: body.tools,
      tool_choice: body.tool_choice,
      max_tokens: Number.isFinite(remainingTokens)
        ? Math.max(1, Math.min(body.max_tokens || 32_768, remainingTokens - inputTokensEstimate))
        : body.max_tokens,
      signal: lifetime.signal,
    })

    for await (const chunk of generator) {
      if (lifetime.signal.aborted || res.destroyed) break

      if (chunk.type === 'token') {
        outputChars += typeof chunk.content === 'string' ? chunk.content.length : 0
        lifetime.token()
        emitEvent(res, { type: 'text', text: chunk.content })
      } else if (chunk.type === 'tool_calls_delta') {
        for (const delta of chunk.tool_calls || []) {
          const existingById = delta.id && [...toolCalls.entries()].find(([, call]) => call.id === delta.id)
          const fallbackKey = delta.id || (toolCalls.size === 1 ? toolCalls.keys().next().value : `tool-${toolCalls.size}`)
          const key = Number.isInteger(delta.index) ? delta.index : (existingById?.[0] ?? fallbackKey)
          const current = toolCalls.get(key) || { id: '', name: '', arguments: '', processed: false }
          if (delta.id) current.id = delta.id
          if (delta.function?.name) current.name += delta.function.name
          if (delta.function?.arguments) current.arguments += delta.function.arguments
          toolCalls.set(key, current)
          toolChars += JSON.stringify(delta).length
        }
      } else if (chunk.type === 'finish') {
        finishReason = chunk.finish_reason || 'stop'
        flushToolCalls()
      } else if (chunk.type === 'usage') {
        // Some gateway adapters can provide exact usage. Current complete()
        // implementations do not; absent this event, an explicit estimate is emitted below.
        const usageSource = chunk.usage || chunk
        const inputTokens = Number(usageSource.inputTokens ?? usageSource.prompt_tokens ?? usageSource.tokens_in)
        const outputTokens = Number(usageSource.outputTokens ?? usageSource.completion_tokens ?? usageSource.tokens_out)
        if (Number.isFinite(inputTokens) && inputTokens >= 0 && Number.isFinite(outputTokens) && outputTokens >= 0) {
          providerUsage = { inputTokens, outputTokens }
          if (typeof chunk.provider === 'string') routedProvider = chunk.provider.slice(0, 80)
          if (typeof chunk.model === 'string') routedModel = chunk.model.slice(0, 160)
        }
      } else if (chunk.type === 'info') {
        if (chunk.provider) routedProvider = String(chunk.provider).slice(0, 80)
        if (chunk.model) routedModel = String(chunk.model).slice(0, 160)
      } else if (chunk.type === 'error') {
        failed = true
        finishReason = 'error'
        sendError('PROVIDER_UNAVAILABLE', 'The model service is temporarily unavailable. Please try again.')
      } else if (chunk.type === 'done') {
        sawGatewayDone = true
        flushToolCalls()
        completed = !failed
      }
    }

    if (lifetime.signal.aborted) return
    if (!sawGatewayDone && !failed) {
      failed = true
      finishReason = 'error'
      sendError('UPSTREAM_INCOMPLETE', 'The model service ended the turn before completion. Please retry.')
    }

    // The current gateway stream does not expose provider token counts. These
    // character-based figures are explicitly labelled estimates; they are
    // used for the existing token quota and are not presented as provider usage.
    const outputTokensEstimate = Math.max(0, Math.ceil((outputChars + toolChars) / 4))
    const usage = providerUsage || { inputTokens: inputTokensEstimate, outputTokens: outputTokensEstimate }
    if (outputChars || toolChars || completed || providerUsage) {
      const elapsed = Date.now() - startedAt
      try {
        await analytics.trackUsage(routedModel, routedProvider, usage.inputTokens, usage.outputTokens, 0, elapsed)
        emitEvent(res, {
          type: 'usage',
          ...usage,
          ...(providerUsage ? { estimated: false } : { estimated: true, source: 'character_count' }),
        })
      } catch {
        // Usage persistence failures must not expose database/provider details.
      }
    }

    emitEvent(res, { type: 'done', reason: failed ? 'error' : finishReason })
  } catch (error) {
    if (!lifetime.signal.aborted && !res.destroyed) {
      sendError('TURN_FAILED', 'The turn could not be completed. Please try again.')
      emitEvent(res, { type: 'done', reason: 'error' })
    }
    // The response is already an SSE stream. Do not pass its exception into
    // Express' JSON error handler after headers have been sent.
    return
  } finally {
    lifetime.dispose()
    if (!res.destroyed && !res.writableEnded) res.end()
  }
})

export default router
