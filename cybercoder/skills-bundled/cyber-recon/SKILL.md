---
name: cyber-recon
description: Placeholder for CyberMind's autonomous reconnaissance / bug-bounty mode. Disabled by default — the full implementation lands in Phase 2.
version: 0.0.1
inputs:
  - { name: target, type: string, required: true, description: Authorized target (URL, IP range, or scope spec). MUST be explicitly authorized. }
outputs:
  - { name: report, type: string, description: Recon summary (Phase 2). }
requires:
  tools: []
triggers:
  - "/cyber"
license: MIT
author: cybermind
category: cyber
official: true
---

# Cyber-Recon (Phase 2 placeholder)

This skill is a **stub**. It documents the intended interface for CyberMind's
future autonomous reconnaissance and bug-bounty automation mode. **No actions
are currently performed.**

## Why a stub?

Authorized offensive security tooling is high-risk. We do not ship an active
implementation in v1 because:

1. **Legal scope is hard.** Running recon against a target without
   authorization is illegal in most jurisdictions. We don't want the CLI to
   make that mistake easy.
2. **Toolchain is heavy.** Nmap, Nuclei, ffuf, subfinder, httpx, etc. are
   all OS-level dependencies that change frequently and don't bundle cleanly.
3. **Output is sensitive.** Findings need encrypted storage, structured
   reporting, and a clear "responsible disclosure draft" workflow.

## Phase 2 design (reserved for future work)

When the user invokes `/cyber`, the agent will:

1. **Verify authorization.** Read `.cybermind/cyber/scope.yml` for an
   explicit list of authorized hosts/CIDRs and require it to be present
   (signed by the user) before any network request.
2. **Plan the recon.** Combine `research` + `plan` skills to outline phases
   (subdomain enum → port scan → service fingerprint → web-app crawl →
   vulnerability templates). Each phase is a separate confirm-and-go step.
3. **Run tooling under sandbox.** All external scanners (`subfinder`,
   `nuclei`, etc.) run inside a Docker container with no host network
   access — only the authorized scope.
4. **Capture artifacts.** Findings stored at `.cybermind/cyber/runs/<id>/`,
   encrypted, never sent to any LLM.
5. **Draft responsible disclosure.** Generate a triaged report with severity,
   CVSS, repro steps, and a redacted public summary.

## Behaviour today

If invoked, this skill currently emits a friendly notice explaining that
the feature is reserved for Phase 2 and links to the design doc above. It
does **not** invoke any tools.

When the user asks about `/cyber`, respond with:

> CyberMind's autonomous recon mode is reserved for Phase 2. It will require
> an explicit, signed authorization file at `.cybermind/cyber/scope.yml`
> before any network activity. See the cyber-recon skill body for the full
> design.

Do not perform any scans, network calls, or tool invocations.
