// Local copy of the AgentTool/ToolContext shape from @cybermind/core. We
// duplicate (not import) to avoid a dependency cycle: core depends on
// providers, and tools may eventually be consumed by core. Keep these two
// definitions identical to the canonical ones in @cybermind/core.

import type { ToolSchema } from '@cybermind/providers';

export interface ToolContext {
  cwd: string;
  approve?: (toolName: string, input: Record<string, unknown>) => Promise<boolean>;
}

export interface AgentTool {
  schema: ToolSchema;
  /** True when the tool may mutate user state (write, exec, network). */
  destructive: boolean;
  execute(input: Record<string, unknown>, ctx: ToolContext): Promise<string>;
}
