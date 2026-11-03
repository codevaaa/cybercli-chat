const STYLES = new Set(['concise', 'balanced', 'detailed'])
const LANGUAGES = new Set(['auto', 'en', 'hi'])

/** Convert editor-facing preference enums into stable, non-user-authored guidance. */
export function assistantPreferenceInstructions(preferences = {}) {
  const style = STYLES.has(preferences.style) ? preferences.style : 'balanced'
  const language = LANGUAGES.has(preferences.language) ? preferences.language : 'auto'
  const styleInstruction = {
    concise: 'Keep the answer focused and brief while still answering the full request.',
    balanced: 'Use a clear, well-structured answer with enough detail to act on.',
    detailed: 'Explain the reasoning and steps thoroughly, using clear structure and examples when useful.',
  }[style]
  const languageInstruction = {
    auto: 'Reply in the language used by the user.',
    en: 'Reply in English.',
    hi: 'Reply in Hindi. Keep code, command names, and technical identifiers unchanged.',
  }[language]
  return `\n\n[EDITOR RESPONSE PREFERENCES]\n${styleInstruction}\n${languageInstruction}`
}

export { STYLES as RESPONSE_STYLES, LANGUAGES as RESPONSE_LANGUAGES }
