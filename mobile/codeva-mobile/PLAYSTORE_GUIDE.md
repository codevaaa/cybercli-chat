# Codeva — Play Store Publish Guide (Step by Step)

## Phase 1: Google Developer Account Setup

### 1.1 Create a Google Play Developer Account
1. Go to [play.google.com/console/signup](https://play.google.com/console/signup)
2. Login with a Google account (use a dedicated business email, not personal)
3. Accept the Developer Distribution Agreement
4. Pay the **one-time $25 registration fee** (credit/debit card)
5. Fill in developer profile:
   - Developer name: `Codeva` (or your company name)
   - Email: support email (users see this)
   - Phone number: required for verification
   - Website: `https://cybermindcli.info`
6. Google verifies identity (takes 24–48 hours for new accounts)

### 1.2 Organization vs Individual
- **Individual**: faster approval, simpler. Good for indie/solo.
- **Organization**: needs a D-U-N-S number (free but takes ~1 week to get).
  Use this if you want "Codeva" as the developer name on the store.

---

## Phase 2: App Preparation (Before Build)

### 2.1 App Icons & Screenshots (REQUIRED by Play Store)

**App Icon:**
- Size: 512x512 px PNG (no alpha/transparency for Play Store listing)
- Must match the in-app icon
- Tool: Use Figma or [icon.kitchen](https://icon.kitchen) to generate

**Feature Graphic:**
- Size: 1024x500 px (landscape banner shown at top of store listing)
- Should have app name + tagline + dark theme preview

**Screenshots (minimum 2, recommended 4-8):**
- Phone: minimum 2 screenshots, size 1080x1920 or 1080x2400
- Take them from the running app (emulator or real device)
- Must show: chat, voice, model picker, discover

### 2.2 Store Listing Text

**App Name (max 30 chars):** `Codeva - AI Chat`

**Short Description (max 80 chars):**
`Free AI chat with Groq & Gemini. Voice, web search, council mode.`

**Full Description (max 4000 chars):**
```
Codeva brings the power of frontier AI models to your phone — completely free.

KEY FEATURES:
- Chat with Groq (Llama 3.3 70B) and Gemini 2.0 Flash
- Voice-to-voice conversations — speak naturally, get spoken responses
- Council Mode — multiple AI models debate for the best answer
- Built-in web search — get current information without leaving chat
- Professional Markdown rendering with tables and code blocks
- Image understanding — send photos for AI analysis
- Conversation history with search and individual delete
- Custom projects with persistent instructions
- Specialized AI agents (code review, writing, research, etc.)

PRIVACY & SECURITY:
- Your conversations stay on your device
- No data sold to third parties
- Optional BYOK (bring your own key) for direct API access
- Secure Supabase authentication

Built by Chandan Pandey. Free forever — premium plans coming soon.
```

### 2.3 Content Rating
- Go to Play Console → Content Rating
- Fill the IARC questionnaire (takes 5 minutes)
- Codeva is likely rated "Everyone" or "Everyone 10+"
- Answer NO to: violence, sexual content, drugs, gambling
- Answer YES to: user-generated content (chat), internet required

### 2.4 Privacy Policy (REQUIRED)
- Must have a public URL with your privacy policy
- You already have: `https://cybermindcli.info/privacy-policy`
- Must mention: what data is collected, how it's used, third-party services

### 2.5 Data Safety Declaration
Play Console asks what data your app collects. Answer honestly:
| Data type | Collected? | Shared? | Purpose |
|-----------|-----------|---------|---------|
| Email | Yes | No | Account/auth |
| Name | Yes (optional) | No | Personalization |
| Chat messages | Yes (on device) | No | App functionality |
| Crash logs | No | No | - |
| Device ID | No | No | - |

---

## Phase 3: Building the APK/AAB

### 3.1 Prerequisites
- Node.js **20 LTS** (not 24 — EAS doesn't support it yet)
  ```
  nvm install 20
  nvm use 20
  ```
- EAS CLI installed globally:
  ```
  npm install -g eas-cli
  ```
- Login to your Expo account:
  ```
  eas login
  ```

### 3.2 Set EAS Project ID
1. Go to [expo.dev](https://expo.dev) → Create a project → get the project ID
2. Put it in `app.json`:
   ```json
   "extra": {
     "eas": {
       "projectId": "your-project-id-here"
     }
   }
   ```

### 3.3 Build for Production
```bash
cd mobile/codeva-mobile

# Preview APK (for testing on real device before Play Store)
eas build --platform android --profile preview

# Production AAB (for Play Store upload)
eas build --platform android --profile production
```

EAS builds in the cloud (free tier: 30 builds/month). Takes ~10-15 minutes.
When done, download the `.aab` file from the Expo dashboard.

---

## Phase 4: Play Store Submission

### 4.1 Create App in Play Console
1. Play Console → **Create app**
2. App name: `Codeva - AI Chat`
3. Default language: English
4. App type: App (not Game)
5. Free (not Paid)

### 4.2 Set Up Store Listing
- Upload icon, feature graphic, screenshots
- Paste short + full description
- Set category: **Communication** or **Productivity → AI**
- Add contact email + privacy policy URL

### 4.3 App Content → Content Rating
- Complete the IARC questionnaire
- Get your content rating

### 4.4 App Content → Target Audience
- Target audience: 13+ (because of AI chat)
- Not designed for children under 13

### 4.5 App Content → Data Safety
- Fill per section 2.5 above

### 4.6 Upload the AAB
- Go to **Production** → **Create new release**
- Upload the `.aab` file from EAS build
- Add release notes:
  ```
  Version 1.0.0:
  - Multi-model AI chat (Groq + Gemini)
  - Voice-to-voice conversations
  - Council Mode
  - Web search
  - Image understanding
  - Projects with custom instructions
  ```
- Review → Submit for review

### 4.7 Google Review
- First submission: 3-7 days for review
- Subsequent updates: usually 1-3 days
- If rejected: Google tells you why, fix it, resubmit

---

## Phase 5: Post-Launch

### 5.1 OTA Updates (no Play Store resubmission needed)
```bash
eas update --branch production --message "Bug fix: ..."
```
This pushes a JS bundle update that users get on next app launch.
Only works for JS/asset changes, NOT native module changes.

### 5.2 Monitor
- Play Console → **Statistics** for downloads, ratings, crashes
- Use `expo-updates` for instant patches
- Backend handles all AI routing — no app update needed for new models

---

## Quick Reference: Files Needed

| What | Where |
|------|-------|
| App icon (512x512) | `assets/icon.png` |
| Adaptive icon (1024x1024) | `assets/adaptive-icon.png` |
| Splash screen | `assets/splash.png` |
| Feature graphic (1024x500) | Create separately for store |
| Screenshots (1080x1920+) | Take from running app |
| Privacy Policy | `https://cybermindcli.info/privacy-policy` |
| EAS config | `eas.json` (already set up) |
| App config | `app.json` (already set up) |

---

## Cost Summary
| Item | Cost |
|------|------|
| Google Play Developer | $25 (one-time) |
| EAS Build (free tier) | $0 (30 builds/month) |
| EAS Build (production plan) | $15/month if you need more |
| Hosting backend (Render) | Already running |
| Total to publish | **$25** |
