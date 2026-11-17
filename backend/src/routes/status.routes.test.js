import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'

const providerKeys = new Map([
  ['openrouter', 'test-openrouter-key'],
  ['groq', 'test-groq-key'],
  ['gemini', 'test-gemini-key'],
])
const poolStats = {
  openrouter: { total: 1, available: 1, inCooldown: 0, totalSuccess: 2, totalFailure: 0 },
}

mock.module('../middleware/auth.js', {
  namedExports: {
    requireAuth(req, res, next) {
      const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
      if (!token) return res.status(401).json({ error: 'Missing authorization header' })
      req.user = {
        id: token === 'admin-session' || token === 'admin-api-key' ? 'status-admin' : 'ordinary-user',
        ...(token === 'admin-api-key' ? { viaApiKey: true } : {}),
      }
      return next()
    },
  },
})
mock.module('mongoose', {
  defaultExport: {
    connection: {
      readyState: 1,
      db: { admin: () => ({ ping: async () => ({ ok: 1 }) }) },
    },
  },
})
mock.module('../services/llm/keyPool.js', {
  namedExports: {
    getKey: provider => providerKeys.get(provider) || null,
    getPoolStats: () => poolStats,
  },
})

process.env.ADMIN_USER_IDS = 'status-admin'
process.env.SUPABASE_URL = 'https://supabase.example.test'
process.env.SUPABASE_SERVICE_KEY = 'test-service-key'

const { default: statusRouter } = await import('./status.routes.js')
const app = express()
app.use('/status', statusRouter)

test('public status distinguishes provider configuration from completion availability', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async input => {
    const url = String(input)
    if (url.includes('openrouter.ai')) return new Response('{}', { status: 200 })
    if (url.includes('api.groq.com')) return new Response('{}', { status: 429 })
    if (url.includes('generativelanguage.googleapis.com')) return new Response('{}', { status: 401 })
    if (url.includes('supabase.example.test')) return new Response('{}', { status: 200 })
    throw new Error('Unexpected test URL')
  }

  try {
    const response = await request(app).get('/status').expect(200)
    assert.equal(response.body.overall, 'unknown')
    assert.equal(response.body.availability, 'unverified')
    assert.deepEqual(response.body.verification, {
      codicCompletion: 'not_checked',
      providerProbe: 'model_catalog_only',
      historicalUptime: 'not_available',
      incidentHistory: 'not_tracked',
    })
    assert.equal(response.body.sla90Day, null)
    assert.equal(response.body.incidents, null)
    assert.equal(response.body.incidentsAvailable, false)

    const openrouter = response.body.clusters.find(cluster => cluster.provider === 'openrouter')
    assert.deepEqual({
      status: openrouter.status,
      availability: openrouter.availability,
      configured: openrouter.configured,
      verified: openrouter.verified,
      probe: openrouter.probe,
      reason: openrouter.reason,
    }, {
      status: 'unknown',
      availability: 'unverified',
      configured: true,
      verified: false,
      probe: 'model_catalog_reachable',
      reason: 'completion_not_tested',
    })
    assert.equal('uptime' in openrouter, false)
    assert.equal('load' in openrouter, false)

    const groq = response.body.clusters.find(cluster => cluster.provider === 'groq')
    assert.equal(groq.availability, 'unknown')
    assert.equal(groq.probe, 'rate_limited')

    const unconfigured = response.body.clusters.find(cluster => cluster.provider === 'apifreellm')
    assert.equal(unconfigured.status, 'unknown')
    assert.equal(unconfigured.availability, 'not_configured')
    assert.equal(unconfigured.configured, false)
    assert.equal(unconfigured.verified, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('provider key-pool inventory requires an admin website session', async () => {
  await request(app).get('/status/keys').expect(401)
  await request(app).get('/status/keys').set('Authorization', 'Bearer ordinary-session').expect(403)
  await request(app).get('/status/keys').set('Authorization', 'Bearer admin-api-key').expect(403)

  const response = await request(app).get('/status/keys').set('Authorization', 'Bearer admin-session').expect(200)
  assert.deepEqual(response.body.pool, poolStats)
})
