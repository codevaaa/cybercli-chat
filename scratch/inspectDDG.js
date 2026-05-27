// Using native fetch

async function testScraping() {
  const query = 'cybersecurity trends 2026';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
    }
  });
  
  console.log('Response Status:', res.status);
  console.log('Response Headers:', res.headers);
  const text = await res.text();
  console.log('HTML Length:', text.length);
  console.log('Preview of HTML (first 500 chars):', text.substring(0, 500));
  console.log('Contains result body?', text.includes('result__body'));
}

testScraping().catch(console.error);
