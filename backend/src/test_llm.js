import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const { llmGateway } = await import('./services/llm/gateway.js');
  
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

run();
