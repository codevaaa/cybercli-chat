/** Local-only preview shortcuts must never be baked into packaged builds. */
export function isLocalPreviewEnabled(command: 'build' | 'serve', configuredValue: string | undefined): boolean {
  return command === 'serve' && configuredValue === 'true'
}
