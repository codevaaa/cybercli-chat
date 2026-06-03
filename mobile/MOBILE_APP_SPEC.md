# Codeva Mobile App — Full Orchestral Spec

_Cross-platform (Android + iOS) AI chat application. Same-to-same as Claude's mobile app + our unique advantages._

---

## 1. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **React Native + Expo SDK 55** | Cross-platform, single codebase, PlayStore/AppStore ready |
| Routing | **Expo Router v4** (file-based) | Same pattern as Next.js, easy navigation |
| State | **Zustand** | Lightweight, same as our web frontend |
| Styling | **NativeWind (TailwindCSS for RN)** | Same design tokens as website |
| AI Streaming | **Custom SSE client** | Direct provider streaming (BYOK) |
| Voice STT | **expo-speech-recognition** | On-device speech-to-text |
| Voice TTS | **expo-speech** + Puter.js ElevenLabs | Free unlimited TTS |
| Camera | **expo-camera** | Photo capture → vision models |
| Files | **expo-document-picker** | Upload PDFs, DOCX, images |
| Storage | **expo-secure-store** + MMKV | API keys secure, chat cache fast |
| Sync | **MongoDB Atlas** (existing backend) | Conversations sync across devices |
| Auth | **Supabase Auth** (existing) | Same auth as website |
| Push | **expo-notifications** | Background task completion alerts |
| Widgets | **expo-widgets** (Android) | Home screen quick actions |
| Build | **EAS Build** (free tier) | Cloud builds for both platforms |

---

## 2. App Architecture

```
mobile/
├── app/                          # Expo Router (file-based navigation)
│   ├── _layout.tsx               # Root layout (auth guard, theme, providers)
│   ├── index.tsx                 # Splash → redirect to chat or auth
│   ├── (auth)/                   # Auth flow (unauthenticated)
│   │   ├── _layout.tsx
│   │   ├── login.tsx             # Email + password login
│   │   ├── signup.tsx            # Create account
│   │   ├── forgot-password.tsx   # Password reset
│   │   └── magic-link.tsx        # Magic link login
│   ├── (tabs)/                   # Main app (authenticated, tab bar)
│   │   ├── _layout.tsx           # Tab bar layout
│   │   ├── index.tsx             # Chat list (recent conversations)
│   │   ├── discover.tsx          # Discover agents/skills
│   │   ├── projects.tsx          # Projects/workspaces
│   │   └── settings.tsx          # Settings & account
│   ├── chat/
│   │   ├── [id].tsx              # Individual chat thread (main chat UI)
│   │   └── new.tsx               # New chat (model picker + first message)
│   ├── voice.tsx                 # Full-screen voice mode
│   ├── camera.tsx                # Camera capture → AI analysis
│   ├── artifact/[id].tsx         # Full-screen artifact viewer
│   └── providers.tsx             # Provider setup (BYOK keys)
├── components/
│   ├── chat/
│   │   ├── MessageBubble.tsx     # User/assistant message rendering
│   │   ├── Composer.tsx          # Input bar (text + attachments + voice)
│   │   ├── ToolStep.tsx          # Collapsible tool execution step
│   │   ├── CodeBlock.tsx         # Syntax-highlighted code with copy
│   │   ├── DiffView.tsx          # Inline diff rendering
│   │   ├── ThinkingDots.tsx      # Bouncing dots animation
│   │   ├── ArtifactCard.tsx      # Inline artifact preview
│   │   └── ModelPicker.tsx       # Model selection bottom sheet
│   ├── voice/
│   │   ├── VoiceWaveform.tsx     # Audio visualization
│   │   ├── VoiceControls.tsx     # Mic, stop, speaker buttons
│   │   └── VoiceOverlay.tsx      # Full-screen voice UI
│   ├── artifacts/
│   │   ├── ArtifactRenderer.tsx  # WebView-based artifact display
│   │   ├── CodeArtifact.tsx      # Runnable code artifact
│   │   ├── MermaidArtifact.tsx   # Diagram rendering
│   │   └── MarkdownArtifact.tsx  # Rich document rendering
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Toast.tsx
│   │   └── LoadingSpinner.tsx
│   └── layout/
│       ├── Header.tsx            # Screen header with actions
│       ├── TabBar.tsx            # Custom tab bar
│       └── SafeArea.tsx          # Safe area wrapper
├── services/
│   ├── ai/
│   │   ├── engine.ts             # Multi-provider streaming engine
│   │   ├── providers/
│   │   │   ├── anthropic.ts      # Claude API streaming
│   │   │   ├── openai.ts         # OpenAI/GPT streaming
│   │   │   ├── groq.ts           # Groq (free, fast)
│   │   │   ├── gemini.ts         # Google Gemini streaming
│   │   │   └── codeva.ts         # Codeva cloud gateway
│   │   ├── council.ts            # Council Mode (multi-model consensus)
│   │   └── tools.ts              # Tool definitions for mobile
│   ├── voice/
│   │   ├── stt.ts                # Speech-to-text (expo-speech-recognition)
│   │   ├── tts.ts                # Text-to-speech (expo-speech + ElevenLabs)
│   │   └── voiceMode.ts          # Full voice conversation manager
│   ├── sync/
│   │   ├── conversationSync.ts   # Sync conversations with backend
│   │   ├── memorySync.ts         # Sync .cyber/ memory
│   │   └── offlineQueue.ts       # Queue messages when offline
│   ├── intents/
│   │   ├── sms.ts                # Draft/send SMS
│   │   ├── email.ts              # Draft/send email
│   │   ├── calendar.ts           # Create calendar events
│   │   ├── alarm.ts              # Set alarms/timers
│   │   ├── maps.ts               # Open locations
│   │   └── share.ts              # Share sheet integration
│   ├── cowork/
│   │   ├── backgroundTasks.ts    # Background task management
│   │   ├── dispatch.ts           # Task dispatch to backend
│   │   └── notifications.ts      # Push notifications for task completion
│   └── storage/
│       ├── secureStore.ts        # API keys (encrypted)
│       ├── chatCache.ts          # MMKV fast cache
│       └── preferences.ts        # User preferences
├── stores/
│   ├── authStore.ts              # Auth state (Supabase)
│   ├── chatStore.ts              # Active chat, messages, streaming
│   ├── settingsStore.ts          # Model, provider, preferences
│   └── voiceStore.ts             # Voice mode state
├── hooks/
│   ├── useStreaming.ts           # SSE streaming hook
│   ├── useVoice.ts               # Voice recording/playback
│   ├── useCamera.ts              # Camera capture
│   ├── useSync.ts                # Conversation sync
│   └── useTheme.ts               # Dark/light theme
├── constants/
│   ├── colors.ts                 # Design tokens (terracotta accent)
│   ├── models.ts                 # Available models list
│   └── config.ts                 # API URLs, feature flags
├── assets/
│   ├── fonts/                    # Inter, JetBrains Mono
│   ├── images/                   # App icon, splash, mascot
│   └── animations/               # Lottie animations
├── widgets/                      # Android home screen widgets
│   └── ChatWidget.tsx            # Quick chat widget
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
├── package.json
└── tsconfig.json
```

---

## 3. Screens & Pages (ALL — No Missing)

### Auth Flow:
1. **Login** — Email/password + Google OAuth + Magic Link
2. **Signup** — Create account with email verification
3. **Forgot Password** — Reset via email
4. **Magic Link** — Passwordless login

### Main App (Tab Bar):
5. **Chat List** (Home tab) — Recent conversations, search, new chat button
6. **Discover** (Tab 2) — Browse agents, skills, templates
7. **Projects** (Tab 3) — Workspaces with custom instructions + memory
8. **Settings** (Tab 4) — Account, providers, models, voice, theme

### Chat:
9. **Chat Thread** — Full conversation with streaming, tools, artifacts, diffs
10. **New Chat** — Model picker + first message + quick actions
11. **Voice Mode** — Full-screen voice conversation (speak ↔ listen)
12. **Camera** — Capture photo → send to AI for analysis

### Sub-screens:
13. **Artifact Viewer** — Full-screen interactive artifact (code, diagram, doc)
14. **Provider Setup** — Add API keys (Anthropic, OpenAI, Groq, Gemini)
15. **Model Picker** — Bottom sheet with all available models
16. **Account** — Plan, usage stats, billing
17. **Memory** — View/edit .cyber/ project memory
18. **Cowork Tasks** — Background tasks status + results
19. **Share Extension** — Receive shared text/images from other apps

---

## 4. Design System (Same as Claude Mobile)

### Colors:
```
Background:     #0F0F14 (dark), #FFFFFF (light)
Surface:        #1A1918 (dark), #F8F8F8 (light)
Elevated:       #222120 (dark), #FFFFFF (light)
Accent:         #C96442 (terracotta — our brand)
Accent Hover:   #D4714F
Text Primary:   #E8E4DE (dark), #191919 (light)
Text Muted:     #9A9590 (dark), #666666 (light)
Border:         rgba(255,255,255,0.07) (dark)
Success:        #4ADE80
Error:          #F87171
Purple:         #8B5CF6 (effort dots)
```

### Typography:
```
Font Family:    Inter (UI), JetBrains Mono (code)
Body:           15px / 1.5 line-height
Code:           13px / 1.5
Small:          12px
Header:         18px semibold
```

### Spacing:
```
Base unit:      4px
Padding:        16px (screens), 12px (cards)
Border radius:  12px (cards), 20px (composer), 8px (buttons)
```

### Animations:
```
Easing:         cubic-bezier(0.16, 1, 0.3, 1)
Duration:       150ms (micro), 300ms (transitions), 500ms (reveals)
```

---

## 5. AI Engine (Multi-Provider, Same as Extension)

### Supported Providers:
1. **Groq** — Free, fast (llama-3.3-70b-versatile) — DEFAULT for free users
2. **Google Gemini** — Free tier (gemini-2.0-flash) — vision capable
3. **Anthropic** — Claude Sonnet/Opus (BYOK)
4. **OpenAI** — GPT-4o/mini (BYOK)
5. **Codeva Cloud** — Our gateway (for subscribers)

### Streaming Protocol:
- SSE (Server-Sent Events) for all providers
- Token-by-token rendering
- Tool-calling loop (function calling)
- Abort controller for stop generation

### Council Mode:
- Send same prompt to 3+ models
- Collect responses
- Final synthesis model picks best answer
- Show individual model responses in expandable cards

---

## 6. Voice System

### Speech-to-Text:
- `expo-speech-recognition` (on-device, fast)
- Continuous listening mode for voice conversations
- Language detection (Hindi + English)

### Text-to-Speech:
- Primary: `expo-speech` (system TTS, free, offline)
- Premium: Puter.js ElevenLabs (natural voice, unlimited free)
- Voice selection (male/female, speed control)

### Voice Mode Flow:
1. User taps mic → starts listening
2. Speech transcribed in real-time (shown as text)
3. On silence/tap → send to AI
4. AI response streams → TTS reads aloud
5. User can interrupt (tap to stop)
6. Continuous conversation loop

---

## 7. Android System Integration

### Intents (via react-native-send-intent):
- **SMS**: Draft message → open Messages app
- **Email**: Draft email → open Gmail/email app
- **Calendar**: Create event → open Calendar
- **Alarm**: Set alarm/timer → open Clock
- **Maps**: Open location → Google Maps
- **Phone**: Dial number → Phone app

### Share Sheet:
- Register as share target
- Receive text, images, URLs from any app
- Auto-open chat with shared content as context

### Widgets (expo-widgets):
- **Quick Chat**: Text input → send → see response
- **Voice**: One-tap voice mode
- **Camera**: One-tap camera → AI analysis

### Notifications:
- Background task completion
- Cowork results ready
- New message in shared project

---

## 8. Backend Integration (Existing)

### Endpoints Used:
```
POST /api/v1/completions          — Codeva cloud streaming
POST /api/v1/chat/threads         — Create thread
GET  /api/v1/chat/threads         — List threads
GET  /api/v1/chat/threads/:id     — Get thread messages
POST /api/v1/chat/threads/:id/msg — Send message
POST /api/v1/auth/login           — Login
POST /api/v1/auth/signup          — Signup
GET  /api/v1/auth/me              — Current user
POST /api/v1/agent/cowork         — Background task
GET  /api/v1/agent/cowork/:id     — Task status
```

### Sync Strategy:
- Messages saved locally (MMKV) for instant display
- Background sync to MongoDB Atlas every 30s
- Conflict resolution: server wins (last-write-wins)
- Offline queue: messages queued when no internet, sent on reconnect

---

## 9. Build & Deploy

### Android:
```bash
eas build --platform android --profile production
# → Generates .aab file
# → Upload to Google Play Console
# → $25 one-time developer fee
```

### iOS (future):
```bash
eas build --platform ios --profile production
# → Generates .ipa file
# → Upload to App Store Connect
# → $99/year Apple Developer fee
```

### OTA Updates:
```bash
eas update --branch production
# → Push JS updates without re-publishing to stores
# → Users get updates on next app open
```

---

## 10. Implementation Phases

### Phase 1: Core Chat (Week 1)
- Expo project setup + navigation
- Auth flow (login/signup with Supabase)
- Chat list + chat thread UI
- Multi-provider streaming engine
- Message rendering (markdown, code blocks)
- Composer (text input + send)

### Phase 2: Rich Features (Week 2)
- Voice mode (STT + TTS)
- Camera integration (photo → vision AI)
- File upload (documents, images)
- Artifacts (WebView renderer)
- Tool steps (collapsible with timing)
- Inline diffs

### Phase 3: Platform Integration (Week 3)
- Android intents (SMS, email, calendar, alarm)
- Share sheet (receive from other apps)
- Home screen widgets
- Push notifications
- Offline mode + sync

### Phase 4: Advanced (Week 4)
- Council Mode
- Projects/workspaces
- Cowork (background tasks)
- Discover (agents/skills)
- Settings (full)
- Polish + testing

---

## 11. What We Have OVER Claude Mobile

| Feature | Claude | Codeva |
|---------|--------|--------|
| Free tier | Very limited (25 msgs) | Unlimited with Groq/Gemini |
| Providers | Anthropic only | 5+ providers |
| Council Mode | ❌ | ✅ 3+ models debate |
| Offline | ❌ | ✅ (cached responses) |
| Price | $20/month minimum | Free + optional $9.99 Pro |
| Open source | ❌ | Partially open |
| Custom agents | Limited | Full agent marketplace |
| Hindi voice | Basic | Native Hindi TTS |

---

## 12. PlayStore Listing Plan

**App Name:** Codeva — AI Chat & Code Assistant
**Package:** com.codeva.chat
**Category:** Productivity
**Rating:** Everyone
**Size:** ~25 MB (without bundled models)
**Min Android:** API 24 (Android 7.0)

**Description:**
"Free AI assistant powered by 8+ models. Chat, code, voice, camera, and automate — all in one app. Better than ChatGPT and Claude combined."

**Screenshots needed:** 5-8 (chat, voice, camera, artifacts, settings)
**Feature graphic:** 1024x500 banner

---

_This spec is the complete blueprint. Every screen, every feature, every integration is documented. Ready for implementation._
