import { test } from 'node:test'
import assert from 'node:assert/strict'
import './writing.js'
const { localGrammar, assessment, applyIssues, issueKey, normalizeIssues } = globalThis.CodevaWriting

test('local checks find common sentence errors and retain exact Unicode positions without a full-proofread claim', () => {
  const text = 'हाय! This are teh update. She have a calender. i agree.'
  const issues = localGrammar(text)
  assert.equal(applyIssues(text, issues), 'हाय! This is the update. She has a calendar. I agree.')
  assert.ok(issues.every(issue => issue.source === 'local' && text.slice(issue.start, issue.end) === issue.original))
  assert.match(assessment('local', [], 'She go to work yesterday.').title, /has not run/)
  assert.notEqual(assessment('local', [], 'Hello team.').state, 'complete')
})

test('dictionary and informal writing avoid speculative corrections; all-clear requires a completed AI check', () => {
  assert.deepEqual(localGrammar('Codevaa gonna ship ur project.'), [])
  assert.deepEqual(localGrammar('teh', ['teh']), [])
  for (const [source, expected] of [['complete', 'complete'], ['unavailable', 'unavailable'], ['checking', 'checking']]) assert.equal(assessment(source, [], 'Hello team.').state, expected)
  assert.equal(assessment('complete', [], '').state, 'limited')
  assert.equal(assessment('complete', [], 'x'.repeat(6001)).state, 'limited')
  assert.equal(assessment('complete', localGrammar('This are wrong.'), 'This are wrong.').state, 'suggestions')
  assert.notEqual(issueKey(localGrammar('teh teh')[0]), issueKey(localGrammar('Hi teh')[0]))
  assert.equal(normalizeIssues('teh', [{ original: 'teh', suggestion: 'the', source: 'ai' }])[0].source, 'ai')
})
