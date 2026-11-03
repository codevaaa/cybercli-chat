// Adjacent project counts use the persisted routing log, not a second counter DB.
import { modelClass } from '../dossier/modelTier.js'
export function projectMeter(events = []) {
  const counts = { free: 0, mid: 0, frontier: 0 }
  for (const event of events) if (event.kind === 'provider_attempt') {
    const tier = event.tier || modelClass(event.provider, event.model)
    if (Object.hasOwn(counts, tier)) counts[tier]++
  }
  return { ...counts, unit: 'provider_attempts', through_seq: events.at(-1)?.seq || 0 }
}
