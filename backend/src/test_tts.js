import dotenv from 'dotenv';
dotenv.config();

async function test() {
  console.log('Testing generateGeminiTTS dynamically with gemini-2.5-flash...');
  try {
    const { generateGeminiTTS } = await import('./services/tts/gemini-tts.js');
    const audio = await generateGeminiTTS('Hello, this is a test of the Gemini Text to Speech system.', 'ava');
    console.log('Gemini TTS generated audio successfully! Buffer length:', audio.length);
  } catch (err) {
    console.error('Gemini TTS failed:', err);
  }
}

test();
