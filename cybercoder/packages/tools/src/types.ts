import type { AgentTool as CoreAgentTool, ToolContext as CoreToolContext } from './core-types.js';
export type { AgentTool, ToolContext } from './core-types.js';

// A wider AgentTool re-export with a `destructive` marker so the approval gate
// knows whether to prompt the user. Core's AgentTool is the structural shape
// the agent loop calls; this package's tools also annotate destructiveness.
export type DestructiveTool = CoreAgentTool & { destructive: boolean };

// Helper for downstream packages to know they're handling a tool registered
// by @cybermind/tools (which always sets `destructive`).
export type BuiltinToolContext = CoreToolContext;
