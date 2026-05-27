import { performWebSearch } from '../backend/src/utils/webSearch.js';
import { performDeepResearch } from '../backend/src/utils/deepResearch.js';

async function run() {
  console.log('Testing performWebSearch...');
  const searchResult = await performWebSearch('cybersecurity trends 2026');
  console.log('Search Result:', searchResult);

  console.log('Testing performDeepResearch...');
  const researchResult = await performDeepResearch('quantum cryptography');
  console.log('Deep Research Result:', researchResult);
}

run().catch(console.error);
