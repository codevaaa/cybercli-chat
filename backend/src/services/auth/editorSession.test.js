import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import express from 'express'
let result, account = { status: 'active' }, outage = false
mock.module('@supabase/supabase-js', { namedExports: { createClient: (url, key, options) => {
  assert.equal(options.auth.persistSession, false); assert.equal(options.auth.autoRefreshToken, false)
  return { auth: { refreshSession: async () => { if (outage) throw new Error('fixture outage'); return result } } }
} } })
mock.module('../../models/User.js', { defaultExport: { findOne: () => ({ select: () => ({ lean: async () => account }) }) } })
const { refreshEditorSession } = await import('./editorSession.js')
const app = express(); app.use(express.json()); app.post('/refresh', refreshEditorSession)
test('editor refresh validates input, handles expired tokens and refuses banned/unregistered accounts', async () => {
  process.env.SUPABASE_URL = 'http://127.0.0.1:9'; process.env.SUPABASE_SERVICE_KEY = 'fixture-no-real-secret'
  for (const value of [null, 'short', 'a'.repeat(2049), 'a'.repeat(20)+' ']) assert.equal((await request(app).post('/refresh').send({ refresh_token: value })).status, 400)
  result = { error: new Error('expired') }
  assert.equal((await request(app).post('/refresh').send({ refresh_token: 'fixture-refresh-token' })).status, 401)
  result = { data: { user: { id: 'fixture' }, session: { access_token: 'next-token', refresh_token: 'next-refresh', expires_at: 123 } } }
  for (const next of [null, { status: 'banned' }, { status: 'suspended' }]) {
    account = next; assert.equal((await request(app).post('/refresh').send({ refresh_token: 'fixture-refresh-token' })).status, 403)
  }
  account = { status: 'active' }; const response = await request(app).post('/refresh').send({ refresh_token: 'fixture-refresh-token' })
  assert.equal(response.status, 200); assert.equal(response.headers['cache-control'], 'no-store'); assert.equal(response.body.refresh_token, 'next-refresh')
  outage = true; assert.equal((await request(app).post('/refresh').send({ refresh_token: 'fixture-refresh-token' })).status, 503); outage = false
  delete process.env.SUPABASE_URL; assert.equal((await request(app).post('/refresh').send({ refresh_token: 'fixture-refresh-token' })).status, 503)
})
