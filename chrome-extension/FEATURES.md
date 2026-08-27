# Codeva Extension — Feature Map & Roadmap

This document maps every Grammarly + Claude feature and how Codeva combines them,
plus a roadmap of what to build next to make the extension irresistible.

## How Grammarly Works (and what we replicate)

| Grammarly Feature | How it works | Codeva status |
|---|---|---|
| Floating circular badge in text fields | Anchored to bottom-right of focused input; shows issue count | ✅ Done (`.cv-fab`) |
| Real-time underlines | Debounced check as you type, colored by error type | ✅ Card-based (fab → card) |
| One-click fixes | Click suggestion → text replaced in place | ✅ `applyFix` / `Fix all` |
| Tone detection | Classifies tone (formal, confident, friendly) | 🔜 Add tone chip in card |
| Goals (audience/formality) | User sets writing goals | 🔜 Options page settings |
| Weekly writing stats | Emails progress reports | 🔜 Backend usage aggregation |
| Plagiarism / AI detection | Compares against corpus | ❌ Out of scope |

## How Claude / ChatGPT Extensions Work (and what we replicate)

| Feature | How it works | Codeva status |
|---|---|---|
| Side panel chat | Persistent chat alongside any page | ✅ Done (`sidepanel`) |
| Page context Q&A | Extracts page text → feeds model | ✅ `GET_PAGE_CONTENT` |
| Summarize / explain selection | Context menu + toolbar | ✅ Done |
| Model picker | Choose model per message | ✅ `#sp-model` |
| Streaming responses | SSE token streaming | ✅ `streamCompletion` |
| Conversation memory | Keeps last N turns | ✅ `messages.slice(-12)` |

## The Codeva Combination (our edge)

Codeva = **Grammarly writing intelligence** + **Claude reasoning** + **security tooling**,
all free with one login. Unique differentiators:

1. **Security actions** — scan headers/CORS/cookies from the browser (no competitor does this)
2. **Code intelligence** — explain / improve / debug / convert on GitHub, StackOverflow, anywhere
3. **Multi-model routing** — grammar uses a fast model, reasoning uses a strong one, automatically
4. **One account** — same login as the web app, CLI, and desktop

## Architecture Framework

```
┌─────────────────────────────────────────────┐
│  Content Script (self-contained, per page)   │
│  • Floating grammar FAB + suggestion card     │
│  • Selection toolbar                          │
│  • Page text extraction                       │
│  • Auth token capture on cybermindcli.info    │
└───────────────┬───────────────────────────────┘
                │ chrome.runtime messages
┌───────────────▼───────────────────────────────┐
│  Background Service Worker                     │
│  • Context menus → prompts                     │
│  • Auth storage + badge                        │
│  • Opens side panel with queued prompt         │
└───────────────┬───────────────────────────────┘
                │ chrome.storage + messages
┌───────────────▼───────────────────────────────┐
│  Extension Pages (ES modules)                  │
│  • Popup: quick actions + mini chat            │
│  • Side panel: full streaming chat             │
│  • Options: feature toggles                    │
│  • Shared libs: config.js, prompts.js, icons.js│
└───────────────┬───────────────────────────────┘
                │ HTTPS (Bearer token)
┌───────────────▼───────────────────────────────┐
│  Codeva Backend (cybercli-api.onrender.com)    │
│  • /completions (SSE streaming)                │
│  • /auth/me (token verify)                     │
│  • CORS now allows chrome-extension://          │
└─────────────────────────────────────────────────┘
```

## Roadmap — 15 ideas to make people love it

1. **Tone chip** — show detected tone in the grammar card ("Sounds: Confident")
2. **Inline underlines** — real red/blue underlines in contentEditable (overlay layer)
3. **Writing goals** — set audience/formality in options, feed into every rewrite
4. **Smart compose** — ghost-text autocomplete as you type (Tab to accept)
5. **Reply generator** — on Gmail/LinkedIn, suggest full replies from thread context
6. **Screenshot → Vision** — capture region, send to Gemini Vision for analysis
7. **PDF reader** — summarize/query PDFs opened in the browser
8. **YouTube summarizer** — pull transcript → TL;DR + timestamps
9. **Prompt library** — saved reusable prompts, slash-triggered (`/email`, `/blog`)
10. **Multi-language grammar** — Hindi, Spanish, French grammar checking
11. **Citation finder** — generate APA/MLA citations for the current page
12. **Meeting notes** — capture selected transcript → action items
13. **Diff view** — show original vs rewritten side-by-side before applying
14. **Usage dashboard** — mini stats in popup (words improved, prompts run)
15. **Team snippets** — shared prompt templates for organizations

## Testing checklist

- [ ] Sign in on cybermindcli.info → extension badge dot disappears
- [ ] Focus any textarea → floating icon appears bottom-right
- [ ] Type text with an error → icon turns red with count after ~1.4s
- [ ] Click icon → suggestion card with Apply / Fix all
- [ ] Select text on any page → toolbar appears → click action → side panel opens with response
- [ ] Right-click selection → Codeva AI menu → action runs
- [ ] Popup quick actions work on selected text
- [ ] Side panel streaming works and model picker switches models
- [ ] Ctrl+Shift+S opens side panel, Ctrl+Shift+G triggers grammar
