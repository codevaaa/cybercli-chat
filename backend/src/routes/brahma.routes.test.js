import { test } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { createBrahmaRouter } from './brahma.routes.js'

const makeApp = options => {
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  app.use('/api/v1/brahma', createBrahmaRouter(options))
  return app
}

test('authenticated full-stack builder forwards only to the loopback Brahma API', async () => {
  const originalKey = process.env.BRAHMA_API_KEY
  const originalURL = process.env.BRAHMA_BASE_URL
  process.env.BRAHMA_API_KEY = 'route-fixture-key'
  process.env.BRAHMA_BASE_URL = 'http://127.0.0.1:8765/v1'
  const calls = []
  const app = makeApp({
    auth: (req, res, next) => { req.user = { id: 'fixture-user' }; next() },
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      return { ok: true, status: 200, json: async () => ({ success: true, project_id: 'abc', preview_file: 'dist/index.html' }) }
    },
  })
  const response = await request(app).post('/api/v1/brahma/build').send({ prompt: 'Build a small app for tracking tasks and due dates.' })
  assert.equal(response.status, 200)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'http://127.0.0.1:8765/v1/builder/generate')
  assert.equal(calls[0].options.headers.authorization, 'Bearer route-fixture-key')
  assert.equal(JSON.parse(calls[0].options.body).max_repairs, 2)
  assert.ok(!JSON.stringify(response.body).includes('route-fixture-key'))
  if (originalKey === undefined) delete process.env.BRAHMA_API_KEY; else process.env.BRAHMA_API_KEY = originalKey
  if (originalURL === undefined) delete process.env.BRAHMA_BASE_URL; else process.env.BRAHMA_BASE_URL = originalURL
})

test('builder endpoint rejects invalid input and refuses non-loopback configured endpoints', async () => {
  const originalKey = process.env.BRAHMA_API_KEY
  const originalURL = process.env.BRAHMA_BASE_URL
  process.env.BRAHMA_API_KEY = 'route-fixture-key'
  process.env.BRAHMA_BASE_URL = 'https://remote.invalid/v1'
  let fetchCount = 0
  const app = makeApp({
    auth: (req, res, next) => { req.user = { id: 'fixture-user' }; next() },
    fetchImpl: async () => { fetchCount++; throw new Error('must not be called') },
  })
  assert.equal((await request(app).post('/api/v1/brahma/build').send({ prompt: 'short' })).status, 400)
  assert.equal((await request(app).post('/api/v1/brahma/build').send({ prompt: 'Build a useful full-stack application for team notes.' })).status, 503)
  assert.equal(fetchCount, 0)
  if (originalKey === undefined) delete process.env.BRAHMA_API_KEY; else process.env.BRAHMA_API_KEY = originalKey
  if (originalURL === undefined) delete process.env.BRAHMA_BASE_URL; else process.env.BRAHMA_BASE_URL = originalURL
})
