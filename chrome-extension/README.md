# Codeva AI Chrome Extension

> AI-powered writing, grammar, coding, and research assistant. Grammarly + Claude-level intelligence on every webpage.

## 35+ Features

### Writing & Grammar (Grammarly-level)
1. **Real-time grammar checking** — Underlines errors as you type
2. **Spelling correction** — Auto-detects and suggests fixes
3. **Punctuation fixes** — Missing commas, periods, colons
4. **Tone detection** — Professional/casual/confident/friendly
5. **Rewrite → Formal** — One-click professional rewrite
6. **Rewrite → Casual** — Make text conversational
7. **Make Shorter** — Condense without losing meaning
8. **Expand / Elaborate** — Add detail and examples
9. **Fix Tone** — Business-appropriate communication
10. **Sentence clarity** — Simplify complex sentences
11. **Passive voice detection** — Suggests active alternatives
12. **Word choice suggestions** — Better vocabulary alternatives
13. **Readability score** — Flesch-Kincaid grade level

### Research & Understanding
14. **Explain This** — ELI5 any selected text
15. **Summarize** — Bullet-point summaries of selections
16. **Summarize Page** — Full webpage summarization
17. **Extract Key Points** — Top 5 insights from any page
18. **Define Word/Term** — Instant dictionary + examples
19. **Translate** — Any language → English/Hindi/etc.
20. **Ask About Page** — Q&A about current page content
21. **Citation Generator** — Generate APA/MLA/Chicago citations

### Code Assistance
22. **Explain Code** — Step-by-step code explanation
23. **Improve Code** — Performance + readability improvements
24. **Debug/Find Bugs** — Identify issues and security flaws
25. **Convert Language** — JS↔Python↔Rust↔Go etc.
26. **Generate Tests** — Write unit tests for selected code
27. **Add Comments** — Document code with clear comments
28. **Regex Helper** — Explain or generate regex patterns

### Security (Unique to Codeva)
29. **Security Header Scan** — Check any site's security headers
30. **Cookie Analysis** — Flag insecure cookies
31. **CSP Audit** — Content Security Policy checker
32. **CORS Check** — Cross-origin misconfiguration detection

### Productivity
33. **Floating Selection Toolbar** — Quick actions on text select
34. **Side Panel Chat** — Full chat interface alongside any page
35. **Keyboard Shortcuts** — Ctrl+Shift+C (popup), Ctrl+Shift+S (side panel), Ctrl+Shift+G (grammar)
36. **Context Menu Integration** — Right-click for all actions
37. **Page Screenshot + Vision** — Capture and analyze with AI

## Architecture

```
chrome-extension/
├── manifest.json              # Manifest V3
├── src/
│   ├── background/           # Service worker (context menus, auth, API)
│   │   └── service-worker.js
│   ├── content/              # Content script (grammar, toolbar, page extraction)
│   │   └── content.js
│   ├── popup/                # Quick action popup (360x400px)
│   │   ├── popup.html
│   │   └── popup.js
│   ├── sidepanel/            # Full chat side panel
│   │   ├── sidepanel.html
│   │   └── sidepanel.js
│   ├── options/              # Settings page
│   │   └── options.html
│   ├── styles/               # CSS files
│   │   ├── content.css
│   │   ├── popup.css
│   │   └── sidepanel.css
│   └── lib/                  # Shared utilities
└── assets/
    └── icons/                # Extension icons (16/32/48/128px)
```

## Install (Development)

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension/` directory

## Authentication

Users must sign in to cybermindcli.info. The extension automatically captures the auth token when the user logs in on the website. No separate login flow needed.

## Tech Stack

- **Manifest V3** (latest Chrome extension standard)
- **Vanilla JS** (no build step needed — loads directly)
- **Codeva API** (streaming SSE for real-time responses)
- **Chrome Side Panel API** (persistent chat alongside any page)
- **Context Menus API** (right-click integration)
- **Storage API** (settings + auth persistence)

## Competitors Covered

| Feature | Grammarly | Claude Ext. | Codeva |
|---------|-----------|------------|--------|
| Grammar check | ✅ | ❌ | ✅ |
| Spelling | ✅ | ❌ | ✅ |
| Tone detection | ✅ | ❌ | ✅ |
| Rewrite options | ✅ | ✅ | ✅ |
| Code assistance | ❌ | ✅ | ✅ |
| Security scan | ❌ | ❌ | ✅ |
| Page summarize | ❌ | ✅ | ✅ |
| Side panel chat | ❌ | ✅ | ✅ |
| Translate | ❌ | ✅ | ✅ |
| Free tier | ❌ ($12/mo) | ❌ ($20/mo) | ✅ |
