/**
 * Codeva Extension — Prompt templates for each action.
 * Centralized so popup, sidepanel, content, and background stay consistent.
 */

export const PROMPTS = {
  grammar: (text) => `You are a professional editor. Check the following text for grammar, spelling, punctuation, and clarity issues.

Return your answer in this exact format:
**Corrected version:**
<the fully corrected text>

**Changes made:**
- <brief list of each fix, or "No errors found" if clean>

Text:
"""${text}"""`,

  rewrite_formal: (text) => `Rewrite the following text in a polished, formal, professional tone. Keep the original meaning. Return ONLY the rewritten text, no preamble.

"""${text}"""`,

  rewrite_casual: (text) => `Rewrite the following text in a friendly, casual, conversational tone. Keep the meaning. Return ONLY the rewritten text.

"""${text}"""`,

  rewrite_shorter: (text) => `Make the following text more concise while keeping all key information. Return ONLY the shortened text.

"""${text}"""`,

  rewrite_longer: (text) => `Expand and elaborate on the following text with more detail, examples, and context. Return ONLY the expanded text.

"""${text}"""`,

  fix_tone: (text) => `Rewrite this text with a clear, confident, professional tone suitable for business communication. Return ONLY the rewritten text.

"""${text}"""`,

  explain: (text) => `Explain the following clearly and simply, as if to a curious beginner. Use short paragraphs.

"""${text}"""`,

  summarize: (text) => `Summarize the following in 3-5 concise bullet points capturing the key ideas.

"""${text}"""`,

  translate: (text) => `Detect the language of the following text. If it is English, translate to Hindi. Otherwise translate to clear English. Provide ONLY the translation, then in a new line show "(detected: <language>)".

"""${text}"""`,

  define: (text) => `Define the term "${text}" clearly. Include: a one-line definition, a longer explanation, and one example sentence.`,

  explain_code: (text) => `Explain this code step by step. Cover what it does, key logic, and any issues or improvements.

\`\`\`
${text}
\`\`\``,

  improve_code: (text) => `Improve this code for performance, readability, and best practices. Show the improved version in a code block, then a short bullet list of what changed.

\`\`\`
${text}
\`\`\``,

  debug_code: (text) => `Analyze this code for bugs, edge cases, and security issues. List each finding with severity (Critical/High/Medium/Low) and the fix.

\`\`\`
${text}
\`\`\``,

  convert_code: (text) => `Convert this code to another popular language (if it's Python → JavaScript, if JavaScript → Python, otherwise → Python). Show the equivalent code in a code block.

\`\`\`
${text}
\`\`\``,

  summarize_page: (content) => `Summarize this webpage in 5-7 bullet points, capturing the main ideas and any key takeaways.

${content.slice(0, 6000)}`,

  key_points: (content) => `Extract the 5 most important key points from this page. Number them.

${content.slice(0, 6000)}`,

  ask_page: (content, question) => `Based on this webpage content, answer the question.

Question: ${question}

Page content:
${content.slice(0, 6000)}`,

  security: (url) => `Provide a security analysis checklist for the site at ${url}. Cover: recommended security headers (HSTS, CSP, X-Frame-Options), cookie flags, CORS best practices, and common misconfigurations to check for. Be specific and actionable.`,
}

// Action metadata for UI rendering
export const ACTIONS = [
  { id: 'grammar',         label: 'Fix Grammar',    icon: 'spellcheck', group: 'write', promptKey: 'grammar' },
  { id: 'rewrite_formal',  label: 'Make Formal',    icon: 'wand',       group: 'write', promptKey: 'rewrite_formal' },
  { id: 'rewrite_casual',  label: 'Make Casual',    icon: 'wand',       group: 'write', promptKey: 'rewrite_casual' },
  { id: 'rewrite_shorter', label: 'Shorten',        icon: 'scissors',   group: 'write', promptKey: 'rewrite_shorter' },
  { id: 'rewrite_longer',  label: 'Expand',         icon: 'expand',     group: 'write', promptKey: 'rewrite_longer' },
  { id: 'explain',         label: 'Explain',        icon: 'lightbulb',  group: 'learn', promptKey: 'explain' },
  { id: 'summarize',       label: 'Summarize',      icon: 'list',       group: 'learn', promptKey: 'summarize' },
  { id: 'translate',       label: 'Translate',      icon: 'globe',      group: 'learn', promptKey: 'translate' },
  { id: 'explain_code',    label: 'Explain Code',   icon: 'code',       group: 'code',  promptKey: 'explain_code' },
  { id: 'improve_code',    label: 'Improve Code',   icon: 'code',       group: 'code',  promptKey: 'improve_code' },
]
