# Codic REA Evidence Ledger

Status date: 2026-11-12
Purpose: turn public Codex feature references and any later authorized REA observations into Codic requirements and acceptance checks.

## Evidence boundary

One local Codex executable was selected through REA, but no useful code or runtime analysis has been completed. Its target metadata identifies an x86-64 PE executable with SHA-256 `83f5c2dd2ac2902e0d96ba5d8ccdd27d513f57df4a9ab73e06a5a518028e9a2f`; its product version could not be resolved. The native analysis provider is unavailable on this host: Ghidra is not configured, Hopper does not support this Windows host, and IDA is not configured. REA returned no Evidence ID for target selection or the unavailable overview. No Codex UI flow, source path, or private service behavior has been observed. **Do not describe any Codex UI or internal behavior as directly observed.** Feature statements below remain based on public OpenAI documentation unless a later record adds actual evidence.

REA is an engineering-time investigation tool, not a Codic runtime dependency. The connected REA tools can analyze a locally supplied JavaScript/Electron bundle and can collect scoped runtime evidence. Static traces do not establish that a code path ran; runtime capture is separate evidence. REA-authored code is MIT licensed, while third-party tools and materials retain their own terms. Do not copy Codex code, assets, credentials, or proprietary implementation details into Codic. See the [REA README](https://github.com/morluto/rea/blob/main/README.md), [MIT license](https://github.com/morluto/rea/blob/main/LICENSE), and [responsible-use guidance](https://github.com/morluto/rea/blob/main/DISCLAIMER.md).

## REA workflow

1. Select one workflow and record the target product version, OS, starting state, and permitted actions. Prefer public documentation and a clean, user-authorized runtime profile. Do not capture personal conversations or account data.
2. Observe the visible flow and record screenshots or UI state, action sequence, and resulting state. Label this as runtime evidence, not implementation knowledge.
3. If an authorized JavaScript/Electron artifact is supplied, use REA’s application analysis to map relevant modules and IPC boundaries. Trace only from a specific workflow seed; do not infer runtime execution from static reachability.
4. Correlate static and runtime evidence when both exist. Record contradictions, coverage limits, and unresolved questions.
5. Translate the behavior into an independently implemented Codic requirement and a repeatable acceptance scenario. Do not reuse Codex source or artwork.

The REA [JavaScript application workflow guide](https://github.com/morluto/rea/blob/main/docs/guides/javascript/javascript-application-workflows.md) describes bundle analysis and feature tracing; its [browser observation guide](https://github.com/morluto/rea/blob/main/docs/guides/web/browser-observation.md) describes bounded browser evidence. Use the installed REA MCP integration; do not add REA as a shipped dependency.

## Public-source references

| Ref | Source | Publicly documented basis | Evidence class |
|---|---|---|---|
| C-1 | [Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/) | Project-organized agent threads, parallel work, reviewable diffs, comments, worktrees, skills, scheduled automations, and approval controls. | Public documentation; not runtime observation. |
| C-2 | [Codex for (almost) everything](https://openai.com/index/codex-for-almost-everything/) | In-app browser, page comments, multiple terminals, PR review, SSH devboxes, computer-use workflows, and ongoing work. | Public documentation; exact availability and UI details may vary by release. |
| C-3 | [Moving to the new ChatGPT desktop app](https://help.openai.com/en/articles/20001276-moving-to-the-new-chatgpt-desktop-app) | Desktop Codex context and supported access to desktop Codex chats through mobile remote controls. | Public documentation; not a claim about private transport implementation. |
| R-1 | [REA README](https://github.com/morluto/rea/blob/main/README.md) | REA supports evidence-backed application and runtime investigation; target and provider support vary. | Public project documentation. |
| R-2 | [REA disclaimer](https://github.com/morluto/rea/blob/main/DISCLAIMER.md) | REA is for lawful research/interoperability on software the investigator owns or is authorized to examine. | Public project documentation. |

## Feature-to-acceptance checklist

`TBD` means no REA Evidence ID exists yet. Replace it only with an ID returned by an actual REA operation; never fabricate an ID. Record the exact app version and environment whenever an observation is made.

| ID | Workflow to investigate | Current evidence | Codic acceptance check |
|---|---|---|---|
| FIRST-01 | First launch, welcome, and opening/creating a project | Public docs do not establish exact screens. REA: **TBD**. | On a clean profile, Codic explains the next step, opens or creates a workspace, and shows clear loading, empty, and error states. |
| AUTH-01 | Sign-in, account creation, and return to the desktop app | Exact Codex flow unknown. REA: **TBD**. | Codeva signup, Google login, verification, refresh, and logout complete without losing the selected return destination. |
| PROJ-01 | Projects, multiple repositories, and threads | Projects/threads and multiple repositories are publicly described in C-1/C-2. Exact navigation: unknown. REA: **TBD**. | Create/switch projects and repositories; each thread retains its project context and remains available after restart. |
| TASK-01 | Prompt, plan, progress, steering, cancel, and resume | Long-running and steerable workflows are publicly described in C-1/C-2. Exact event lifecycle: unknown. REA: **TBD**. | A task streams progress, accepts steering, cancels cleanly, resumes from persisted state, and reports completion or failure. |
| AGENT-01 | Run parallel agents across tasks | Parallel agents are publicly described in C-1. Scheduling and collision behavior: unknown. REA: **TBD**. | Two tasks can run concurrently with distinct status, logs, and review targets. |
| TREE-01 | Create, review, and integrate isolated worktrees | Built-in worktrees are publicly described in C-1. Exact lifecycle: unknown. REA: **TBD**. | Each agent worktree is a real Git worktree; changes remain isolated until the user reviews and applies/integrates them. |
| REVIEW-01 | Inspect diffs, comment, edit inline, and restore | Diff review and comments are publicly described in C-1/C-2. Exact controls: unknown. REA: **TBD**. | User can inspect changed files, add line comments, edit a change, reject/restore it, and see the resulting working-tree state. |
| APPROVAL-01 | Approve or deny commands and permissions | Approval controls and sandboxing are publicly described in C-1. Exact policy rules: unknown. REA: **TBD**. | A denied action does not execute; permitted actions stay inside the selected workspace unless separately authorized. |
| TERM-01 | Multiple terminals and task-linked command output | Multiple terminals are publicly described in C-2. Exact layout: unknown. REA: **TBD**. | Open, rename, switch, and close terminal tabs; output remains associated with the correct project/task. |
| SKILL-01 | Discover, enable, and use skills | Skills are publicly described in C-1. Exact matching behavior: unknown. REA: **TBD**. | A Codic skill can be selected explicitly, loaded with its declared resources, and identified in the task activity. |
| AUTO-01 | Schedule repeatable work and review results | Scheduled automations and a review queue are publicly described in C-1/C-2. Exact scheduling rules: unknown. REA: **TBD**. | A scheduled local automation runs only under its configured permissions and produces a reviewable result; offline behavior is explicit. |
| PR-01 | Review GitHub pull requests and comments | PR review is publicly described in C-2. Exact provider support: unknown. REA: **TBD**. | Connect/revoke a Git provider, load a selected review, and submit comments only after explicit user action. |
| BROWSER-01 | Browse a development preview and annotate a page | In-app browser and page comments are publicly described in C-2. Exact browser security model: unknown. REA: **TBD**. | Open an allowed preview, attach a user annotation to the correct page/selection, and require approval before external side effects. |
| SSH-01 | Connect to and use a remote development host | SSH devboxes are publicly described in C-2. Exact setup and persistence: unknown. REA: **TBD**. | Pair an SSH host securely, surface connection state, run a task in the chosen remote workspace, and disconnect without leaking credentials. |
| COMPUTER-01 | Use computer interaction during a task | Computer-use workflows are publicly described in C-2. Exact platform scope: unknown. REA: **TBD**. | Computer interaction is visibly opt-in, shows the active target/actions, can be stopped, and cannot silently access unrelated apps. |
| REMOTE-01 | Monitor and steer an active desktop task from another device | Mobile remote access to supported desktop Codex chats is publicly described in C-3. Exact pairing and relay behavior: unknown. REA: **TBD**. | A paired client can monitor/steer a running local task; the desktop must be online, pairing is revocable, and repository contents are not synced by default. |
| UPDATE-01 | Check for and install a new desktop release | Exact Codex update UI unknown. REA: **TBD**. | Codic checks a version manifest, verifies checksums, explains unsigned-installer warnings, and opens the official download page for manual update. |
| THEME-01 | Responsive layout and system light/dark behavior | Codic requirement from product direction; no Codex observation. REA: **TBD**. | Layout works at narrow and wide window sizes, respects system light/dark preference, and remains keyboard-usable. |

## Evidence record template

```text
Feature ID:
Target app/version/build digest:
OS and environment:
Starting state and authorized actions:
Observed action/result sequence:
Evidence IDs and artifact locations:
Evidence class: public-doc | runtime-observed | static-derived | inference
Confidence and coverage limits:
Unresolved questions:
Codic requirement:
Acceptance scenario:
```

Keep source behavior, design inference, and Codic product choices in separate fields. If a target or runtime is unavailable, leave the REA ID as `TBD` and implement against the public feature contract without claiming internal parity.
