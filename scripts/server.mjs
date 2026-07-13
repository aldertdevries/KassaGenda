// Minimale statische webserver voor lokaal testen: node scripts/server.mjs [poort]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const poort = Number(process.argv[2]) || 8321;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.md': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    const pad = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const relatief = normalize(pad === '/' ? '/index.html' : pad).replace(/^([\\/.])+/, '');
    const inhoud = await readFile(join(root, relatief));
    res.writeHead(200, { 'Content-Type': types[extname(relatief)] || 'application/octet-stream' });
    res.end(inhoud);
  } catch {
    res.writeHead(404); res.end('Niet gevonden');
  }
}).listen(poort, () => console.log(`OberPoes op http://localhost:${poort}`));
