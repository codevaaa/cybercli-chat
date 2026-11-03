export const MATERIAL_ABSENT = 'The material does not contain it.'
export function materialDisplay(value) {
  const valid = value?.supported === true && Array.isArray(value.citations) && value.citations.length > 0 && value.citations.every(c => typeof c.quote === 'string' && c.quote.length && c.chunk_id && c.material_id && (Number.isInteger(c.page) && c.page > 0 || typeof c.note_id === 'string' && c.note_id.length))
  return valid && value.answer === value.citations.map(c => c.quote).join('\n\n') ? value : { answer: MATERIAL_ABSENT, citations: [], supported: false }
}
