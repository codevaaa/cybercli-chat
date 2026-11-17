export interface CompanionBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface DisplayWorkArea {
  x: number
  y: number
  width: number
  height: number
}

export const COMPANION_WIDTH = 284
export const COMPANION_HEIGHT = 420
export const COMPANION_MIN_WIDTH = 240
export const COMPANION_MIN_HEIGHT = 350
export const COMPANION_MARGIN = 18

const finiteInteger = (value: number, fallback: number) => Number.isFinite(value) ? Math.trunc(value) : fallback

export function clampCompanionBounds(bounds: CompanionBounds, area: DisplayWorkArea): CompanionBounds {
  const areaX = finiteInteger(area.x, 0)
  const areaY = finiteInteger(area.y, 0)
  const areaWidth = Math.max(1, finiteInteger(area.width, 1))
  const areaHeight = Math.max(1, finiteInteger(area.height, 1))
  const width = Math.min(areaWidth, Math.max(Math.min(areaWidth, COMPANION_MIN_WIDTH), finiteInteger(bounds.width, COMPANION_WIDTH)))
  const height = Math.min(areaHeight, Math.max(Math.min(areaHeight, COMPANION_MIN_HEIGHT), finiteInteger(bounds.height, COMPANION_HEIGHT)))
  const x = Math.min(areaX + areaWidth - width, Math.max(areaX, finiteInteger(bounds.x, areaX)))
  const y = Math.min(areaY + areaHeight - height, Math.max(areaY, finiteInteger(bounds.y, areaY)))
  return { x, y, width, height }
}

export function getInitialCompanionBounds(area: DisplayWorkArea): CompanionBounds {
  return clampCompanionBounds({
    x: area.x + area.width - COMPANION_WIDTH - COMPANION_MARGIN,
    y: area.y + area.height - COMPANION_HEIGHT - COMPANION_MARGIN,
    width: COMPANION_WIDTH,
    height: COMPANION_HEIGHT,
  }, area)
}
