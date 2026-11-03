const text = { type: 'string' }
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false })
const array = items => ({ type: 'array', items })
export function responseSchema(role, inline = false) {
  const spec = array(text)
  const schema = role === 'Conductor' ? object({ will_build: spec, must_never: spec, acceptance: spec })
    : role === 'Designer' ? object({ proposals: array(object({ title: text, summary: text, spec_line_ids: spec })) })
    : role === 'Frontend' && inline ? object({ replacement: text })
    : role.startsWith('Judge') ? object({ lines: array(object({ id: text, verdict: { type: 'string', enum: ['pass', 'fail', 'needs_user'] }, evidence: text, source_ids: spec })) })
    : role.startsWith('Review-') ? object({ lines: array(object({ id: text, verdict: { type: 'string', enum: ['pass', 'fail', 'outside_spec'] }, evidence: text })) })
    // Strict outputs require an object at the root, with nullable alternatives.
    : object({ files: { anyOf: [array(object({ path: text, content: text })), { type: 'null' }] }, blocked: { anyOf: [text, { type: 'null' }] } })
  return { type: 'json_schema', json_schema: { name: `dossier_${role.replace(/[^a-zA-Z0-9_]/g, '_')}`, strict: true, schema } }
}
