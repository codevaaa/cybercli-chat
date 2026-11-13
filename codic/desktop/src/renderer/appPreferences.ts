export const DEFAULT_APP_ZOOM = 1.3

export function getInitialAppZoom(savedZoom: string | null): number {
  if (savedZoom === null || savedZoom.trim() === '') return DEFAULT_APP_ZOOM
  const value = Number(savedZoom)
  return Number.isFinite(value) && value >= 0.75 && value <= 1.5 ? value : DEFAULT_APP_ZOOM
}

export function placeComposerPopover(
  anchor: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>,
  viewport: { width: number; height: number },
  desiredWidth: number,
  desiredHeight: number,
) {
  const margin = Math.max(0, Math.min(12, viewport.width / 2, viewport.height / 2))
  const width = Math.max(0, Math.min(desiredWidth, Math.max(0, viewport.width - margin * 2)))
  const height = Math.max(0, Math.min(desiredHeight, Math.max(0, viewport.height - margin * 2)))
  const above = anchor.top - height - 8
  const canPlaceAbove = above >= margin
  const below = anchor.bottom + 8
  const top = canPlaceAbove ? above : Math.max(margin, Math.min(below, Math.max(margin, viewport.height - height - margin)))
  const left = Math.max(margin, Math.min(anchor.left, Math.max(margin, viewport.width - width - margin)))
  return { top, left, width, maxHeight: height }
}
