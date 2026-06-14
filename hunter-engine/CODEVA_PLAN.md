# Codeva Hunter Engine — Transformation Plan

## What We Are Doing

Taking `shuvonsec/claude-bug-bounty` repo and making it fully ours:
- Removing ALL Claude Code / Anthropic dependencies  
- Replacing `brain.py` LLM layer → Codeva llmGateway (Node.js backend)
- User gives ONE input: target domain
- AI decides everything: what to attack, how, when, what order
- Output: submission-ready H1/Bugcrowd report

## Architecture

```
USER INPUT: "target.com"
     ↓
Desktop KaliKal Window (Electron)
     ↓ IPC
Backend: POST /api/v1/hunt/autopilot
     ↓ MAX plan only + x-desktop-client header
HuntOrchestrator.js
  Phase 1: ReconAgent    → recon_engine.sh (subfinder, httpx, nuclei)
  Phase 2: BrainAnalysis → llmGateway (Ravan) → analyze attack surface
  Phase 3: ScanAgent     → vuln_scanner.sh (dalfox, sqlmap, ffuf)
  Phase 4: ValidateAgent → llmGateway (Kali) → 7-Question Gate
  Phase 5: ChainAgent    → llmGateway (Ravan) → exploit chains
  Phase 6: ReportAgent   → llmGateway (Ravan) → H1 report
     ↓
MongoDB: HuntSession (memory, patterns, reports)
     ↓
SSE Stream to frontend: real-time progress
     ↓
OUTPUT: Structured report + download
```

## Files to Create

### Backend
1. `backend/src/routes/hunt.routes.js` — all hunt API endpoints
2. `backend/src/services/hunt/HuntOrchestrator.js` — main brain (replaces brain.py)
3. `backend/src/services/hunt/agents/ReconAgent.js`
4. `backend/src/services/hunt/agents/ScanAgent.js`  
5. `backend/src/services/hunt/agents/ValidateAgent.js`
6. `backend/src/services/hunt/agents/ChainAgent.js`
7. `backend/src/services/hunt/agents/ReportAgent.js`
8. `backend/src/services/hunt/ToolRunner.js` — shell tool executor
9. `backend/src/models/HuntSession.js` — MongoDB model
10. `backend/src/utils/huntMemory.js` — cross-session pattern DB

### hunter-engine/ modifications
- `brain.py` → REPLACED by Node.js HuntOrchestrator
- `engine.py` → REMOVED (standalone mode not needed)
- `tools/*.sh` → KEPT as-is, called via ToolRunner.js
- `agents/*.md` → KEPT, content used as LLM system prompts
- `skills/*.md` → KEPT, injected into llmGateway context
- `memory/` → KEPT schemas, ported to MongoDB

### Desktop
1. `desktop/src/renderer/kalikal.html` — dedicated hunter window
2. `desktop/src/kalikal/KaliHunter.tsx` — main UI component
3. `desktop/src/main/index.ts` — add createHunterWindow()

## Plan Gating
- Hunt routes: MAX plan ONLY (not pro, not free)
- Desktop-only: `x-desktop-client: codeva-desktop` header required
- Daily limit: 10 autopilot runs per user per day
