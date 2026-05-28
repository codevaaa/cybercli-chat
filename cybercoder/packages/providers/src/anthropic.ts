import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '@cybermind/shared';
import type {
  ChatChunk,
  ChatRequest,
  LLMProvider,
  ProviderInfo,
  ProviderMessage,
  ProviderToolCall,
  ToolSchema,
} from './types.js';

const log = createLogger('providers:anthropic');

export interface AnthropicProviderOptions {
  apiKey?: string;
  baseURL?: string;
  /** Default model used when ChatRequest.model is empty/auto. */
  defaultModel?: string;
}

/**
 * Anthropic provider — direct calls to api.anthropic.com (or any
 * Anthropic-compatible endpoint, including our own `cybermind-cloud`).
 */
export class AnthropicProvider implements LLMProvider {
  public readonly info: ProviderInfo;
  private readonly client: Anthropic;
  private readonly defaultModel: string;

  constructor(opts: AnthropicProviderOptions = {}) {
    const apiKey = opts.apiKey ?? process.env.CYBERMIND_API_KEY ?? process.env.ANTHROPIC_API_KEY;
    this.client = new Anthropic({
      apiKey: apiKey ?? '',
      baseURL: opts.baseURL,
    });
    this.defaultModel = opts.defaultModel ?? 'claude-3-5-sonnet-latest';
    this.info = {
      id: 'anthropic',
      displayName: 'Anthropic',
      requiresNetwork: true,
      ready: Boolean(apiKey),
    };
  }

  async listModels(): Promise<string[]> {
    // Anthropic doesn't expose a public list-models endpoint; ship a known list.
    return [
      'claude-3-5-sonnet-latest',
      'claude-3-5-haiku-latest',
      'claude-3-opus-latest',
      'claude-sonnet-4-5',
      'claude-opus-4',
    ];
  }

  async *chat(req: ChatRequest): AsyncIterable<ChatChunk> {
    const model = req.model && req.model !== 'auto' ? req.model : this.defaultModel;
    const { system, messages } = splitSystem(req.messages, req.systemPrompt);

    log.debug('anthropic chat', { model, messages: messages.length, tools: req.tools?.length ?? 0 });

    try {
      const stream = this.client.messages.stream({
        model,
        max_tokens: req.maxTokens ?? 4096,
        temperature: req.temperature,
        system: system || undefined,
        messages: messages.map(toAnthropicMessage),
        tools: req.tools?.map(toAnthropicTool),
      });

      const inflightToolCalls = new Map<number, ProviderToolCall>();

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            inflightToolCalls.set(event.index, {
              id: event.content_block.id,
              name: event.content_block.name,
              input: {},
            });
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            yield { type: 'text', text: event.delta.text };
          } else if (event.delta.type === 'input_json_delta') {
            const tc = inflightToolCalls.get(event.index);
            if (tc) {
              // Accumulate JSON fragments into a string we'll parse on stop.
              (tc as ProviderToolCall & { _raw?: string })._raw =
                ((tc as ProviderToolCall & { _raw?: string })._raw ?? '') + event.delta.partial_json;
            }
          }
        } else if (event.type === 'content_block_stop') {
          const tc = inflightToolCalls.get(event.index);
          if (tc) {
            const raw = (tc as ProviderToolCall & { _raw?: string })._raw ?? '{}';
            try {
              tc.input = raw.length > 0 ? (JSON.parse(raw) as Record<string, unknown>) : {};
            } catch (err) {
              log.warn('failed to parse tool input json', { raw, err: String(err) });
              tc.input = {};
            }
            yield { type: 'tool_call', toolCall: { id: tc.id, name: tc.name, input: tc.input } };
            inflightToolCalls.delete(event.index);
          }
        } else if (event.type === 'message_delta') {
          if (event.usage) {
            // MessageDeltaUsage only carries output tokens; input tokens come
            // from the final message and are emitted there.
            yield { type: 'usage', inputTokens: 0, outputTokens: event.usage.output_tokens ?? 0 };
          }
        } else if (event.type === 'message_stop') {
          // No-op: 'done' is emitted from the final message below.
        }
      }

      const final = await stream.finalMessage();
      yield {
        type: 'done',
        reason:
          final.stop_reason === 'tool_use'
            ? 'tool_use'
            : final.stop_reason === 'max_tokens'
              ? 'max_tokens'
              : final.stop_reason === 'end_turn'
                ? 'end_turn'
                : 'stop',
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error('anthropic chat failed', msg);
      yield { type: 'done', reason: 'error', error: msg };
    }
  }
}

function splitSystem(
  messages: ProviderMessage[],
  systemPrompt?: string,
): { system: string; messages: ProviderMessage[] } {
  const sysFromMessages = messages.filter((m) => m.role === 'system').map((m) => m.content);
  const rest = messages.filter((m) => m.role !== 'system');
  const system = [systemPrompt ?? '', ...sysFromMessages].filter(Boolean).join('\n\n');
  return { system, messages: rest };
}

function toAnthropicMessage(m: ProviderMessage): Anthropic.MessageParam {
  if (m.role === 'tool') {
    return {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: m.toolCallId ?? '',
          content: m.content,
        },
      ],
    };
  }
  if (m.role === 'assistant' && m.toolCalls?.length) {
    type AssistantContent = Anthropic.MessageParam['content'];
    const blocks: AssistantContent = [];
    if (m.content) (blocks as Array<unknown>).push({ type: 'text', text: m.content });
    for (const tc of m.toolCalls) {
      (blocks as Array<unknown>).push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input });
    }
    return { role: 'assistant', content: blocks };
  }
  return {
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  };
}

function toAnthropicTool(t: ToolSchema): Anthropic.Tool {
  return {
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
  };
}
