import { createReadStream, stat } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }

  let filePath = resolve(projectRoot, `.${pathname}`);
  const relativePath = relative(projectRoot, filePath);
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || relativePath.startsWith(`..\\`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  stat(filePath, (error, fileInfo) => {
    if (!error && fileInfo.isDirectory()) filePath = join(filePath, 'index.html');
    stat(filePath, (fileError, info) => {
      if (fileError || !info.isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream' });
      createReadStream(filePath).pipe(response);
    });
  });
}).listen(Number(process.env.PORT || 8000), '127.0.0.1', () => {
  console.log(`Fieldnotes is running at http://localhost:${process.env.PORT || 8000}`);
});
