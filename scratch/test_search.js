async function test() {
  const query = 'cybersecurity';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
    }
  });
  console.log('Status:', res.status);
  const html = await res.text();
  console.log('HTML Length:', html.length);
  
  const titleRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
  
  const titles = {};
  const snippets = {};
  
  let match;
  let titleCount = 0;
  while ((match = titleRegex.exec(html)) !== null) {
    titleCount++;
    const href = match[1];
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    titles[href] = text;
  }
  
  let snippetCount = 0;
  while ((match = snippetRegex.exec(html)) !== null) {
    snippetCount++;
    const href = match[1];
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    snippets[href] = text;
  }
  
  console.log('Titles found:', titleCount, Object.keys(titles).length);
  console.log('Snippets found:', snippetCount, Object.keys(snippets).length);
  
  if (titleCount === 0) {
    console.log('Sample HTML:', html.slice(0, 2000));
  }
}
test();
