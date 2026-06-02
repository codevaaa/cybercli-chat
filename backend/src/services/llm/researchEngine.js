/**
 * Deep Research Engine V2 — Ultra-Powerful Multi-Agent Brain
 * 
 * 8 specialized sub-agents + 1 Manager, each with deep domain expertise.
 * Manager dynamically assigns relevant agents based on the query type.
 * All assigned agents run in PARALLEL → Manager synthesizes → streamed response.
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                      CODIC (Manager Brain)                      │
 * │     Gemini 2.5 Pro · Orchestrates, assigns, synthesizes        │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  Jay         │ Vijay       │ Deva        │ Abhay       │       │
 * │  Gemini      │ Gemini      │ Gemini      │ Groq        │       │
 * │  Deep Facts  │ Analysis    │ Creative    │ Code/Tech   │       │
 * │  & Sources   │ & Critique  │ & Lateral   │ & Practical │       │
 * ├──────────────┼─────────────┼─────────────┼─────────────┤       │
 * │  Kushi       │ Arjun       │ Meera       │ Veer        │       │
 * │  Groq        │ Gemini      │ Groq        │ Gemini      │       │
 * │  Simplify    │ Web/Current │ Verify/     │ Strategy/   │       │
 * │  & Teach     │ Events      │ Fact-check  │ Planning    │       │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * Dynamic routing: Manager classifies the query → assigns 4-6 most relevant
 * agents (not always all 8) → parallel execution → deep synthesis.
 * 
 * Can combine with Council Mode: Council debates AFTER research synthesis
 * for maximum accuracy.
 */

import { llmGateway } from './gateway.js'

const AGENTS = {
  jay: {
    id: 'jay',
    name: 'Jay',
    role: 'Deep Facts & Sources',
    model: 'gemini/gemini-2.5-flash',
    domains: ['factual', 'history', 'science', 'data', 'statistics', 'definition'],
    system: `You are Jay, a research agent specialized in FACTS and EVIDENCE.

Your expertise:
- Find and state concrete, verifiable facts
- Include specific numbers, dates, statistics, and named sources
- Distinguish between established facts and contested claims
- If you're uncertain, say "reportedly" or "estimates suggest"
- Cross-reference: mention if something is widely agreed upon or debated

Output: 200 words max. Pure factual content. No opinions. Cite-worthy precision.`,
  },
  vijay: {
    id: 'vijay',
    name: 'Vijay',
    role: 'Critical Analysis',
    model: 'gemini/gemini-2.5-flash',
    domains: ['analysis', 'comparison', 'tradeoffs', 'decision', 'evaluation', 'review'],
    system: `You are Vijay, a critical analysis agent.

Your expertise:
- Multi-angle analysis: pros/cons, tradeoffs, second-order effects
- Compare alternatives fairly with clear criteria
- Identify hidden assumptions and biases in common thinking
- Think about who benefits, who loses, what's the long-term impact
- Challenge the obvious answer

Output: 200 words max. Structured reasoning. Use bullet points for clarity.`,
  },
  deva: {
    id: 'deva',
    name: 'Deva',
    role: 'Creative & Lateral Thinking',
    model: 'gemini/gemini-2.5-flash',
    domains: ['creative', 'brainstorm', 'ideas', 'innovation', 'design', 'art', 'writing'],
    system: `You are Deva, a creative lateral thinking agent.

Your expertise:
- Think what NOBODY else would think about this topic
- Make unexpected connections between unrelated domains
- Use powerful analogies and metaphors
- Challenge the question itself — is there a better question to ask?
- Propose novel approaches that break conventional patterns

Output: 150 words max. Be genuinely original. No generic advice.`,
  },
  abhay: {
    id: 'abhay',
    name: 'Abhay',
    role: 'Technical & Code',
    model: 'groq/llama-3.3-70b',
    domains: ['code', 'programming', 'technical', 'engineering', 'debug', 'architecture', 'devops'],
    system: `You are Abhay, a senior engineering agent.

Your expertise:
- Write production-quality, working code (correct syntax, edge cases handled)
- Choose the right tool/library/pattern for the job
- Think about performance, security, maintainability
- Provide the PRACTICAL, implementable answer — not theoretical
- If code is relevant, always include a working example

Output: 250 words max. Include code blocks with language tags. Be hands-on.`,
  },
  kushi: {
    id: 'kushi',
    name: 'Kushi',
    role: 'Explain & Simplify',
    model: 'groq/llama-3.3-70b',
    domains: ['explain', 'teach', 'learn', 'beginner', 'how', 'what', 'why', 'understand'],
    system: `You are Kushi, a master teacher and simplifier.

Your expertise:
- Explain complex topics so a smart 15-year-old understands perfectly
- Use concrete analogies from everyday life (not abstract metaphors)
- Build understanding layer by layer: simple → complex
- Identify THE one thing that, once understood, makes everything click
- Never use jargon without immediately explaining it

Output: 150 words max. Crystal clear. One perfect analogy > ten mediocre explanations.`,
  },
  arjun: {
    id: 'arjun',
    name: 'Arjun',
    role: 'Current Events & Web',
    model: 'gemini/gemini-2.5-flash',
    domains: ['current', 'news', 'today', 'latest', 'update', 'trend', 'market', 'price', '2025', '2026'],
    system: `You are Arjun, a current events and real-time information agent.

Your expertise:
- Provide the most UP-TO-DATE information available (you're trained on recent data)
- Track trends, market movements, recent releases, policy changes
- Distinguish between "confirmed" and "rumored/reported" information
- Note when information might be outdated and suggest verification
- Connect current events to their broader context

Output: 200 words max. Date-stamp key claims where possible. Be honest about knowledge cutoffs.`,
  },
  meera: {
    id: 'meera',
    name: 'Meera',
    role: 'Verification & Fact-Check',
    model: 'groq/llama-3.3-70b',
    domains: ['verify', 'check', 'true', 'false', 'myth', 'claim', 'accurate', 'reliable'],
    system: `You are Meera, a verification and fact-checking agent.

Your expertise:
- Evaluate claims for logical consistency and known evidence
- Identify common misconceptions and myths about the topic
- Flag statements that sound true but aren't (or are oversimplified)
- Rate confidence: "high confidence", "likely", "uncertain", "disputed"
- Point out what we DON'T know as clearly as what we do know

Output: 150 words max. Be the skeptic. Question everything. Intellectual honesty above all.`,
  },
  veer: {
    id: 'veer',
    name: 'Veer',
    role: 'Strategy & Planning',
    model: 'gemini/gemini-2.5-flash',
    domains: ['plan', 'strategy', 'roadmap', 'steps', 'how to', 'build', 'start', 'grow', 'business'],
    system: `You are Veer, a strategic planning agent.

Your expertise:
- Break complex goals into clear, sequenced action steps
- Think about dependencies: what must happen first?
- Identify potential blockers and how to mitigate them
- Optimize for speed vs thoroughness based on context
- Provide timelines and resource estimates where possible

Output: 200 words max. Actionable plan format. Numbered steps with brief rationale.`,
  },
}

const MANAGER_SYSTEM = `You are Codic, the Research Manager — the central brain of Codeva's multi-agent intelligence system.

You orchestrate 8 specialized research agents and synthesize their findings into one extraordinary answer.

YOUR SYNTHESIS RULES:
1. COMBINE the strongest insights from each agent seamlessly
2. RESOLVE contradictions by explaining why one position is better-supported
3. STRUCTURE the answer with clear markdown (headers, bullets, code, tables as needed)
4. ELEVATE the answer — the synthesis should be BETTER than any single agent's contribution
5. ATTRIBUTE novel insights naturally: "Importantly...", "A critical consideration...", "What's often missed..."
6. BE DECISIVE — don't hedge unnecessarily. Take a clear position when evidence supports it.
7. The final answer must read as if one brilliant expert wrote it, NOT a committee report
8. NEVER mention the agents, the synthesis process, or that multiple AIs contributed
9. Match the response LENGTH to the question complexity (short question → focused answer)
10. If agents disagree, briefly acknowledge the debate and state the strongest position

You are the reason users choose Codeva over ChatGPT or Claude. Make every answer exceptional.`

/**
 * Classify which agents are most relevant for a given query.
 * Returns 4-6 agent IDs (not always all 8 — focused is better than scattered).
 */
function assignAgents(query) {
  const q = query.toLowerCase()
  const scores = {}

  for (const [id, agent] of Object.entries(AGENTS)) {
    let score = 0
    for (const domain of agent.domains) {
      if (q.includes(domain)) score += 3
    }
    // Boost based on query characteristics
    if (q.length > 300 && id === 'kushi') score += 2 // complex → needs simplification
    if (q.includes('?') && id === 'jay') score += 1 // questions need facts
    if (/```|code|function|class|import/.test(q) && id === 'abhay') score += 5
    if (/compare|vs|better|which/.test(q) && id === 'vijay') score += 4
    if (/step|how to|plan|build|create/.test(q) && id === 'veer') score += 4
    if (/is it true|myth|really|actually/.test(q) && id === 'meera') score += 4
    if (/latest|2025|2026|new|recent|current/.test(q) && id === 'arjun') score += 4
    if (/idea|creative|brainstorm|innovate|design/.test(q) && id === 'deva') score += 4
    if (/explain|what is|how does|why|understand/.test(q) && id === 'kushi') score += 3
    scores[id] = score
  }

  // Sort by relevance score, take top 4-6
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  
  // Always include at least: jay (facts), vijay (analysis), and top scorers
  const mustHave = ['jay', 'vijay']
  const selected = new Set(mustHave)
  
  for (const [id] of sorted) {
    if (selected.size >= 6) break
    selected.add(id)
  }

  // Minimum 4 agents
  if (selected.size < 4) {
    for (const [id] of sorted) {
      if (selected.size >= 4) break
      selected.add(id)
    }
  }

  return Array.from(selected)
}

/**
 * Run the full research pipeline.
 * Returns an SSE-compatible async generator that yields progress + final synthesis.
 */
export async function* runDeepResearch({ messages, plan = 'free', withCouncil = false }) {
  const userQuery = [...messages].reverse().find(m => m.role === 'user')?.content || ''
  if (!userQuery.trim()) {
    yield { type: 'error', content: 'No query provided for research' }
    return
  }

  // Phase 1: Manager assigns relevant agents
  const assignedIds = assignAgents(userQuery)
  const assignedAgents = assignedIds.map(id => AGENTS[id]).filter(Boolean)

  yield {
    type: 'research_start',
    agents: assignedAgents.map(a => ({ id: a.id, name: a.name, role: a.role })),
    total: assignedAgents.length,
  }

  // Phase 2: Dispatch to assigned agents in parallel
  const agentPromises = assignedAgents.map(async (agent) => {
    try {
      const result = await llmGateway.completeNonStream({
        messages: [
          { role: 'system', content: agent.system },
          { role: 'user', content: userQuery },
        ],
        model: agent.model,
        temperature: 0.7,
        plan,
      })
      return { id: agent.id, name: agent.name, role: agent.role, content: result.content || '(no response)', success: true }
    } catch (err) {
      return { id: agent.id, name: agent.name, role: agent.role, content: `Failed: ${err.message}`, success: false }
    }
  })

  const agentResults = await Promise.all(agentPromises)

  // Yield individual agent completions for progress UI
  for (const result of agentResults) {
    yield { type: 'agent_done', agent: result.id, name: result.name, role: result.role, success: result.success }
  }

  const successfulResults = agentResults.filter(r => r.success)
  if (successfulResults.length === 0) {
    yield { type: 'error', content: 'All research agents failed. Please try again.' }
    return
  }

  // Phase 3: Manager synthesizes
  yield { type: 'synthesizing', manager: 'Codic', agentCount: successfulResults.length }

  const synthesisContext = successfulResults
    .map(r => `═══ ${r.name} (${r.role}) ═══\n${r.content}`)
    .join('\n\n')

  const managerMessages = [
    { role: 'system', content: MANAGER_SYSTEM },
    {
      role: 'user',
      content: `QUERY: "${userQuery}"\n\n` +
        `${assignedAgents.length} agents researched this. Here are their findings:\n\n` +
        `${synthesisContext}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Synthesize the BEST possible answer. Be exceptional.`,
    },
  ]

  // Stream the manager's synthesis
  const generator = await llmGateway.complete({
    messages: managerMessages,
    model: 'gemini/gemini-2.5-flash',
    temperature: 0.6,
    plan,
  })

  let synthesisText = ''
  for await (const chunk of generator) {
    if (chunk.type === 'token') {
      synthesisText += chunk.content
      yield { type: 'token', content: chunk.content }
    }
  }

  // Phase 4 (Optional): Council validation — if withCouncil=true, run council on the synthesis
  if (withCouncil && synthesisText.length > 100) {
    yield { type: 'council_validation', status: 'starting' }

    try {
      // Ask 2 different models to critique/improve the synthesis
      const [critiqueA, critiqueB] = await Promise.all([
        llmGateway.completeNonStream({
          messages: [
            { role: 'system', content: 'You are a fact-checker. Review this answer for accuracy and completeness. If it\'s excellent, say "APPROVED". If you find issues, state them briefly (max 80 words).' },
            { role: 'user', content: `Question: "${userQuery}"\n\nAnswer to review:\n${synthesisText.slice(0, 2000)}` },
          ],
          model: 'groq/llama-3.3-70b',
          temperature: 0.3,
          plan,
        }),
        llmGateway.completeNonStream({
          messages: [
            { role: 'system', content: 'You are a completeness auditor. Is this answer missing anything important? If complete, say "COMPLETE". If missing something, state it briefly (max 60 words).' },
            { role: 'user', content: `Question: "${userQuery}"\n\nAnswer to audit:\n${synthesisText.slice(0, 2000)}` },
          ],
          model: 'groq/llama-3.3-70b',
          temperature: 0.3,
          plan,
        }),
      ])

      const needsRevision = critiqueA.content && !critiqueA.content.includes('APPROVED') &&
                            critiqueB.content && !critiqueB.content.includes('COMPLETE')

      if (needsRevision) {
        yield { type: 'council_validation', status: 'revising' }
        // Quick revision pass
        const revisionResult = await llmGateway.completeNonStream({
          messages: [
            { role: 'system', content: 'You are an editor. Apply these critiques to improve the answer. Output the improved version only. Keep the same structure and length.' },
            { role: 'user', content: `Original answer:\n${synthesisText.slice(0, 3000)}\n\nCritique 1: ${critiqueA.content}\nCritique 2: ${critiqueB.content}\n\nImproved answer:` },
          ],
          model: 'gemini/gemini-2.5-flash',
          temperature: 0.4,
          plan,
        })
        if (revisionResult.content && revisionResult.content.length > synthesisText.length * 0.5) {
          yield { type: 'revision', content: revisionResult.content }
        }
      }

      yield { type: 'council_validation', status: 'done' }
    } catch {
      // Council validation is optional — don't fail the whole response
      yield { type: 'council_validation', status: 'skipped' }
    }
  }

  yield { type: 'research_done', agentCount: successfulResults.length, total: assignedAgents.length }
}

/**
 * Non-streaming version for API consumption.
 */
export async function runDeepResearchSync({ messages, plan = 'free', withCouncil = false }) {
  let fullText = ''
  const agents = []

  for await (const chunk of runDeepResearch({ messages, plan, withCouncil })) {
    if (chunk.type === 'token') fullText += chunk.content
    if (chunk.type === 'revision') fullText = chunk.content // replace with revised version
    if (chunk.type === 'agent_done') agents.push(chunk)
  }

  return { content: fullText, agents, model: 'research/multi-agent' }
}
