import { MemoryManager } from './memory.js';
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
async function callAgent(provider, model, systemPrompt, userPrompt, usageTracker = null) {
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
    body = JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2
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
      textOutput = data.choices?.[0]?.message?.content || JSON.stringify(data);
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
  static async runTrinity(sessionId, prompt, usageTracker, onEvent = () => {}) {
    MemoryManager.appendHistory(sessionId, 'user', prompt);
    const sessionContext = JSON.stringify(MemoryManager.getSwarmContext(sessionId));

    // 1. Planner
    onEvent({ type: 'status', message: '🤔 Trinity Planner is analyzing the task...' });
    const plan = await callAgent('groq', 'llama-3.1-70b-versatile', 
      'You are the Planner Agent. Break this task into small logic steps.', prompt, usageTracker);
    MemoryManager.updatePlan(sessionId, plan);

    // 2. Context
    onEvent({ type: 'status', message: '📂 Context Agent is reading your codebase...' });
    const contextInfo = await callAgent('opencode', 'qwen3.6-plus-free',
      `You are Context Agent. Extract important variables given this plan: ${plan}`, prompt, usageTracker);
    MemoryManager.updateContext(sessionId, contextInfo, []);

    // 3. Developer
    onEvent({ type: 'status', message: '💻 Developer Agent is writing the code...' });
    const devCode = await callAgent('opencode', 'minimax-m3-free',
      `You are Developer Agent. Write code based on Context: ${contextInfo}`, prompt, usageTracker);

    // 4. Synthesizer
    onEvent({ type: 'status', message: '✨ Synthesizing final output...' });
    const finalOutput = await callAgent('opencode', 'deepseek-v4-flash-free',
      `You are the Synthesizer. Review Developer Code: ${devCode}. Give the final perfect output to the user.`, prompt, usageTracker);
    
    MemoryManager.appendHistory(sessionId, 'assistant', finalOutput);
    return finalOutput;
  }

  /**
   * Run the Abhimanyu Tier (Basic Paid)
   */
  static async runAbhimanyu(sessionId, prompt, usageTracker, onEvent = () => {}) {
    MemoryManager.appendHistory(sessionId, 'user', prompt);

    onEvent({ type: 'status', message: '🧠 Abhimanyu is planning the approach...' });
    const plan = await callAgent('groq', 'llama-3.1-70b-versatile', 'Plan this:', prompt, usageTracker);
    MemoryManager.updatePlan(sessionId, plan);

    onEvent({ type: 'status', message: '⚡ Fetching context and writing code in parallel...' });
    const contextPromise = callAgent('openrouter', 'moonshotai/kimi-k2.6:free', 'Read codebase context.', plan + prompt, usageTracker);
    const devPromise = callAgent('huggingface', 'google/gemma-4-12B-it', 'Write code.', plan + prompt, usageTracker);
    
    const [context, code] = await Promise.all([contextPromise, devPromise]);
    MemoryManager.updateContext(sessionId, context, []);

    onEvent({ type: 'status', message: '🛡️ Reviewing code logic...' });
    const review = await callAgent('opencode', 'nemotron-3-ultra-free', 'Review this code:', code, usageTracker);

    onEvent({ type: 'status', message: '✨ Generating final response...' });
    const finalOutput = await callAgent('llm7', 'qwen3-235b', 
      `Synthesize. Context: ${context}\nCode: ${code}\nReview: ${review}`, prompt, usageTracker);
      
    MemoryManager.appendHistory(sessionId, 'assistant', finalOutput);
    return finalOutput;
  }

  /**
   * Run the Kali Tier (Standard Paid)
   */
  static async runKali(sessionId, prompt, usageTracker, onEvent = () => {}) {
    MemoryManager.appendHistory(sessionId, 'user', prompt);
    
    onEvent({ type: 'status', message: '🗡️ Kali is dissecting the request...' });
    const plan = await callAgent('groq', 'mixtral-8x7b-32768', 'Plan this:', prompt, usageTracker);
    
    onEvent({ type: 'status', message: '🔍 Parallel execution: Context retrieval & Code Generation...' });
    const contextP = callAgent('openrouter', 'moonshotai/kimi-k2.6:free', 'Context summary', prompt, usageTracker);
    const devP = callAgent('mistral', 'codestral-latest', 'Write code', prompt + "\nPlan: " + plan, usageTracker);
    const [context, code] = await Promise.all([contextP, devP]);
    
    onEvent({ type: 'status', message: '🔒 Running security analysis on generated code...' });
    const review = await callAgent('opencode', 'nemotron-3-super-free', 'Security check this code:', code, usageTracker);

    onEvent({ type: 'status', message: '✨ Assembling bulletproof output...' });
    const finalOutput = await callAgent('llm7', 'deepseek-v4-flash', 
      `You are CEO. Combine context, code, review perfectly. Context: ${context}\nCode: ${code}\nReview: ${review}`, prompt, usageTracker);

    MemoryManager.appendHistory(sessionId, 'assistant', finalOutput);
    return finalOutput;
  }

  /**
   * Run the MADHAV Tier (Pro Paid - Opus Killer)
   */
  static async runMadhav(sessionId, prompt, usageTracker, onEvent = () => {}) {
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

    // Step 3
    onEvent({ type: 'status', message: '⚙️ Swarm executing: Dev (DeepSeek 671B), Sec (Llama 3.3 70B), Review (Nemotron 550B)...' });
    const devP = callAgent('llm7', 'deepseek-v3.1:671b-terminus', 'Algorithmic code writer.', plan + context, usageTracker);
    const secP = callAgent('openrouter', 'meta-llama/llama-3.3-70b-instruct:free', 'Security tester.', plan + context, usageTracker);
    const reviewP = callAgent('huggingface', 'nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16', 'Instruction adherence reviewer.', plan + context, usageTracker);
    
    const [code, security, review] = await Promise.all([devP, secP, reviewP]);
    MemoryManager.addSecurityAlert(sessionId, security);

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

  /**
   * Main Router Endpoint
   */
  static async processRequest(tier, sessionId, prompt, usageTracker, onEvent) {
    switch (tier.toLowerCase()) {
      case 'madhav': return await this.runMadhav(sessionId, prompt, usageTracker, onEvent);
      case 'kali': return await this.runKali(sessionId, prompt, usageTracker, onEvent);
      case 'abhimanyu': return await this.runAbhimanyu(sessionId, prompt, usageTracker, onEvent);
      case 'trinity': return await this.runTrinity(sessionId, prompt, usageTracker, onEvent);
      default: return await this.runTrinity(sessionId, prompt, usageTracker, onEvent);
    }
  }
}

