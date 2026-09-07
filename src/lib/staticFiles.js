import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const CONTENT_TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

export function createStaticServer(publicDir) {
  return async function serveStatic(request, response) {
    const requested = request.url === '/' ? '/index.html' : request.url.split('?')[0];
    const relativePath = requested.replace(/^\/+/, '');
    const candidate = normalize(join(publicDir, relativePath));
    const safePath = candidate.startsWith(publicDir) ? candidate : join(publicDir, 'index.html');
    try {
      const content = await readFile(safePath);
      response.writeHead(200, { 'Content-Type': `${CONTENT_TYPES[extname(safePath)] || 'application/octet-stream'}; charset=utf-8` });
      response.end(content);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  };
}
