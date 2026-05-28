import type { ChatRequest, LLMProvider, ProviderMessage } from '@cybermind/providers';

export interface ConsensusOptions {
  /** Up to N providers to run in parallel. */
  providers: LLMProvider[];
  /** Per-provider model override; same length as providers. */
  models?: Array<string | undefined>;
  /** System prompt used by every model. */
  systemPrompt?: string;
  /** Time budget in ms; slower providers are dropped after this. */
  timeoutMs?: number;
}

export interface ConsensusResult {
  perProvider: Array<{ provider: string; model: string; text: string; error?: string }>;
  /** A merged answer produced by simple deduping + concatenation. The user can
   * upgrade this to a tournament-style judge model later. */
  merged: string;
}

/**
 * Multi-model consensus runner — used by `/consensus N`. Sends the same
 * conversation to N providers concurrently, collects their final text, and
 * returns each answer plus a merged digest.
 */
export async function runConsensus(
  messages: ProviderMessage[],
  opts: ConsensusOptions,
): Promise<ConsensusResult> {
  const timeout = opts.timeoutMs ?? 60_000;

  const tasks = opts.providers.map(async (p, i) => {
    const req: ChatRequest = {
      model: opts.models?.[i] ?? 'auto',
      messages,
      systemPrompt: opts.systemPrompt,
    };
    const out: { text: string; error?: string } = { text: '' };
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeout);
    try {
      for await (const chunk of p.chat({ ...req, signal: ac.signal })) {
        if (chunk.type === 'text') out.text += chunk.text;
        else if (chunk.type === 'done' && chunk.reason === 'error') out.error = chunk.error;
      }
    } catch (err) {
      out.error = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timer);
    }
    return { provider: p.info.id, model: req.model, text: out.text, error: out.error };
  });

  const perProvider = await Promise.all(tasks);
  const merged = mergeAnswers(perProvider.filter((r) => !r.error).map((r) => r.text));
  return { perProvider, merged };
}

function mergeAnswers(answers: string[]): string {
  if (answers.length === 0) return '';
  if (answers.length === 1) return answers[0] ?? '';
  // Lightweight merge: pick the longest answer as the spine, then append unique
  // bullet-style lines from the others. A judge-model upgrade lands in M10.
  const sorted = [...answers].sort((a, b) => b.length - a.length);
  const spine = sorted[0] ?? '';
  const seen = new Set(spine.split('\n').map((l) => l.trim()));
  const extras: string[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const lines = (sorted[i] ?? '').split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (t.length > 0 && !seen.has(t)) {
        seen.add(t);
        extras.push(line);
      }
    }
  }
  return extras.length > 0 ? `${spine}\n\n--- additional perspectives ---\n${extras.join('\n')}` : spine;
}
