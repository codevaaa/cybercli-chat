import { randomUUID } from 'node:crypto'
import { fork } from 'node:child_process'
import { assertNoSecrets, digest, fault } from './domain.js'

export const MATERIAL_ABSENT = 'The material does not contain it.'
const stop = new Set('a an the is are was were of on in at and or to for from what how which please tell me about does do explain'.split(' '))
export function terms(text) { return [...new Set((text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(t => t.length > 1 && !stop.has(t)))].slice(0, 300) }

export async function extractMaterial({ name, kind, text, data_base64 }) {
  if (typeof name !== 'string' || !name.trim() || name.length > 100 || !['notes', 'pdf'].includes(kind)) throw fault('Choose a named PDF or notes file', 400)
  assertNoSecrets(name)
  let pages, sha256
  if (kind === 'notes') {
    if (typeof text !== 'string' || !text.trim() || Buffer.byteLength(text) > 100000) throw fault('Notes must contain 1–100000 bytes', 400)
    pages = [{ note_id: randomUUID(), text }]
    sha256 = digest(text)
  } else {
    if (typeof data_base64 !== 'string' || data_base64.length > 7000000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data_base64)) throw fault('PDF upload exceeds limits or is malformed', 400)
    const data = Buffer.from(data_base64, 'base64')
    if (data.length > 5000000 || data.subarray(0, 5).toString() !== '%PDF-') throw fault('A PDF of at most 5 MB is required', 400)
    sha256 = digest(data)
    // Parse bounded bytes in a disposable worker, not on the API event loop.
    // No document URL, remote font or external resource fetch is accepted.
    pages = await new Promise((resolve, reject) => {
      // PDFJS loads a native canvas binding on Node. A separate bounded process
      // keeps its native lifetime away from the API and concurrent PDF uploads.
      const worker = fork(new URL('./pdfWorker.js', import.meta.url), { env: {}, execArgv: ['--max-old-space-size=96'], stdio: ['ignore', 'ignore', 'ignore', 'ipc'], serialization: 'advanced', windowsHide: true })
      let completed = false
      const timer = setTimeout(() => { worker.kill(); reject(fault('PDF parsing time limit exceeded; upload notes instead', 422)) }, 10000)
      worker.once('message', result => { completed = true; clearTimeout(timer); if (result.error) reject(fault(result.error, 422)); else resolve(result.pages) })
      worker.once('error', () => { clearTimeout(timer); reject(fault('PDF could not be read; upload notes instead', 422)) })
      worker.once('exit', () => { clearTimeout(timer); if (!completed) reject(fault('PDF parsing stopped before completion', 422)) })
      worker.send(new Uint8Array(data))
    })
  }
  const chunks = []
  for (const page of pages) {
    assertNoSecrets(page.text)
    for (let offset = 0; offset < page.text.length; offset += 800) {
      const quote = page.text.slice(offset, offset + 800).trim()
      if (quote) chunks.push({ id: randomUUID(), ...(page.page ? { page: page.page } : { note_id: page.note_id }), offset, text: quote, terms: terms(quote) })
    }
  }
  if (!chunks.length) throw fault('No readable text; upload text notes for this material', 422)
  return { id: randomUUID(), name, kind, sha256, chunks, created_at: new Date().toISOString() }
}

// Commerce ships extractive answers: every displayed factual string is the exact
// uploaded quote. No model synthesis or invented page numbers are permitted.
export function materialAnswer(d, question) {
  if (typeof question !== 'string' || !question.trim() || question.length > 2000) throw fault('Material question is required', 400)
  assertNoSecrets(question)
  const query = terms(question)
  const ranked = (d.materials || []).flatMap(file => file.chunks.map(chunk => ({ file, chunk, score: query.filter(t => chunk.terms.includes(t)).length })))
    .filter(r => query.length && r.score >= Math.min(2, query.length)).sort((a, b) => b.score - a.score).slice(0, 3)
  if (!ranked.length) return { answer: MATERIAL_ABSENT, citations: [], supported: false }
  const citations = ranked.map(({ file, chunk }) => ({ material_id: file.id, name: file.name, kind: file.kind, chunk_id: chunk.id, ...(chunk.page ? { page: chunk.page } : { note_id: chunk.note_id }), quote: chunk.text }))
  return { answer: citations.map(c => c.quote).join('\n\n'), citations, supported: true, mode: 'exact_excerpts' }
}
