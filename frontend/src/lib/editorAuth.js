// The existing Codeva website owns login. A random state binds the browser to
// the currently waiting editor; account tokens travel in a loopback POST body.
export function editorAuthParameters(params) {
  if (params.get('redirect') !== 'ide') return null
  const port = params.get('port') || '', state = params.get('state') || ''
  if (!/^\d{4,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535 || !/^[A-Za-z0-9_-]{43}$/.test(state)) throw new Error('Invalid MrCodevaa sign-in request. Start sign-in from the editor again.')
  return { port, state }
}
export function editorAuthQuery(params) {
  const target = editorAuthParameters(params)
  return target ? new URLSearchParams({ redirect: 'ide', ...target }).toString() : ''
}
export function returnToEditor(session, params, doc = document) {
  const target = editorAuthParameters(params)
  if (!target) return false
  if (!session?.access_token) throw new Error('Sign in to your existing Codeva account first.')
  const form = doc.createElement('form'); form.method = 'POST'; form.action = `http://127.0.0.1:${target.port}/callback`;
  for (const [name, value] of Object.entries({ state: target.state, access_token: session.access_token, refresh_token: session.refresh_token || '' })) {
    const field = doc.createElement('input'); field.type = 'hidden'; field.name = name; field.value = value; form.appendChild(field)
  }
  form.hidden = true; doc.body.appendChild(form)
  try { form.submit() } finally { form.remove() }
  return true
}
