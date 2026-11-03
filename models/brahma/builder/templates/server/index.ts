import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';

export { createApp } from './app.js';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, '127.0.0.1', () => {
    console.log(`API listening on 127.0.0.1:${port}`);
  });
}
