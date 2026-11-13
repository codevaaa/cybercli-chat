import { expect, it } from 'vitest'
import { DEFAULT_APP_ZOOM, getInitialAppZoom, placeComposerPopover } from './appPreferences'

it('starts a new Codic profile at 130 percent and keeps a valid saved preference', () => {
  expect(DEFAULT_APP_ZOOM).toBe(1.3)
  expect(getInitialAppZoom(null)).toBe(1.3)
  expect(getInitialAppZoom('1')).toBe(1)
  expect(getInitialAppZoom('1.4')).toBe(1.4)
  expect(getInitialAppZoom('invalid')).toBe(1.3)
  expect(getInitialAppZoom('2')).toBe(1.3)
})

it('keeps composer popovers above their trigger and inside a short window', () => {
  expect(placeComposerPopover(
    { top: 610, bottom: 640, left: 30, right: 120 },
    { width: 800, height: 720 },
    360,
    220,
  )).toEqual({ top: 382, left: 30, width: 360, maxHeight: 220 })
  const compact = placeComposerPopover(
    { top: 40, bottom: 70, left: 300, right: 380 },
    { width: 420, height: 280 },
    360,
    220,
  )
  expect(compact.top).toBeGreaterThanOrEqual(12)
  expect(compact.top + compact.maxHeight).toBeLessThanOrEqual(268)
  expect(compact.left + compact.width).toBeLessThanOrEqual(408)
  const tiny = placeComposerPopover(
    { top: 3, bottom: 8, left: 8, right: 18 },
    { width: 24, height: 24 },
    360,
    220,
  )
  expect(tiny.left + tiny.width).toBeLessThanOrEqual(24)
  expect(tiny.top + tiny.maxHeight).toBeLessThanOrEqual(24)
})
