import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeMultimodalContent, contentText, hasImageContent, toGeminiParts } from './multimodal.js'

test('legacy and structured images produce real Gemini image parts with surrounding text', () => {
  const legacy = 'Inspect ![screenshot](data:image/png;base64,aGVsbG8=) carefully'
  const structured = normalizeMultimodalContent(legacy)
  assert.equal(structured.length, 3)
  assert.equal(contentText(structured), 'Inspect \n carefully')
  assert.equal(hasImageContent(legacy), true)
  assert.deepEqual(toGeminiParts(legacy), toGeminiParts(structured))
  assert.deepEqual(toGeminiParts(structured)[1], { inlineData: { mimeType: 'image/png', data: 'aGVsbG8=' } })
})
test('plain text stays text and unsupported images fail explicitly', () => {
  assert.equal(normalizeMultimodalContent('plain'), 'plain')
  assert.equal(hasImageContent('plain'), false)
  assert.deepEqual(toGeminiParts('plain'), [{ text: 'plain' }])
  assert.deepEqual(toGeminiParts(null), [{ text: '' }])
  assert.throws(() => toGeminiParts([{ type: 'image_url', image_url: { url: 'https://example.test/private' } }]), /inline/)
  assert.throws(() => toGeminiParts([{ type: 'unsupported' }]), /Unsupported/)
  assert.equal(toGeminiParts([{ type: 'image_url', image_url: { url: 'data:image/jpg;base64,aGVs\nbG8=' } }])[0].inlineData.mimeType, 'image/jpeg')
})
