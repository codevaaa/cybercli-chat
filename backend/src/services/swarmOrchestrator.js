import { MemoryManager } from './memory.js';
import { SecretScanner } from './secretScanner.js';
import { getKey, reportFailure, reportSuccess } from './llm/keyPool.js';
import fetch from 'node-fetch'; 

const ENDPOINTS = {
  opencode: 'https://opencode.ai/zen/v1/chat/completions',
  huggingface: 'https://api-inference.huggingface.co/models/',
  llm7: 'https://api.llm7.io/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions'
};

/**
 * Generic API Call wrapper for LLMs with Key Rotation tracking
 */
async function callAgent(provider, model, rawSystemPrompt, rawUserPrompt, usageTracker = null, opts = {}) {
  const systemPrompt = SecretScanner.redact(rawSystemPrompt);
  const userPrompt = typeof rawUserPrompt === 'string' ? SecretScanner.redact(rawUserPrompt) : rawUserPrompt;
  
  const url = provider === 'huggingface' ? ENDPOINTS.huggingface + model : ENDPOINTS[provider];
  const apiKey = getKey(provider);
  
  if (!apiKey) {
    throw new Error(`[API_ERROR] No keys configured for ${provider}`);
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  
  let body;
  if (provider === 'huggingface') {
    body = JSON.stringify({ inputs: `${systemPrompt}\n\n${userPrompt}` });
  } else {
    const msgs = [{ role: 'system', content: systemPrompt }];
    if (Array.isArray(userPrompt)) {
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
    
    // Rate limit / Auth failure tracking for Key Rotation
    if (response.status === 429 || response.status === 401 || response.status === 403) {
      reportFailure(provider, apiKey, response.status);
      throw new Error(`[HTTP_${response.status}] ${provider} rate limited or auth failed.`);
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP error ${response.status}`);
    }

    reportSuccess(provider, apiKey); // Record successful use

    const timeTaken = Date.now() - start;
    let textOutput = '';
    let tokensIn = 0, tokensOut = 0;

    if (provider === 'huggingface') {
      textOutput = data[0]?.generated_text || JSON.stringify(data);
      tokensIn = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
      tokensOut = Math.ceil(textOutput.length / 4);
    } else {
      const choice = data.choices?.[0];
      if (choice?.message?.tool_calls) {
        tokensIn = data.usage?.prompt_tokens || 0;
        tokensOut = data.usage?.completion_tokens || 0;
        
        let toolCost = (tokensIn / 1000) * 0.0001 + (tokensOut / 1000) * 0.0002;
        if (usageTracker && usageTracker.trackUsage) {
          await usageTracker.trackUsage(model, provider, tokensIn, tokensOut, toolCost, timeTaken);
        }
        
        if (opts.returnFull) {
          return { tool_calls: choice.message.tool_calls, textOutput: choice.message.content || '', tokens: { input: tokensIn, output: tokensOut }, cost: toolCost, provider, model };
        }
        return { tool_calls: choice.message.tool_calls, textOutput: choice.message.content || '' };
      }
      textOutput = choice?.message?.content || JSON.stringify(data);
      tokensIn = data.usage?.prompt_tokens || 0;
      tokensOut = data.usage?.completion_tokens || 0;
    }

    let cost = (tokensIn / 1000) * 0.0001 + (tokensOut / 1000) * 0.0002;

    if (usageTracker && usageTracker.trackUsage) {
      await usageTracker.trackUsage(model, provider, tokensIn, tokensOut, cost, timeTaken);
    }

    if (opts.returnFull) {
      return { textOutput, tokens: { input: tokensIn, output: tokensOut }, cost, provider, model };
    }

    return textOutput;
  } catch (error) {
    console.error(`Agent ${model} failed:`, error.message);
    throw error; // Let load balancer handle the cascade
  }
}

/**
 * The Unstoppable MADHAV Orchestrator
 */
export class SwarmOrchestrator {
  
  static async processRequest(tier, sessionId, prompt, usageTracker, onEvent, opts = {}) {
    // 🚀 MADHAV LOAD BALANCER (12-Model Pool) 🚀
    // This pool uses the massive list of providers and dynamically cascades if any fail.
    
    // We only support MADHAV now.
    const requestedTier = tier?.toLowerCase() === 'madhav' ? 'MADHAV' : 'MADHAV';

    onEvent({ type: 'status', message: `🤖 MADHAV Engine Active: Routing request...` });
      
    const tryProxy = async (prov, mod) => {
      // If we have tools, we pass the messages directly as standard OpenAI ReAct.
      // If not, we just pass the prompt.
      const payload = opts.messages && opts.messages.length > 0 ? opts.messages : prompt;
      
      const res = await callAgent(
        prov, 
        mod, 
        'You are MADHAV, an elite fullstack agentic coding assistant.', 
        payload, 
        usageTracker, 
        { ...opts, returnFull: true }
      );
      
      const errorCheckStr = typeof res === 'string' ? res : (res.textOutput || '');
      if (errorCheckStr && (
        errorCheckStr.includes('"error"') || 
        errorCheckStr.includes('[Agent Error:') ||
        errorCheckStr.includes('"status":401') ||
        errorCheckStr.includes('"Unauthorized"') ||
        errorCheckStr.includes('Authentication failed') ||
        errorCheckStr.includes('"detail":')
      )) {
        throw new Error("Provider returned JSON error internally.");
      }
      return res;
    };

    // The 12-Model Power Pool (Late 2026 Beast Tier)
    const madhavPool = [
      { provider: 'opencode', model: 'deepseek-v4-pro', desc: "DeepSeek V4 Pro" },
      { provider: 'gemini', model: 'gemini-2.5-pro', desc: "Gemini 2.5 Pro" },
      { provider: 'opencode', model: 'qwen3.7-max', desc: "Qwen 3.7 Max" },
      { provider: 'llm7', model: 'deepseek-v3.1:671b-terminus', desc: "DeepSeek Terminus" },
      { provider: 'openrouter', model: 'qwen/qwen3-coder:free', desc: "Qwen 3 Coder" },
      { provider: 'nvidia', model: 'meta/llama-3.1-70b-instruct', desc: "Nemotron 70B" },
      { provider: 'groq', model: 'llama-3.3-70b-versatile', desc: "Llama 3.3 70B (Groq)" },
      { provider: 'openrouter', model: 'moonshotai/kimi-k2.6:free', desc: "Kimi 2.6" },
      { provider: 'apifreellm', model: 'claude-3.5-sonnet', desc: "Claude 3.5 Sonnet Proxy" },
      { provider: 'gemini', model: 'gemini-2.5-flash', desc: "Gemini 2.5 Flash" },
      { provider: 'huggingface', model: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B', desc: "DeepSeek R1 70B" },
      { provider: 'openrouter', model: 'qwen/qwen3-next-80b-a3b-instruct:free', desc: "Qwen 3 Next 80B" }
    ];

    // Pick a starting point randomly from top 3 to distribute load, 
    // but keep fallback order intact.
    const startIdx = Math.floor(Math.random() * 3);
    const fallbacks = [...madhavPool.slice(startIdx), ...madhavPool.slice(0, startIdx)];

    let failedAttempts = 0;
    for (const fb of fallbacks) {
      try {
        if (failedAttempts > 0) {
           onEvent({ type: 'status', message: `⚠️ Engine overloaded, cascading to ${fb.desc}...` });
        }
        return await tryProxy(fb.provider, fb.model);
      } catch (err) {
        failedAttempts++;
        console.error(`[MADHAV Load Balancer] ${fb.provider} (${fb.model}) node failed:`, err.message);
        continue; // cascade to next model
      }
    }
    
    // 🛡️ SANITIZED ERROR: If all 12 fail, never expose the providers
    console.error(`🚨 FATAL: All 12 nodes in MADHAV Pool failed.`);
    throw new Error(`The MADHAV AI Engine is currently undergoing maintenance or experiencing high server load. Please try again later.`);
  }
}
