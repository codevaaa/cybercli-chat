import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderMarkdown } from './markdown.js'

test('formats headings, lists, code, bold and safe links', () => {
  const html = renderMarkdown('# Title\n- **one**\n- `two`\n\n```js\na < b\n```\n[Docs](https://example.com)')
  for (const expected of ['<h1>Title</h1>', '<ul>', '<strong>one</strong>', '<code>two</code>', '<pre><code>a &lt; b</code></pre>', 'rel="noopener noreferrer"']) assert.ok(html.includes(expected))
})
test('raw HTML, unsafe URLs, and attribute injection remain inert', () => {
  const html = renderMarkdown('<img src=x onerror=alert(1)>\n[x](javascript:alert(1))\n[x](https://example.com/"onclick="alert)')
  assert.ok(!html.includes('<img'))
  assert.ok(!html.includes('href="javascript:'))
  assert.ok(!html.includes('"onclick="'))
  assert.ok(html.includes('&quot;onclick=&quot;'))
})
