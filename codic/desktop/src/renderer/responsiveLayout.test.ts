import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')

it('reflows Codic panels and composer from their available width at desktop zoom levels', () => {
  expect(css).toContain('container-name: codic-shell')
  expect(css).toContain('container-name: codic-main')
  expect(css).toContain('@container codic-shell (max-width: 900px)')
  expect(css).toContain('@container codic-shell (max-width: 660px)')
  expect(css).toContain('@container codic-main (max-width: 760px)')
  expect(css).toContain('.composer-left, .composer-right-controls { width: 100%; min-width: 0; flex: 1 1 100%; }')
  expect(css).toContain('html, body, #root { min-width: 0; }')
  expect(css).toContain('@media (min-width: 2200px)')
})
