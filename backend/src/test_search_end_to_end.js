import dotenv from 'dotenv';
dotenv.config();

import { performDeepResearch } from './utils/deepResearch.js';
import { performWebSearch } from './utils/webSearch.js';

async function test() {
  console.log('Testing performWebSearch...');
  try {
    const results = await performWebSearch('cybersecurity news');
    console.log('performWebSearch results count:', results.length);
    console.log('Sample result:', results[0]);
  } catch (err) {
    console.error('performWebSearch failed:', err);
  }

  console.log('\nTesting performDeepResearch...');
  try {
    const research = await performDeepResearch('cybersecurity news');
    console.log('Deep Research results count:', research.results.length);
    console.log('Total sources:', research.totalSources);
    console.log('Timestamp:', research.timestamp);
  } catch (err) {
    console.error('performDeepResearch failed:', err);
  }
}

test();
