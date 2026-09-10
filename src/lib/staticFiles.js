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
      // Sem isso, nenhum cabecalho de cache ia junto -- sem Cache-Control nem
      // Last-Modified/ETag pra revalidar, cada navegador/WebView decide por
      // conta propria quanto tempo guardar isso, e de forma diferente entre
      // eles. E o candidato mais forte pra explicar o padrao relatado varias
      // vezes: o site funcionando certinho no Chrome (que revalida mais
      // agressivamente) mas o WebView do app nativo continuando preso numa
      // versao antiga de app.js/styles.css/sw.js mesmo depois de reinstalar o
      // APK -- o app nativo so troca de APK, nunca limpa o cache HTTP do
      // WebView sozinho. no-cache forca toda requisicao a revalidar com o
      // servidor antes de usar uma copia guardada, entao a pessoa sempre
      // recebe a versao publicada mais recente.
      response.writeHead(200, { 'Content-Type': `${CONTENT_TYPES[extname(safePath)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache' });
      response.end(content);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  };
}
