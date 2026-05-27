import dotenv from 'dotenv';
dotenv.config();

import { llmGateway } from '../src/services/llm/gateway.js';

async function test() {
  const messages = [
    { role: 'user', content: 'Say hello in 3 words' }
  ];
  
  console.log('Testing llmGateway with model: openrouter/gpt-4o-mini');
  try {
    const stream = llmGateway.complete({ messages, model: 'openrouter/gpt-4o-mini' });
    for await (const chunk of stream) {
      console.log('Chunk:', chunk);
    }
  } catch (err) {
    console.error('Error running completion:', err);
  }
}

test();
