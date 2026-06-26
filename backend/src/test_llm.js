import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testModel(modelId) {
  const { llmGateway } = await import('./services/llm/gateway.js');
  const messages = [
    { role: 'user', content: 'Say hello in 3 words' }
  ];
  console.log(`\n--- Testing ${modelId} ---`);
  try {
    const stream = llmGateway.complete({ messages, model: modelId });
    for await (const chunk of stream) {
      console.log('Chunk:', chunk);
    }
  } catch (err) {
    console.error(`Error running ${modelId}:`, err);
  }
}

async function run() {
  await testModel('openrouter/gpt-4o-mini');
  await testModel('groq/llama-3.3-70b');
  await testModel('gemini/gemini-2.5-flash');
  await testModel('nvidia/llama-3.1-nemotron-70b');
  await testModel('huggingface/meta-llama/Llama-3.3-70B-Instruct');
}

run();

