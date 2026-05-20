export function estimateTokens(text) {
  if (!text) return 0
  // Rough estimation: ~4 characters per token for English
  return Math.ceil(text.length / 4)
}

export function countMessageTokens(messages) {
  if (!Array.isArray(messages)) return 0
  return messages.reduce((total, msg) => {
    const contentTokens = estimateTokens(msg.content)
    // Add overhead for role and formatting (~4 tokens per message)
    return total + contentTokens + 4
  }, 0)
}
