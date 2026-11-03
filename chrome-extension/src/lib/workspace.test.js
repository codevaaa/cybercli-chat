import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accountKey, normalizeWorkspace, pagePrompt } from './workspace.js'
import './writing.js'
const { normalizeIssues, applyIssues } = globalThis.CodevaWriting

test('history is partitioned by account and stable after token refresh', () => {
  const token = sub => `header.${btoa(JSON.stringify({ sub }))}.signature`
  assert.equal(accountKey(token('one')), accountKey(token('one')))
  assert.notEqual(accountKey(token('one')), accountKey(token('two')))
  assert.notEqual(accountKey('opaque-one'), accountKey('opaque-two'))
})
test('restoring history bounds messages and marks interrupted streams as stopped', () => {
  const restored = normalizeWorkspace({ activeId: 'bad', conversations: [{ id: 'one', messages: [{ role: 'system', content: 'discard' }, { role: 'assistant', content: 'partial', status: 'streaming' }] }] })
  assert.equal(restored.activeId, 'one')
  assert.deepEqual(restored.conversations[0].messages, [{ role: 'assistant', content: 'partial', status: 'stopped' }])
})
test('page prompts include the actual source and reject unreadable or privileged pages', () => {
  const prompt = pagePrompt('Summarize', { title: 'Fixture', url: 'https://example.test/article', content: 'Actual page facts' })
  assert.match(prompt, /Actual page facts/); assert.match(prompt, /https:\/\/example.test\/article/)
  assert.throws(() => pagePrompt('Summarize', { content: '' }), /no readable/)
  assert.throws(() => pagePrompt('Summarize', { url: 'chrome://settings', content: 'text' }), /does not allow/)
})
test('suggestions fix the correct repeated occurrence and preserve Unicode offsets', () => {
  const text = 'हाय teh and teh'
  const issues = normalizeIssues(text, [{ original: 'teh', suggestion: 'the', start: 12, type: 'spelling' }])
  assert.equal(applyIssues(text, issues), 'हाय teh and the')
  assert.throws(() => applyIssues('text changed', issues), /Text changed/)
})
test('overlapping, absent and speculative issues cannot change the draft', () => {
  const text = 'teh teh'
  const issues = normalizeIssues(text, [{ original: 'teh', suggestion: 'the', start: 0 }, { original: 'teh teh', suggestion: 'the' }, { original: 'missing', suggestion: 'bad' }, { original: 'teh', suggestion: '(verify)', lowConfidence: true }])
  assert.equal(issues.length, 1); assert.equal(applyIssues(text, issues), 'the teh')
})
