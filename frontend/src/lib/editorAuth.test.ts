import { test, expect, vi } from 'vitest'
import { editorAuthParameters, editorAuthQuery, returnToEditor } from './editorAuth.js'
const params = new URLSearchParams({ redirect: 'ide', port: '32123', state: 'a'.repeat(43) })
test('editor login preserves the state across browser signup/OAuth and sends credentials only in a form body', () => {
  expect(editorAuthParameters(params)).toEqual({ port: '32123', state: 'a'.repeat(43) })
  expect(new URLSearchParams(editorAuthQuery(params)).get('state')).toBe('a'.repeat(43))
  const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function() {
    expect(this.action).toBe('http://127.0.0.1:32123/callback'); expect(this.method).toBe('post')
    expect(this.action).not.toContain('access-token-fixture'); expect(new FormData(this).get('access_token')).toBe('access-token-fixture')
  })
  expect(returnToEditor({ access_token: 'access-token-fixture', refresh_token: 'refresh-fixture' }, params)).toBe(true)
  expect(submit).toHaveBeenCalledOnce(); expect(document.querySelector('form')).toBeNull(); submit.mockRestore()
})
test('non-editor sign-in stays unchanged and invalid/external destinations fail before sending credentials', () => {
  expect(returnToEditor({}, new URLSearchParams())).toBe(false)
  for (const change of [{ port: '1' }, { port: '65536' }, { port: 'https://other.invalid' }, { state: '' }]) {
    expect(() => editorAuthParameters(new URLSearchParams({ ...Object.fromEntries(params), ...change }))).toThrow(/Invalid/)
  }
  expect(() => returnToEditor({}, params)).toThrow(/Sign in/)
})
