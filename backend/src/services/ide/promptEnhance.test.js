/**
 * Smoke tests for IDE tunnel helpers: tool param forwarding + enhance quotas.
 * Runner: npm test  (node --test against src services *.test.js)
 */

import { describe, test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildToolParams,
  TOOL_CAPABLE_PROVIDERS,
  sanitizeChatMessage,
} from '../llm/gateway.js'
import {
  checkEnhanceQuota,
  getEnhanceQuota,
  buildEnhanceMessages,
  summarizeEnhanceChanges,
  _resetEnhanceQuotaForTests,
  ENHANCE_DAILY_QUOTA,
} from './promptEnhance.js'

describe('buildToolParams', () => {
  const sampleTools = [
    {
      type: 'function',
      function: {
        name: 'read_file',
        description: 'Read a file',
        parameters: { type: 'object', properties: { path: { type: 'string' } } },
      },
    },
  ]

  test('forwards tools and tool_choice for OpenAI-compatible providers', () => {
    for (const provider of ['openrouter', 'groq', 'mistral', 'cerebras']) {
      assert.ok(TOOL_CAPABLE_PROVIDERS.has(provider))
      const params = buildToolParams(sampleTools, 'auto', provider)
      assert.deepEqual(params.tools, sampleTools)
      assert.equal(params.tool_choice, 'auto')
    }
  })

  test('omits tools for non-capable providers', () => {
    const params = buildToolParams(sampleTools, 'auto', 'gemini')
    assert.deepEqual(params, {})
  })

  test('omits tools when tools array empty or missing', () => {
    assert.deepEqual(buildToolParams([], 'auto', 'groq'), {})
    assert.deepEqual(buildToolParams(undefined, 'auto', 'groq'), {})
  })
})

describe('sanitizeChatMessage tool fields', () => {
  test('preserves tool_calls on assistant messages', () => {
    const msg = sanitizeChatMessage({
      role: 'assistant',
      content: null,
      tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'read_file', arguments: '{}' } }],
    })
    assert.equal(msg.role, 'assistant')
    assert.equal(msg.content, null)
    assert.equal(msg.tool_calls.length, 1)
    assert.equal(msg.tool_calls[0].id, 'call_1')
  })

  test('preserves tool_call_id on tool role messages', () => {
    const msg = sanitizeChatMessage({
      role: 'tool',
      tool_call_id: 'call_1',
      content: '{"ok":true}',
    })
    assert.equal(msg.role, 'tool')
    assert.equal(msg.tool_call_id, 'call_1')
    assert.equal(msg.content, '{"ok":true}')
  })
})

describe('prompt enhance quota', () => {
  beforeEach(() => {
    _resetEnhanceQuotaForTests()
  })

  test('free plan allows 10 enhances then blocks', () => {
    assert.equal(getEnhanceQuota('free'), ENHANCE_DAILY_QUOTA.free)
    const userId = 'user-free-1'
    for (let i = 0; i < 10; i++) {
      const r = checkEnhanceQuota(userId, 'free', { consume: true })
      assert.equal(r.allowed, true)
    }
    const blocked = checkEnhanceQuota(userId, 'free', { consume: true })
    assert.equal(blocked.allowed, false)
    assert.equal(blocked.remaining, 0)
    assert.equal(blocked.limit, 10)
  })

  test('max plan is unlimited', () => {
    const r = checkEnhanceQuota('user-max', 'max', { consume: true })
    assert.equal(r.allowed, true)
    assert.equal(r.limit, -1)
    assert.equal(r.remaining, -1)
  })

  test('peek does not consume', () => {
    const peek = checkEnhanceQuota('user-peek', 'pro', { consume: false })
    assert.equal(peek.used, 0)
    assert.equal(peek.remaining, 100)
    const after = checkEnhanceQuota('user-peek', 'pro', { consume: false })
    assert.equal(after.used, 0)
  })
})

describe('buildEnhanceMessages', () => {
  test('includes system enhancer + digest + raw prompt', () => {
    const msgs = buildEnhanceMessages({
      rawPrompt: 'fix the bug',
      projectDigest: 'stack: node, folders: src/',
      mode: 'agent',
      locale: 'en',
    })
    assert.equal(msgs.length, 2)
    assert.equal(msgs[0].role, 'system')
    assert.equal(msgs[0]._skip_inject, true)
    assert.match(msgs[1].content, /fix the bug/)
    assert.match(msgs[1].content, /stack: node/)
    assert.match(msgs[1].content, /Mode: agent/)
  })

  test('summarizeEnhanceChanges detects expansion', () => {
    const summary = summarizeEnhanceChanges('fix it', 'Goal: Fix the authentication bug.\nConstraints: ...\nAcceptance: tests pass.')
    assert.match(summary, /Expanded|structure|intent/i)
  })
})
