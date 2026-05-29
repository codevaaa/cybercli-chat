# 🔬 Deep Research: CyberCli Desktop App (Claude Desktop Clone)

## 📋 Executive Summary

Based on deep analysis of Claude Desktop (Electron-based app for macOS/Windows/Linux) and the current CyberCli web platform, this document outlines the complete architecture, feature set, and implementation plan for building a CyberCli Desktop App that is a **full-featured alternative** to Claude Desktop — with our own AI gateway, branding, and unique features.

---

## 1️⃣ Claude Desktop Analysis

### What Claude Desktop Actually Is
- **Framework**: Electron (Chromium + Node.js runtime)
- **Platforms**: macOS (universal .dmg), Windows (.exe installer), Linux (AppImage)
- **Architecture**: Single-window app with persistent sidebar, chat history, model switching
- **Key Features**:
  - **Global Shortcut**: `Ctrl+Alt+Space` to invoke anywhere
  - **Menu Bar Icon**: System tray / menubar integration
  - **Local MCP Server**: "Claude Code" runs as local server for file system access
  - **File Attachments**: Drag-drop files, images
  - **Artifacts**: Side-by-side code editor output
  - **Cowork**: Background task execution
  - **VS Code Extension**: Deep IDE integration
  - **Chrome Extension**: Browser integration

### Claude Desktop Screens (from your screenshots)

| Screen | Elements | Purpose |
|--------|----------|---------|
| **Landing** | Asterisk logo, "Claude for Windows", "Get started" button | First launch, prompts login |
| **Sign In** | "Sign In" title, Google OAuth, Email input, "Continue with email" | Authentication |
| **Onboarding** | "Quickly chat to Claude in a few taps", global shortcut toggle, menu bar toggle, "Continue" button | Post-login setup |
| **Main Chat** | Left sidebar (chats, projects, artifacts, customize), "Back at it, {name}" welcome, input box, model selector (Sonnet 4.6), quick actions (Write, Learn, Code, Life stuff, Claude's choice) | Primary interface |

---

## 2️⃣ Current CyberCli Architecture

### Website (`frontend/`)
- **Tech**: React 19 + Vite + TailwindCSS v4 + Framer Motion
- **Auth**: Supabase Auth (JWT)
- **Chat**: Full-featured with 30+ models, streaming, artifacts, voice, image gen, daemon actions
- **Pages**: Home, Features, Models, Pricing, Downloads, Docs, Blog, etc.

### CLI (`cybercoder/packages/cli/`)
- **Tech**: Ink (React for terminal) + Node.js
- **Auth**: Config file persistence
- **Chat**: Terminal-based with slash commands

### Backend
- **API**: Express + SSE streaming
- **AI Gateway**: 8+ providers (OpenRouter, Groq, Gemini, Cerebras, etc.)
- **DB**: Supabase PostgreSQL + MongoDB Atlas

---

## 3️⃣ Desktop App Architecture Plan

### Recommended Tech Stack

```
CyberCli Desktop/
├── packages/
│   ├── desktop/              ← NEW: Electron app
│   │   ├── src/
│   │   │   ├── main/         ← Main process (Node.js)
│   │   │   │   ├── index.ts  ← Entry point, window mgmt
│   │   │   │   ├── tray.ts   ← System tray / menubar
│   │   │   │   ├── shortcuts.ts  ← Global shortcuts
│   │   │   │   ├── mcp-server.ts ← Local MCP server for file access
│   │   │   │   └── deeplink.ts   ← protocol handlers (cybercli://)
│   │   │   ├── preload/      ← Preload scripts (bridge)
│   │   │   │   └── index.ts  ← IPC API exposure
│   │   │   └── renderer/     ← React app (same as web!)
│   │   │       ├── App.tsx   ← Desktop-specific routing
│   │   │       ├── windows/
│   │   │       │   ├── LandingWindow.tsx     ← "Get started"
│   │   │       │   ├── LoginWindow.tsx        ← Sign In
│   │   │       │   ├── OnboardingWindow.tsx   ← Setup shortcuts
│   │   │       │   └── ChatWindow.tsx         ← Main chat (reuses web ChatPage)
│   │   │       └── components/
│   │   │           ├── TitleBar.tsx          ← Custom window chrome
│   │   │           ├── Sidebar.tsx           ← Desktop sidebar
│   │   │           └── GlobalShortcutHint.tsx ← Shortcut toast
│   │   ├── electron-builder.yml  ← Build config for .dmg, .exe, .AppImage
│   │   ├── package.json
│   │   └── vite.renderer.config.ts
│   └── shared/               ← Already exists (version, types)
├── frontend/                 ← Existing web app (renderer reuses this)
└── backend/                  ← Existing API server
```

### Why Electron?

| Criteria | Electron | Tauri | Native |
|----------|----------|-------|--------|
| Reuse web code | ✅ 100% | ⚠️ Rust needed | ❌ Rewrite |
| Cross-platform | ✅ Win/Mac/Linux | ✅ | ❌ Per-platform |
| System integration | ✅ (tray, shortcuts, fs) | ✅ | ✅ |
| Install size | ~150MB | ~5MB | ~10MB |
| Dev speed | ✅ Fast | ⚠️ Mixed | ❌ Slow |
| Claude uses it | ✅ Yes | ❌ No | ❌ No |

**Verdict**: Electron is the correct choice because:
1. We can **reuse 95% of our existing React frontend code**
2. Claude Desktop uses it (proven at scale)
3. Node.js ecosystem for file system / shell access
4. electron-builder handles all packaging (.dmg, .exe, .AppImage)

---

## 4️⃣ Feature Parity: Claude Desktop vs CyberCli Desktop

### Authentication Flow

| Feature | Claude | CyberCli Desktop Plan |
|---------|--------|----------------------|
| Landing screen | "Claude for Windows" + Get started | "CyberCli for Windows/macOS/Linux" + Get started |
| Sign In | Google OAuth, Email magic link | **Same** — Supabase Auth with Google + Email |
| Onboarding | Global shortcut, Menu bar icon, Continue | Same flow + **CLI integration setup** |
| Auto-login | Remembers session | Same — Supabase persistent session |

### Main Chat Interface

| Feature | Claude | CyberCli Desktop Plan |
|---------|--------|----------------------|
| Sidebar | Chats, Projects, Artifacts, Customize | **Same** — reuse existing sidebar from ChatPage |
| Welcome | "Back at it, {name}" | Same — personalized welcome |
| Input | Text, voice, file attach, model select | **Same + more** — drag-drop files, code execution |
| Quick Actions | Write, Learn, Code, Life stuff | **Same** — already implemented |
| Model Selector | Sonnet, Opus, Haiku | **Better** — 30+ models including uncensored |
| Streaming | Yes | ✅ Already works |
| Code blocks | Syntax highlight | ✅ Already works |
| Artifacts | Side panel | ✅ Already works |
| Voice mode | Yes | ✅ Already implemented |
| Image gen | No | ✅ CyberCli has this |
| Daemon actions | No | ✅ Local file read/write/exec |

### System Integration

| Feature | Claude | CyberCli Desktop Plan |
|---------|--------|----------------------|
| Global shortcut | `Ctrl+Alt+Space` | `Ctrl+Alt+C` or customizable |
| Menu bar icon | Yes | Yes (Electron Tray) |
| Window management | Minimize to tray, always-on-top | Same |
| File drop | Drag files into chat | Same + auto-detect code files |
| Notifications | Desktop notifications | Yes (Electron Notification API) |
| Deep links | `claude://` protocol | `cybercli://` protocol |
| Auto-update | Built-in | electron-updater |

### Unique CyberCli Desktop Features (Beyond Claude)

1. **Built-in CLI Panel**: Bottom panel with integrated terminal (like VS Code)
2. **Local Model Support**: Run Ollama models locally without internet
3. **Workspace Daemon**: Already implemented — file read/write/exec
4. **Image Generation**: Built-in, no extra service
5. **Council Mode**: Multi-model voting
6. **Code Execution**: Run JS/Python code in sandbox
7. **Browser Redirection**: `cybercli://login?token=xyz` deep links

---

## 5️⃣ Download Page Redesign Plan

### Current State
`DownloadsPage.jsx` — has 3 cards (Mac, Windows, Linux) + mobile waitlist + npm install

### Claude Download Page Analysis
- Clean sectioned layout: Get Started → Desktop → Mobile → Go Further → Cowork → Code
- Each platform has direct download links (not buttons — actual file URLs)
- Enterprise deployment links
- FAQ section at bottom

### Proposed CyberCli Download Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│  🔶 Download CyberCli                                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Get Started                                         │   │
│  │  Access all of CyberCli on desktop and mobile.     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   🍎 macOS   │  │   🪟 Windows │  │   🐧 Linux   │        │
│  │   Download   │  │   Download   │  │   Download   │        │
│  │   .dmg       │  │   .exe       │  │  .AppImage   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Mobile (iOS & Android) — Coming Soon                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Go Further                                          │   │
│  │  • VS Code Extension                                 │   │
│  │  • Chrome Extension                                  │   │
│  │  • CLI (npm install)                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FAQ                                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 6️⃣ Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `packages/desktop/` Electron scaffold
- [ ] Setup electron-builder for .exe, .dmg, .AppImage
- [ ] Create main process (window management, tray, shortcuts)
- [ ] Create preload script (secure IPC bridge)
- [ ] Load existing frontend as renderer

### Phase 2: Auth & Onboarding (Week 2)
- [ ] Landing window ("CyberCli for {platform}")
- [ ] Login window (reuse web login components)
- [ ] Onboarding modal (shortcuts, tray, continue)
- [ ] Session persistence via Supabase
- [ ] Deep link protocol (`cybercli://login?token=`)

### Phase 3: Chat Integration (Week 3)
- [ ] Load ChatPage as main window
- [ ] Desktop sidebar (adapted from web sidebar)
- [ ] Title bar (custom window chrome)
- [ ] File drag-drop into chat
- [ ] System notifications

### Phase 4: System Integration (Week 4)
- [ ] Global shortcut (`Ctrl+Alt+C`)
- [ ] System tray / menubar icon
- [ ] Auto-updater (electron-updater)
- [ ] Native menu (File, Edit, View, Help)
- [ ] Window state persistence

### Phase 5: Advanced Features (Week 5-6)
- [ ] Built-in terminal panel
- [ ] Local MCP server for file system
- [ ] VS Code extension (publish to marketplace)
- [ ] Chrome extension
- [ ] Code signing (Windows, macOS)

### Phase 6: Download Page & Launch (Week 7)
- [ ] Redesign DownloadsPage.jsx
- [ ] Add actual download links (S3/CloudFront hosting)
- [ ] Auto-detect OS and highlight correct download
- [ ] Add enterprise deployment docs
- [ ] FAQ section
- [ ] Analytics on downloads

---

## 7️⃣ New Repository Structure

### Option A: New Repo (Recommended for Desktop)
```
GitHub: stilcybermindcli/cybercli-desktop
├── packages/
│   ├── desktop/       ← Electron app
│   ├── shared/        ← Shared types/utils (submodule or copy)
│   └── extensions/    ← VS Code + Chrome extensions
├── .github/workflows/ ← Build & release automation
└── README.md
```

### Option B: Monorepo (Add to existing cybercli-chat)
```
cybercli-chat/
├── frontend/          ← Web app (existing)
├── backend/           ← API (existing)
├── cybercoder/        ← CLI (existing submodule)
├── desktop/           ← NEW: Electron app
│   ├── src/
│   ├── electron-builder.yml
│   └── package.json
└── package.json       ← Root workspace
```

**Recommendation**: Start with Option B (monorepo) for faster iteration, then split if needed. The desktop app will import components from `frontend/src/`.

---

## 8️⃣ Technical Deep Dive

### IPC Communication (Main ↔ Renderer)

```typescript
// preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // System
  platform: process.platform,
  versions: process.versions,
  
  // Window
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  
  // Tray
  setTrayTooltip: (text: string) => ipcRenderer.send('tray:set-tooltip', text),
  
  // Shortcuts
  registerGlobalShortcut: (shortcut: string, cb: () => void) => 
    ipcRenderer.on('shortcut:triggered', cb),
  
  // Files
  readFile: (path: string) => ipcRenderer.invoke('fs:read', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:write', path, content),
  
  // Deep links
  onDeepLink: (cb: (url: string) => void) => 
    ipcRenderer.on('deeplink', (_, url) => cb(url)),
})
```

### Global Shortcut Implementation

```typescript
// main/shortcuts.ts
import { globalShortcut, BrowserWindow } from 'electron'

export function registerShortcuts(mainWindow: BrowserWindow) {
  // Toggle window visibility
  globalShortcut.register('CommandOrControl+Alt+C', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  
  // Quick new chat
  globalShortcut.register('CommandOrControl+Alt+N', () => {
    mainWindow.show()
    mainWindow.webContents.send('shortcut:new-chat')
  })
}
```

### Auto-Update Flow

```
1. App checks GitHub releases API on startup
2. If new version found → show "Update available" toast
3. User clicks "Update" → download in background
4. Download complete → "Restart to update" button
5. On restart → new version runs automatically
```

### File Protocol Handler

```typescript
// In website: login success redirects to cybercli://auth?token=xyz
// In desktop: protocol handler catches this

app.setAsDefaultProtocolClient('cybercli')

app.on('open-url', (event, url) => {
  if (url.startsWith('cybercli://auth')) {
    const token = new URL(url).searchParams.get('token')
    mainWindow.webContents.send('auth:token', token)
  }
})
```

---

## 9️⃣ Branding & UI/UX Guidelines

### Desktop App Identity

| Element | Specification |
|---------|--------------|
| App Name | "CyberCli" |
| Icon | Same asterisk/sparkle logo (adapted for .ico, .icns, .png) |
| Colors | Same palette: `#D97757` accent, `#0A0A0F` background |
| Window | Frameless on macOS, native frame on Windows/Linux |
| Font | Inter (same as web) |
| Title Bar | Custom on macOS (traffic light buttons), native on Win |

### Window States

| State | Behavior |
|-------|----------|
| First launch | Landing window (centered, fixed size 400x500) |
| Not logged in | Login window (centered, 440x520) |
| Logged in | Chat window (maximized or last size) |
| Close button | Hide to tray (not quit) |
| Tray click | Show/hide main window |
| Global shortcut | Toggle visibility |

---

## 🔟 Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large install size (~150MB) | Medium | Use asar compression, lazy load chunks |
| Code signing costs ($200-400/yr) | Low | Start unsigned, add later |
| macOS notarization delay | Low | Build unsigned for beta |
| Web code not desktop-ready | Medium | Gradual refactor, IPC abstraction |
| Security (nodeIntegration) | High | ContextIsolation + preload only |
| Auto-update hosting | Low | Use GitHub releases (free) |

---

## 📊 Effort Estimate

| Phase | Duration | Developer Effort |
|-------|----------|-----------------|
| Phase 1: Foundation | 1 week | 40 hrs |
| Phase 2: Auth & Onboarding | 1 week | 40 hrs |
| Phase 3: Chat Integration | 1 week | 40 hrs |
| Phase 4: System Integration | 1 week | 40 hrs |
| Phase 5: Advanced Features | 2 weeks | 80 hrs |
| Phase 6: Download Page & Launch | 1 week | 40 hrs |
| **Total** | **7 weeks** | **280 hrs (~2 months)** |

---

## ✅ Next Steps

1. **Create new repo** `cybercli-desktop` or add `desktop/` folder to existing monorepo
2. **Scaffold Electron app** with Vite + React + TypeScript
3. **Import existing frontend components** as renderer
4. **Implement landing/login/onboarding windows**
5. **Build chat integration** reusing ChatPage.jsx
6. **Add system integration** (tray, shortcuts, notifications)
7. **Setup CI/CD** for automated builds (.exe, .dmg, .AppImage)
8. **Redesign DownloadsPage** with real download links
9. **Beta test** with existing users
10. **Publish** to GitHub releases + website

---

*Research completed. Ready to begin implementation.*
