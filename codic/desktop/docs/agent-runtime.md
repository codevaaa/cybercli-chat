# Codic agent runtime

This document describes the current local-first agent architecture and the limits of the preview implementation.

## Request and execution path

```text
React renderer
  └─ typed preload bridge (context isolation)
      └─ Electron main process: validates sign-in, task/window ownership, and input
          └─ CodicRuntimeBridge: binds a task to one canonical project folder
              └─ CodicRuntime / CyberCoder agent loop: supervises the parent run
                  ├─ CodevaProvider → authenticated POST /api/v1/codic/turns (SSE)
                  ├─ local workspace tools → selected project only by default
                  └─ CodicSubagentCoordinator → bounded child agent loops
                      └─ CodevaProvider → the same authenticated turns API per child
```

The backend authenticates the account, resolves the requested model, enforces plan and quota limits, and streams typed events. The backend does not receive a repository archive and does not execute project tools. Each child model call is an ordinary authenticated `/turns` call, so it follows the same model access, quota, and failure rules as the parent.

## Parent and helper responsibilities

- The user prompt starts one parent run in the explicitly selected canonical workspace.
- The parent may call `spawn_subagents` for independent research, planning, or code review.
- The user can turn delegation off or select a maximum of one, two, or three concurrent helpers. Runtime schema and input validation enforce the selected cap, with three as the hard maximum.
- Helpers inherit the parent model ID, reasoning effort, selected workspace, and cancellation lifetime.
- Helpers receive only the `read_file`, `read_many`, `list_dir`, `grep`, and `repo_map` tools. Built-in tasks direct them not to write, execute shell commands, access the network, or inspect paths outside the selected workspace.
- Each helper is limited to six model/tool iterations and bounded prompt, summary, and aggregate result sizes. The parent receives summaries and remains responsible for any edit or action.
- A helper can be stopped independently. Stopping the parent aborts its active children. Completed, failed, and cancelled helpers emit final status and usage metadata.

The helper prompt is model-generated, so its instruction text is not a security boundary. The tool allowlist, workspace-root checks, network boundary, and shell approval controls enforce what a helper can actually do.

## Event and persistence contract

The local runtime emits `subagent_progress` events with the run ID, agent ID, label, skill, status, selected model, duration, tool-call count, token usage when provided, and a bounded summary or error. The Electron main process redacts sensitive values before appending task events to local SQLite, then sends the event only to the Codic window that owns that task. The Activity panel presents each helper’s status and metadata and exposes a stop action while it is running.

Codic stores project/thread/run/event metadata locally. Only model prompts, the required conversation context, tool schemas, and returned tool results are sent through the Codeva gateway. Since helper calls use the regular account gateway, their token usage is part of the user’s ordinary Codeva usage.

## Failure and cancellation behavior

- A provider error or exhausted retry is reported for that helper; successful siblings still return their findings.
- Provider rate-limit and transient retries are bounded, honor `Retry-After` when available, and stop waiting when the run is cancelled.
- Helper cancellation aborts that child’s provider request and returns a cancelled summary to the parent. It does not cancel siblings or the parent.
- Parent cancellation aborts all children before ending the parent run.
- Maximum concurrency, prompt length, helper iteration count, output summary length, and aggregate results are capped locally.
- These controls limit workload and exposure; they do not promise zero provider failures or uninterrupted service.

## Future expansion boundary

Writable parallel coding must wait for real Git worktree lifecycle management: create and validate an isolated worktree, assign one writer per worktree, record ownership, detect conflicts, review diffs, and safely integrate or discard changes. Until then, only the parent writes files. User-defined skills, MCP servers, PR review, SSH, browser/computer-use agents, and remote steering need separate approval, isolation, lifecycle, and persistence designs; they are not represented as complete by the read-only helper preview.

## Acceptance checks

The runtime self-check covers normal parent edits and permissions, helper tool allowlisting, selected model and reasoning inheritance, configured concurrency cap, progress metadata, isolated helper cancellation while the parent and sibling continue, task cancellation, and clean workspace/checkpoint boundaries. Desktop typecheck/build and UI tests cover the bridge, settings, activity controls, and Coming Soon page. Packaging validates a local Windows installer; it does not publish or enable the public release flag.
