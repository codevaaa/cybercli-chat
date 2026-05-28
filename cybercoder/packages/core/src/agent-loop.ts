import { createLogger } from '@cybermind/shared';
import type {
  ChatChunk,
  ChatRequest,
  LLMProvider,
  ProviderMessage,
  ProviderToolCall,
  ToolSchema,
} from '@cybermind/providers';

const log = createLogger('core:agent');

export interface AgentTool {
  schema: ToolSchema;
  /** Executor receives the parsed input and returns a string result for the model. */
  execute(input: Record<string, unknown>, ctx: ToolContext): Promise<string>;
}

export interface ToolContext {
  cwd: string;
  /** Caller-provided approval gate. Throw or return false to deny. */
  approve?: (toolName: string, input: Record<string, unknown>) => Promise<boolean>;
}

export interface AgentLoopOptions {
  provider: LLMProvider;
  systemPrompt?: string;
  model?: string;
  tools?: AgentTool[];
  /** Hard cap on tool-use iterations to prevent runaway loops. */
  maxIterations?: number;
  /** Cancel the entire loop. */
  signal?: AbortSignal;
}

export type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; name: string; input: Record<string, unknown>; id: string }
  | { type: 'tool_result'; name: string; id: string; output: string; ok: boolean }
  | { type: 'usage'; inputTokens: number; outputTokens: number }
  | { type: 'iteration'; index: number; max: number }
  | { type: 'done'; reason: 'end_turn' | 'max_iterations' | 'error'; error?: string };

/**
 * Run a single agent turn: send `messages` to the provider, stream text,
 * execute any tool calls, and loop until the model emits end_turn or we
 * hit `maxIterations`. Yields rich events the UI can render.
 */
export async function* runAgentLoop(
  messages: ProviderMessage[],
  opts: AgentLoopOptions,
): AsyncIterable<AgentEvent> {
  const tools = opts.tools ?? [];
  const toolMap = new Map(tools.map((t) => [t.schema.name, t] as const));
  const toolSchemas = tools.map((t) => t.schema);
  const max = opts.maxIterations ?? 10;
  const ctx: ToolContext = { cwd: process.cwd() };

  // Mutable conversation buffer the loop appends tool results into.
  const buffer: ProviderMessage[] = [...messages];

  for (let iter = 0; iter < max; iter++) {
    if (opts.signal?.aborted) {
      yield { type: 'done', reason: 'error', error: 'aborted' };
      return;
    }
    yield { type: 'iteration', index: iter, max };

    const req: ChatRequest = {
      model: opts.model ?? 'auto',
      messages: buffer,
      systemPrompt: opts.systemPrompt,
      tools: toolSchemas.length > 0 ? toolSchemas : undefined,
      signal: opts.signal,
    };

    let assistantText = '';
    const assistantToolCalls: ProviderToolCall[] = [];
    let stopReason: ChatChunk & { type: 'done' } = { type: 'done', reason: 'end_turn' };

    for await (const chunk of opts.provider.chat(req)) {
      if (chunk.type === 'text') {
        assistantText += chunk.text;
        yield { type: 'text', text: chunk.text };
      } else if (chunk.type === 'tool_call') {
        assistantToolCalls.push(chunk.toolCall);
        yield {
          type: 'tool_call',
          name: chunk.toolCall.name,
          input: chunk.toolCall.input,
          id: chunk.toolCall.id,
        };
      } else if (chunk.type === 'usage') {
        yield { type: 'usage', inputTokens: chunk.inputTokens, outputTokens: chunk.outputTokens };
      } else if (chunk.type === 'done') {
        stopReason = chunk;
      }
    }

    // Persist the assistant turn so subsequent iterations have the context.
    buffer.push({
      role: 'assistant',
      content: assistantText,
      toolCalls: assistantToolCalls.length ? assistantToolCalls : undefined,
    });

    if (stopReason.reason === 'error') {
      yield { type: 'done', reason: 'error', error: stopReason.error };
      return;
    }

    if (assistantToolCalls.length === 0) {
      yield { type: 'done', reason: 'end_turn' };
      return;
    }

    // Execute tool calls sequentially (parallel exec lands in M11).
    for (const tc of assistantToolCalls) {
      const tool = toolMap.get(tc.name);
      if (!tool) {
        const errOut = `Tool '${tc.name}' is not registered.`;
        yield { type: 'tool_result', name: tc.name, id: tc.id, output: errOut, ok: false };
        buffer.push({ role: 'tool', content: errOut, toolCallId: tc.id });
        continue;
      }
      try {
        if (ctx.approve) {
          const ok = await ctx.approve(tc.name, tc.input);
          if (!ok) {
            const denied = `[user denied tool '${tc.name}']`;
            yield { type: 'tool_result', name: tc.name, id: tc.id, output: denied, ok: false };
            buffer.push({ role: 'tool', content: denied, toolCallId: tc.id });
            continue;
          }
        }
        const output = await tool.execute(tc.input, ctx);
        yield { type: 'tool_result', name: tc.name, id: tc.id, output, ok: true };
        buffer.push({ role: 'tool', content: output, toolCallId: tc.id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('tool execution failed', { tool: tc.name, err: msg });
        yield { type: 'tool_result', name: tc.name, id: tc.id, output: `Error: ${msg}`, ok: false };
        buffer.push({ role: 'tool', content: `Error: ${msg}`, toolCallId: tc.id });
      }
    }
    // Loop continues: model receives tool results, may emit more text/tools.
  }

  yield { type: 'done', reason: 'max_iterations' };
}
