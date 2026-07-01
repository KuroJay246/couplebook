/**
 * MemoryBook Dev Server
 * Serves static files + auto-scans assets/photos and assets/videos
 * so any new file dropped into those folders appears on next page refresh.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;
const PUBLIC_ROOT = path.join(ROOT, 'public');

const PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const VIDEO_EXTS = ['.mp4', '.mov', '.webm', '.mkv', '.avi'];

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// ─── Media Scanner ────────────────────────────────────────────────────────────

function scanMediaFiles() {
  const photosDir = path.join(ROOT, 'assets', 'photos');
  const videosDir = path.join(ROOT, 'assets', 'videos');

  const results = [];

  // Scan Photos
  if (fs.existsSync(photosDir)) {
    const files = fs.readdirSync(photosDir);
    files.forEach(filename => {
      const ext = path.extname(filename).toLowerCase();
      if (!PHOTO_EXTS.includes(ext)) return;
      const filepath = path.join(photosDir, filename);
      const stat = fs.statSync(filepath);
      results.push({
        filename,
        path: `../assets/photos/${filename}`,
        isVideo: false,
        mtime: stat.mtimeMs,
        size: stat.size
      });
    });
  }

  // Scan Videos
  if (fs.existsSync(videosDir)) {
    const files = fs.readdirSync(videosDir);
    files.forEach(filename => {
      const ext = path.extname(filename).toLowerCase();
      if (!VIDEO_EXTS.includes(ext)) return;
      const filepath = path.join(videosDir, filename);
      const stat = fs.statSync(filepath);
      results.push({
        filename,
        path: `../assets/videos/${filename}`,
        isVideo: true,
        mtime: stat.mtimeMs,
        size: stat.size
      });
    });
  }

  // Sort newest first by file modified time
  results.sort((a, b) => b.mtime - a.mtime);
  return results;
}

// ─── Static File Server ───────────────────────────────────────────────────────

function resolveWithin(baseDir, relativePath) {
  const safeRelative = relativePath.replace(/^\/+/, '');
  const resolved = path.resolve(baseDir, safeRelative);
  const normalizedBase = path.resolve(baseDir);

  if (resolved === normalizedBase || resolved.startsWith(normalizedBase + path.sep)) {
    return resolved;
  }

  return null;
}

function resolvePrivateMediaPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);

  if (decodedPath.startsWith('/assets/')) {
    return resolveWithin(ROOT, decodedPath);
  }

  if (decodedPath.startsWith('/pages/confession/') && !decodedPath.endsWith('/index.html')) {
    return resolveWithin(ROOT, decodedPath);
  }

  if (decodedPath.startsWith('/pages/valentine/') && !decodedPath.endsWith('/index.html')) {
    return resolveWithin(ROOT, decodedPath);
  }

  return null;
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
    res.end();
    return;
  }

  const url = req.url.split('?')[0]; // strip query strings

  // ── API: Scan Media ──
  if (url === '/api/scan-media') {
    try {
      const media = scanMediaFiles();
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(media));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  const privateMediaPath = resolvePrivateMediaPath(url);
  if (privateMediaPath && fs.existsSync(privateMediaPath) && fs.statSync(privateMediaPath).isFile()) {
    serveFile(res, privateMediaPath);
    return;
  }

  // ── Static Files ──
  let filePath = resolveWithin(PUBLIC_ROOT, url === '/' ? 'index.html' : url);

  // Handle SPA-style pages: if requesting a page without extension, try .html
  if (filePath && !path.extname(filePath) && !fs.existsSync(filePath)) {
    filePath = filePath + '.html';
  }

  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!filePath || !fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`\n🌹 MemoryBook is running at http://localhost:${PORT}`);
  console.log(`📦 App shell served from: ${PUBLIC_ROOT}`);
  console.log(`📁 Auto-scanning: assets/photos + assets/videos`);
  console.log(`🛡️ Private local media stays outside public/ and is only resolved for local dev requests.`);
  console.log(`💡 Drop new photos or videos into those folders and refresh the page!\n`);
});
