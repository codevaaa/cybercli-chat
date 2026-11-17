import { describe, expect, it } from 'vitest'
import { clampCompanionBounds, getInitialCompanionBounds } from './companionWindow.js'

describe('companion window bounds', () => {
  it('places the first window in the work area lower-right with a margin', () => {
    expect(getInitialCompanionBounds({ x: 0, y: 0, width: 1920, height: 1080 })).toEqual({
      x: 1678, y: 736, width: 224, height: 326,
    })
  })

  it('keeps a saved position inside a monitor with negative desktop coordinates', () => {
    expect(clampCompanionBounds(
      { x: -2400, y: 3000, width: 224, height: 326 },
      { x: -1920, y: 0, width: 1920, height: 1080 },
    )).toEqual({ x: -1920, y: 754, width: 224, height: 326 })
  })

  it('shrinks to fit unusually small work areas and rejects non-finite positions', () => {
    expect(clampCompanionBounds(
      { x: Number.NaN, y: Number.POSITIVE_INFINITY, width: 224, height: 258 },
      { x: 40, y: 60, width: 120, height: 90 },
    )).toEqual({ x: 40, y: 60, width: 120, height: 90 })
  })
})
