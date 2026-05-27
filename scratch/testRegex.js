import fs from 'fs';

function testRegex() {
  const html = fs.readFileSync('../scratch/ddg.html', 'utf8');
  console.log('HTML Loaded. Length:', html.length);
  
  // Find all titles
  const titleRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
  // Find all snippets
  const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
  
  const titles = {}; // href -> title
  const snippets = {}; // href -> snippet
  
  let match;
  while ((match = titleRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    titles[href] = text;
  }
  
  while ((match = snippetRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    snippets[href] = text;
  }
  
  console.log('Total titles found:', Object.keys(titles).length);
  console.log('Total snippets found:', Object.keys(snippets).length);
  
  const results = [];
  // Merge by href
  for (const href of Object.keys(titles)) {
    const title = titles[href];
    const snippet = snippets[href] || '';
    let link = href;
    if (link.includes('uddg=')) {
      const redirectMatch = /uddg=([^&]*)/.exec(link);
      if (redirectMatch) {
        link = decodeURIComponent(redirectMatch[1]);
      }
    }
    if (link.startsWith('//')) link = 'https:' + link;
    
    results.push({ title, snippet, link });
  }
  
  console.log('Parsed Results:');
  console.log(results.slice(0, 5));
}

testRegex();
