import fs from 'fs';

async function debugHtml() {
  const query = 'cybersecurity trends 2026';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
    }
  });
  
  const text = await res.text();
  fs.writeFileSync('../scratch/ddg.html', text);
  console.log('Saved HTML to scratch/ddg.html');
  
  // Find where search results start
  const idx = text.indexOf('result');
  if (idx !== -1) {
    console.log('Found "result" at index:', idx);
    console.log('Around index:', text.substring(idx - 100, idx + 400));
  } else {
    console.log('"result" not found anywhere in HTML!');
  }
}

debugHtml().catch(console.error);
