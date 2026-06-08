import { MemoryManager } from './memory.js';
import { SecretScanner } from './secretScanner.js';
import fetch from 'node-fetch'; // or global fetch depending on node version

// Environment variables should hold these keys
const KEYS = {
  opencode: process.env.OPENCODE_API_KEY || '',
  huggingface: process.env.HF_API_KEY || '',
  llm7: process.env.LLM7_API_KEY || '',
  openrouter: process.env.OPENROUTER_API_KEY || '',
  mistral: process.env.MISTRAL_API_KEY || '',
  groq: process.env.GROQ_API_KEY || ''
};

const ENDPOINTS = {
  opencode: 'https://opencode.ai/zen/v1/chat/completions',
  huggingface: 'https://api-inference.huggingface.co/models/', // Appended with model name later
  llm7: 'https://api.llm7.io/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions'
};

/**
 * Generic API Call wrapper for LLMs
 */
async function callAgent(provider, model, rawSystemPrompt, rawUserPrompt, usageTracker = null, opts = {}) {
  // 🛡️ 100% Secure Coding: Redact any accidentally exposed secrets before hitting the LLM
  const systemPrompt = SecretScanner.redact(rawSystemPrompt);
  const userPrompt = typeof rawUserPrompt === 'string' ? SecretScanner.redact(rawUserPrompt) : rawUserPrompt;
  const url = provider === 'huggingface' ? ENDPOINTS.huggingface + model : ENDPOINTS[provider];
  const headers = {
    'Authorization': `Bearer ${KEYS[provider]}`,
    'Content-Type': 'application/json'
  };
  
  let body;
  if (provider === 'huggingface') {
    // Basic HuggingFace Serverless inference format
    body = JSON.stringify({ inputs: `${systemPrompt}\n\n${userPrompt}` });
  } else {
    // OpenAI compatible format (used by OpenRouter, Groq, Opencode, LLM7, Mistral)
    const msgs = [{ role: 'system', content: systemPrompt }];
    if (Array.isArray(userPrompt)) {
      // If userPrompt is an array of messages, append them
      msgs.push(...userPrompt);
    } else {
      msgs.push({ role: 'user', content: userPrompt });
    }
    
    body = JSON.stringify({
      model: model,
      messages: msgs,
      temperature: 0.2,
      ...(opts.tools && { tools: opts.tools })
    });
  }

  const start = Date.now();
  try {
    const response = await fetch(url, { method: 'POST', headers, body });
    const data = await response.json();
    const timeTaken = Date.now() - start;

    let textOutput = '';
    let tokensIn = 0, tokensOut = 0;

    if (provider === 'huggingface') {
      textOutput = data[0]?.generated_text || JSON.stringify(data);
      // Rough estimate for huggingface if it doesn't return usage
      tokensIn = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
      tokensOut = Math.ceil(textOutput.length / 4);
    } else {
      const choice = data.choices?.[0];
      if (choice?.message?.tool_calls) {
        if (usageTracker && usageTracker.trackUsage) {
          await usageTracker.trackUsage(model, provider, data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0, 0, timeTaken);
        }
        return { tool_calls: choice.message.tool_calls, textOutput: choice.message.content || '' };
      }
      textOutput = choice?.message?.content || JSON.stringify(data);
      tokensIn = data.usage?.prompt_tokens || 0;
      tokensOut = data.usage?.completion_tokens || 0;
    }

    if (usageTracker && usageTracker.trackUsage) {
      await usageTracker.trackUsage(model, provider, tokensIn, tokensOut, 0, timeTaken);
    }

    return textOutput;
  } catch (error) {
    console.error(`Agent ${model} failed:`, error);
    return `[Agent Error: ${error.message}]`;
  }
}

/**
 * The Swarm Orchestrator
 */
export class SwarmOrchestrator {
  
  /**
   * Run the Trinity Tier (Free)
   */
  static async runTrinity(sessionId, prompt, usageTracker, onEvent = () => {}, opts = {}) {
    const isToolContinuation = opts.messages && opts.messages.length > 0 && opts.messages[opts.messages.length - 1].role === 'tool';
    
    if (!isToolContinuation) {
      MemoryManager.appendHistory(sessionId, 'user', prompt);
    }
    const sessionContext = JSON.stringify(MemoryManager.getSwarmContext(sessionId));

    let plan = MemoryManager.getSwarmContext(sessionId)?.plan;
    let contextInfo = MemoryManager.getSwarmContext(sessionId)?.context;

    if (!isToolContinuation) {
      // 1. Planner
      onEvent({ type: 'status', message: '🤔 Trinity Planner is analyzing the task...' });
      plan = await callAgent('groq', 'llama-3.1-70b-versatile', 
        'You are the Planner Agent. Break this task into small logic steps. You ONLY have Read-Only tools available (read_file, list_dir, grep, semantic_search). DO NOT attempt to write code.', prompt, usageTracker);
      MemoryManager.updatePlan(sessionId, plan);

      // 2. Context
      onEvent({ type: 'status', message: '📂 Context Agent is reading your codebase...' });
      contextInfo = await callAgent('opencode', 'deepseek-v4-flash',
        `You are Context Agent. Extract important variables given this plan: ${plan}. You ONLY have Read-Only tools available.`, prompt, usageTracker);
      MemoryManager.updateContext(sessionId, contextInfo, []);
    }

    // 3. Developer (Now supports tools and continuation)
    onEvent({ type: 'status', message: '💻 Developer Agent is writing the code...' });
    const devPrompt = isToolContinuation ? opts.messages : prompt;
    const devCode = await callAgent('groq', 'llama-3.1-70b-versatile',
      `You are Developer Agent. Write code based on Context: ${contextInfo}. You have full Read/Write access (write_file, edit, run_command).`, devPrompt, usageTracker, opts);

    if (devCode && devCode.tool_calls) {
      return devCode; // Pause swarm and return tool calls to CLI
    }

    // 4. Synthesizer
    onEvent({ type: 'status', message: '✨ Synthesizing final output...' });
    const finalOutput = await callAgent('opencode', 'deepseek-v4-flash',
      `You are the Synthesizer. Review Developer Code: ${devCode}. Give the final perfect output to the user. Do not use tools.`, prompt, usageTracker);
    
    MemoryManager.appendHistory(sessionId, 'assistant', finalOutput);
    return finalOutput;
  }

  /**
   * Run the Abhimanyu Tier (Basic Paid)
   */
  static async runAbhimanyu(sessionId, prompt, usageTracker, onEvent = () => {}, opts = {}) {
    const isToolContinuation = opts.messages && opts.messages.length > 0 && opts.messages[opts.messages.length - 1].role === 'tool';
    if (!isToolContinuation) {
      MemoryManager.appendHistory(sessionId, 'user', prompt);
      onEvent({ type: 'status', message: '🧠 Abhimanyu is planning the approach...' });
      const plan = await callAgent('groq', 'llama-3.1-70b-versatile', 'Plan this:', prompt, usageTracker);
      MemoryManager.updatePlan(sessionId, plan);
    }
    
    let plan = MemoryManager.getSwarmContext(sessionId)?.plan || '';

    onEvent({ type: 'status', message: '⚡ Fetching context and writing code in parallel...' });
    const contextPromise = isToolContinuation ? Promise.resolve(MemoryManager.getSwarmContext(sessionId)?.context) : callAgent('openrouter', 'moonshotai/kimi-k2.6:free', 'Read codebase context.', plan + prompt, usageTracker);
    
    const devPrompt = isToolContinuation ? opts.messages : plan + prompt;
    const devPromise = callAgent('huggingface', 'google/gemma-4-12B-it', 'Write code.', devPrompt, usageTracker, opts);
    
    const [context, code] = await Promise.all([contextPromise, devPromise]);
    if (!isToolContinuation) MemoryManager.updateContext(sessionId, context, []);

    if (code && code.tool_calls) return code;

    onEvent({ type: 'status', message: '🛡️ Reviewing code logic...' });
    const review = await callAgent('opencode', 'deepseek-v4-flash', 'Review this code:', code, usageTracker);

    onEvent({ type: 'status', message: '✨ Generating final response...' });
    const finalOutput = await callAgent('llm7', 'qwen3-235b', 
      `Synthesize. Context: ${context}\nCode: ${code}\nReview: ${review}`, prompt, usageTracker);
      
    MemoryManager.appendHistory(sessionId, 'assistant', finalOutput);
    return finalOutput;
  }

  /**
   * Run the Kali Tier (Standard Paid)
   */
  static async runKali(sessionId, prompt, usageTracker, onEvent = () => {}, opts = {}) {
    const isToolContinuation = opts.messages && opts.messages.length > 0 && opts.messages[opts.messages.length - 1].role === 'tool';
    if (!isToolContinuation) {
      MemoryManager.appendHistory(sessionId, 'user', prompt);
      onEvent({ type: 'status', message: '🗡️ Kali is dissecting the request...' });
      const plan = await callAgent('groq', 'mixtral-8x7b-32768', 'Plan this:', prompt, usageTracker);
      MemoryManager.updatePlan(sessionId, plan);
    }
    
    let plan = MemoryManager.getSwarmContext(sessionId)?.plan || '';
    
    onEvent({ type: 'status', message: '🔍 Parallel execution: Context retrieval & Code Generation...' });
    const contextP = isToolContinuation ? Promise.resolve(MemoryManager.getSwarmContext(sessionId)?.context) : callAgent('openrouter', 'moonshotai/kimi-k2.6:free', 'Context summary', prompt, usageTracker);
    
    const devPrompt = isToolContinuation ? opts.messages : prompt + "\nPlan: " + plan;
    const devP = callAgent('mistral', 'codestral-latest', 'Write code', devPrompt, usageTracker, opts);
    const [context, code] = await Promise.all([contextP, devP]);
    if (!isToolContinuation) MemoryManager.updateContext(sessionId, context, []);

    if (code && code.tool_calls) return code;
    
    onEvent({ type: 'status', message: '🔒 Running security analysis on generated code...' });
    const review = await callAgent('opencode', 'deepseek-v4-flash', 'Security check this code:', code, usageTracker);

    onEvent({ type: 'status', message: '✨ Assembling bulletproof output...' });
    const finalOutput = await callAgent('llm7', 'deepseek-v4-flash', 
      `You are CEO. Combine context, code, review perfectly. Context: ${context}\nCode: ${code}\nReview: ${review}`, prompt, usageTracker);

    MemoryManager.appendHistory(sessionId, 'assistant', finalOutput);
    return finalOutput;
  }

  /**
   * Run the MADHAV Tier (Pro Paid - Opus Killer)
   */
  static async runMadhav(sessionId, prompt, usageTracker, onEvent = () => {}, opts = {}) {
    const isToolContinuation = opts.messages && opts.messages.length > 0 && opts.messages[opts.messages.length - 1].role === 'tool';
    
    if (!isToolContinuation) {
      MemoryManager.appendHistory(sessionId, 'user', prompt);
      
      // Step 1
      onEvent({ type: 'status', message: '👑 Madhav Planner & Tool Router initializing...' });
      const planP = callAgent('groq', 'llama-3.1-70b-versatile', 'You are the Planner.', prompt, usageTracker);
      const toolP = callAgent('mistral', 'mistral-vibe-cli-with-tools', 'You are the Tool Router.', prompt, usageTracker);
      const [plan, tools] = await Promise.all([planP, toolP]);
      MemoryManager.updatePlan(sessionId, plan);

      // Step 2
      onEvent({ type: 'status', message: '📚 Context Agent (Kimi) scanning deep workspace memory...' });
      const context = await callAgent('llm7', 'kimi-k2.6', 'Read the massive context.', tools + prompt, usageTracker);
      MemoryManager.updateContext(sessionId, context, []);
    }

    const plan = MemoryManager.getSwarmContext(sessionId)?.plan || '';
    const context = MemoryManager.getSwarmContext(sessionId)?.context || '';

    // Step 3
    onEvent({ type: 'status', message: '⚙️ Swarm executing: Dev (DeepSeek 671B), Sec (Llama 3.3 70B), Review (Nemotron 550B)...' });
    const devPrompt = isToolContinuation ? opts.messages : plan + context;
    const devP = callAgent('llm7', 'deepseek-v3.1:671b-terminus', 'Algorithmic code writer.', devPrompt, usageTracker, opts);
    
    const secP = isToolContinuation ? Promise.resolve('') : callAgent('openrouter', 'meta-llama/llama-3.3-70b-instruct:free', 'Security tester.', plan + context, usageTracker);
    const reviewP = isToolContinuation ? Promise.resolve('') : callAgent('huggingface', 'nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16', 'Instruction adherence reviewer.', plan + context, usageTracker);
    
    const [code, security, review] = await Promise.all([devP, secP, reviewP]);

    if (code && code.tool_calls) return code;

    if (!isToolContinuation) MemoryManager.addSecurityAlert(sessionId, security);

    // Step 4
    onEvent({ type: 'status', message: '✨ Madhav CEO (DeepSeek-V4-Pro) synthesizing the ultimate response...' });
    const finalPrompt = `
      PLAN: ${plan}
      CONTEXT: ${context}
      DEVELOPER CODE: ${code}
      SECURITY ALERTS: ${security}
      NEMOTRON REVIEW: ${review}
      
      You are Madhav's CEO (DeepSeek-V4-Pro). Combine these into the absolute perfect flawless output.
    `;
    const finalOutput = await callAgent('huggingface', 'deepseek-ai/DeepSeek-V4-Pro', 'You are the Supreme Synthesizer.', finalPrompt + prompt, usageTracker);

    MemoryManager.appendHistory(sessionId, 'assistant', finalOutput);
    return finalOutput;
  }

  static async processRequest(tier, sessionId, prompt, usageTracker, onEvent, opts = {}) {
    // 🚀 THE VIBED CODER UPGRADE 🚀
    // If the CLI passes `tools`, it means it's running the advanced Agentic ReAct Loop (`agent-loop.ts`).
    // We MUST bypass the legacy linear pipeline (Planner->Context->Dev->Synthesizer) to allow the 
    // CLI to recursively think -> call tool -> parse error -> think again continuously.
    if (opts.tools && opts.tools.length > 0) {
      onEvent({ type: 'status', message: `🤖 Agentic Loop Active: Proxying to ${tier} model...` });
      
      // Determine the best model and provider based on the tier requested
      let provider = 'opencode';
      let model = 'deepseek-v4-flash';
      
      switch (tier.toLowerCase()) {
        case 'madhav': provider = 'huggingface'; model = 'deepseek-ai/DeepSeek-V4-Pro'; break;
        case 'kali': provider = 'llm7'; model = 'deepseek-v4-flash'; break;
        case 'abhimanyu': provider = 'llm7'; model = 'qwen3-235b'; break;
        case 'trinity': provider = 'groq'; model = 'llama-3.3-70b-versatile'; break;
      }
      
      // Pass the entire message history and tools directly to the model
      return await callAgent(provider, model, 'You are CyberCoder, a fullstack agentic coding assistant running inside a terminal.', opts.messages, usageTracker, opts);
    }

    // Legacy pipeline for older clients or non-tool requests
    switch (tier.toLowerCase()) {
      case 'madhav': return await this.runMadhav(sessionId, prompt, usageTracker, onEvent, opts);
      case 'kali': return await this.runKali(sessionId, prompt, usageTracker, onEvent, opts);
      case 'abhimanyu': return await this.runAbhimanyu(sessionId, prompt, usageTracker, onEvent, opts);
      case 'trinity': return await this.runTrinity(sessionId, prompt, usageTracker, onEvent, opts);
      default: return await this.runTrinity(sessionId, prompt, usageTracker, onEvent, opts);
    }
  }
}

