import { PNG } from 'pngjs'
import { activeLines, fault } from './domain.js'

export function visualDiff(before, after) {
  const a = PNG.sync.read(before), b = PNG.sync.read(after)
  if (a.width * a.height > 2000000 || b.width * b.height > 2000000) throw fault('Screenshot exceeds comparison limits', 422)
  const diff = new PNG({ width: b.width, height: b.height })
  let changed = 0
  for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) {
    const i = (y * b.width + x) * 4, j = (y * a.width + x) * 4
    const altered = x >= a.width || y >= a.height || [0, 1, 2, 3].some(c => Math.abs(a.data[j + c] - b.data[i + c]) > 32)
    if (altered) changed++
    diff.data.set(altered ? [217, 119, 87, 255] : [b.data[i], b.data[i + 1], b.data[i + 2], 70], i)
  }
  const ratio = a.width !== b.width || a.height !== b.height ? 1 : changed / (b.width * b.height)
  return { ratio, changed_pixels: changed, png: PNG.sync.write(diff) }
}
export function visualApproval(d, task, ratio) {
  const ids = activeLines(d).filter(l => l.group !== 'must_never' && task.spec_line_ids.includes(l.id) && ['accepted', 'edited'].includes(l.status) && !/\b(no|not|never|without|preserve|unchanged|keep)\b|नहीं|मत/iu.test(l.final_text) && /\b(redesign|layout|theme|colou?r|appearance|visual|language toggle)\b|डिज़ाइन|रंग|भाषा/iu.test(l.final_text)).map(l => l.id)
  return { allowed: ratio <= 0.2 || ids.length > 0, covering_spec_line_ids: ids, threshold: 0.2 }
}
