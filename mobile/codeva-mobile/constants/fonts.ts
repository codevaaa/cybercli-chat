/** Inter font family — professional typography across the app. */
export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
}

/** Map a numeric/string fontWeight to the matching Inter family. */
export function fontFamily(weight?: string | number): string {
  const w = String(weight || '400')
  if (w === '700' || w === '800' || w === 'bold') return Fonts.bold
  if (w === '600') return Fonts.semibold
  if (w === '500') return Fonts.medium
  return Fonts.regular
}
