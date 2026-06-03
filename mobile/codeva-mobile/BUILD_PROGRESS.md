# Codeva Mobile — Build Checklist

Pure chat app (no code editor) — Claude + ChatGPT feature parity.
Cross-platform (Android + iOS) on Expo SDK 52. Free models: Groq + Gemini.

## Core Chat
- [x] Chat interface (home) — model picker, history drawer, composer
- [x] Markdown rendering (bold, code blocks, lists, headings, links, blockquotes)
- [x] Tables rendering (horizontal scroll, styled header/body)
- [x] Code block with copy button
- [x] Message actions (copy, read aloud, share, regenerate)
- [x] Image attachments in chat (vision via Gemini)
- [x] File attachments (document picker)
- [x] Streaming with stop
- [x] Conversation persistence (AsyncStorage, survives restart)
- [x] Individual chat delete (trash icon + confirm)
- [x] Regenerate response

## Voice (like ChatGPT/Claude voice mode)
- [x] Speech-to-text (Web Speech API on web; expo-speech-recognition on native dev build)
- [x] Text-to-speech (expo-speech, read responses aloud)
- [x] Full voice-to-voice conversation loop (listen → respond → listen)
- [x] Mic button directly in chat header

## Vision
- [x] Camera capture → vision model (via Composer + expo-image-picker)
- [x] Gallery image → vision model
- [x] Graceful permission popups (Settings deep-link on denial)

## Advanced (beyond ChatGPT)
- [x] Council Mode (multi-model consensus + synthesis)
- [x] Projects (real, persisted workspaces with custom instructions)
- [x] Web search in chat (keyless DuckDuckGo)
- [x] Discover — specialized agents (system-prompt presets)

## Settings
- [x] Providers (BYOK keys — Groq + Gemini, stored on device)
- [x] Model selection
- [x] Voice settings (read aloud, haptics)
- [x] Memory / clear data
- [x] Privacy Policy + Terms links (open real URLs)
- [x] Sign out

## Auth
- [x] Email/password (Supabase)
- [x] Google OAuth (web redirect + native in-app browser)
- [x] Forgot password (reset email)
- [x] T&C gate — required before any login/signup
- [x] New + returning user redirection (index → landing/login/app)
- [x] Animated Sudarshan Chakra logo (matches website)

## Production hardening
- [x] App-wide ErrorBoundary (no more white-screen on render errors)
- [x] Inter font loaded safely (defaultProps, no render monkey-patch)
- [x] No emojis in UI — professional Lucide vector icons everywhere
- [x] Anti-jailbreak / prompt-injection system prompt
- [x] OTA update checker (expo-updates, native only)
- [x] app.json: store permission strings, adaptive icon, updates, runtimeVersion
- [x] eas.json: development / preview / production profiles
- [x] tsc --noEmit clean · web bundle compiles (2598 modules)

## Plan / billing
- [x] All free for now — plan shows "FREE" cleanly, no Stripe wired
- [ ] Real subscription tiers (planned 1–2 months out)

## Known environment notes
- Node 24 is newer than Expo SDK 52 targets. Web dev works; the final
  Android `.aab` (EAS build) should run on Node 20 LTS.
- Native voice STT needs a dev build (not Expo Go).
- Set `extra.eas.projectId` in app.json before the first `eas build`.
