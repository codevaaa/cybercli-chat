import { createLogger } from '@cybermind/shared';
import type {
  ChatChunk,
  ChatRequest,
  LLMProvider,
  ProviderInfo,
  ProviderMessage,
  ProviderToolCall,
} from './types.js';

const log = createLogger('providers:ollama');

export interface OllamaProviderOptions {
  baseURL?: string;
  defaultModel?: string;
}

/**
 * Ollama local fallback. Talks to the native Ollama daemon (`ollama serve`),
 * default port 11434. Uses the streaming /api/chat endpoint.
 *
 * Used as the offline fallback whenever the configured cloud provider fails
 * or the user explicitly switches via `/fallback ollama`.
 */
export class OllamaProvider implements LLMProvider {
  public readonly info: ProviderInfo;
  private readonly baseURL: string;
  private readonly defaultModel: string;

  constructor(opts: OllamaProviderOptions = {}) {
    this.baseURL = opts.baseURL ?? process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';
    this.defaultModel = opts.defaultModel ?? process.env.OLLAMA_MODEL ?? 'llama3.1';
    this.info = {
      id: 'ollama',
      displayName: 'Ollama (local)',
      requiresNetwork: false,
      ready: true, // Optimistic; reachability is checked lazily on first call.
    };
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseURL}/api/tags`, { method: 'GET' });
      if (!res.ok) return [];
      const json = (await res.json()) as { models?: Array<{ name: string }> };
      return json.models?.map((m) => m.name) ?? [];
    } catch (err) {
      log.warn('ollama listModels failed', String(err));
      return [];
    }
  }

  async *chat(req: ChatRequest): AsyncIterable<ChatChunk> {
    const model = req.model && req.model !== 'auto' ? req.model : this.defaultModel;
    log.debug('ollama chat', { model, messages: req.messages.length });

    const body: OllamaRequest = {
      model,
      messages: [
        ...(req.systemPrompt ? [{ role: 'system', content: req.systemPrompt }] : []),
        ...req.messages.map(toOllamaMessage),
      ],
      stream: true,
      options: {
        temperature: req.temperature,
        num_predict: req.maxTokens,
      },
      tools: req.tools?.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.inputSchema },
      })),
    };

    try {
      const res = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        signal: req.signal,
      });

      if (!res.ok || !res.body) {
        yield {
          type: 'done',
          reason: 'error',
          error: `ollama HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`,
        };
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;
      let stopReason: ChatChunk & { type: 'done' } = { type: 'done', reason: 'stop' };

      while (!done) {
        const { value, done: chunkDone } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const evt = JSON.parse(trimmed) as OllamaStreamChunk;
              if (evt.message?.content) {
                yield { type: 'text', text: evt.message.content };
              }
              if (evt.message?.tool_calls?.length) {
                for (const raw of evt.message.tool_calls) {
                  const tc: ProviderToolCall = {
                    id: raw.id ?? `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    name: raw.function.name,
                    input: raw.function.arguments ?? {},
                  };
                  yield { type: 'tool_call', toolCall: tc };
                }
              }
              if (evt.done) {
                if (evt.eval_count != null && evt.prompt_eval_count != null) {
                  yield {
                    type: 'usage',
                    inputTokens: evt.prompt_eval_count,
                    outputTokens: evt.eval_count,
                  };
                }
                stopReason = {
                  type: 'done',
                  reason:
                    evt.done_reason === 'length'
                      ? 'max_tokens'
                      : evt.message?.tool_calls?.length
                        ? 'tool_use'
                        : 'end_turn',
                };
                done = true;
                break;
              }
            } catch (err) {
              log.warn('failed to parse ollama chunk', { line: trimmed, err: String(err) });
            }
          }
        }
        if (chunkDone) done = true;
      }

      yield stopReason;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error('ollama chat failed', msg);
      yield { type: 'done', reason: 'error', error: msg };
    }
  }
}

interface OllamaRequest {
  model: string;
  messages: Array<{ role: string; content: string; tool_calls?: unknown[]; tool_call_id?: string }>;
  stream: boolean;
  options?: { temperature?: number; num_predict?: number };
  tools?: Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }>;
}

interface OllamaStreamChunk {
  message?: {
    role: string;
    content?: string;
    tool_calls?: Array<{ id?: string; function: { name: string; arguments: Record<string, unknown> } }>;
  };
  done?: boolean;
  done_reason?: string;
  eval_count?: number;
  prompt_eval_count?: number;
}

function toOllamaMessage(m: ProviderMessage) {
  if (m.role === 'tool') {
    return { role: 'tool', content: m.content, tool_call_id: m.toolCallId };
  }
  return { role: m.role, content: m.content };
}
