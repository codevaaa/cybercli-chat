import './src/config/env.js';
import { generateGeminiTTS } from './src/services/tts/gemini-tts.js';
import fs from 'fs';

console.log('Testing generateGeminiTTS...');
console.time('TTS Generation');
try {
  // Let's test with 'gemini_flash' (which maps to Aoede)
  const buffer = await generateGeminiTTS('Hello, this is a direct test of the Google Gemini Flash Text-to-Speech system.', 'gemini_flash');
  console.timeEnd('TTS Generation');
  console.log(`Success! Received ${buffer.length} bytes.`);
  fs.writeFileSync('./test_out_direct.wav', buffer);
  console.log('Saved to test_out_direct.wav');
} catch (err) {
  console.error('Error during generateGeminiTTS:', err);
}
