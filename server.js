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
const SPECIAL_MOMENT_SOURCES = Object.freeze({
  birthday: path.join(ROOT, 'pages', 'omnia-happy-birthday.html'),
  valentine: path.join(ROOT, 'pages', 'valentine', 'index.html'),
  confession: path.join(ROOT, 'pages', 'confession', 'index.html'),
});

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

function stripTags(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTextByClass(html, className) {
  const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<([a-zA-Z0-9]+)[^>]*class=["'][^"']*\\b${escapedClass}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
  const match = html.match(pattern);
  return match ? decodeHtmlEntities(stripTags(match[2])) : '';
}

function extractTagText(html, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  return [...html.matchAll(pattern)].map((match) => decodeHtmlEntities(stripTags(match[1]))).filter(Boolean);
}

function section(id, kind, heading, content, items = []) {
  return { id, kind, heading, content, items };
}

function normalizeSpecialContent(momentKey, html) {
  if (momentKey === 'birthday') {
    const title = extractTextByClass(html, 'greeting');
    const message = extractTextByClass(html, 'sub');
    return {
      moment: {
        type: 'birthday',
        title,
        subtitle: 'A private birthday chapter from the legacy book.',
        sections: [section('birthday-message', 'note', 'Birthday note', message)].filter((entry) => entry.content),
      },
      media: {
        status: 'none',
        type: null,
        note: 'No companion media is connected for this route.',
      },
    };
  }

  if (momentKey === 'valentine') {
    const headings = extractTagText(html, 'h2');
    const hint = extractTextByClass(html, 'hint');
    const buttons = extractTagText(html, 'button');
    return {
      moment: {
        type: 'valentine',
        title: headings[0] || '',
        subtitle: 'A private Valentine chapter from the legacy book.',
        sections: [
          section('valentine-question', 'paragraph', 'Private question', headings[0] || ''),
          section('valentine-response-options', 'list', 'Preserved response choices', '', buttons),
          section('valentine-note', 'note', 'Legacy note', hint),
        ].filter((entry) => entry.content || entry.items.length > 0),
      },
      media: {
        status: 'none',
        type: null,
        note: 'No companion media is connected for this route.',
      },
    };
  }

  if (momentKey === 'confession') {
    const headings = extractTagText(html, 'h1').concat(extractTagText(html, 'h2'), extractTagText(html, 'h3'));
    const paragraphs = extractTagText(html, 'p');
    const message = extractTextByClass(html, 'message');
    return {
      moment: {
        type: 'confession',
        title: headings[0] || '',
        subtitle: 'A private confession chapter from the legacy book.',
        sections: [
          section('confession-opening', 'paragraph', headings[1] || 'Private opening', paragraphs[0] || ''),
          section('confession-message', 'note', headings[2] || 'Private note', message),
        ].filter((entry) => entry.content),
      },
      media: {
        status: 'private-legacy-reference',
        type: null,
        note: 'Companion images, video, and audio remain private in the legacy book.',
      },
    };
  }

  return null;
}

function serveSpecialMomentContent(momentKey, res) {
  const sourceFile = SPECIAL_MOMENT_SOURCES[momentKey];

  if (!sourceFile) {
    res.writeHead(404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Unknown special moment.' }));
    return;
  }

  fs.readFile(sourceFile, 'utf8', (error, html) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'Special moment source unavailable.' }));
      return;
    }

    const payload = normalizeSpecialContent(momentKey, html);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(payload || { error: 'Special moment source unavailable.' }));
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

  const specialMomentMatch = url.match(/^\/api\/special-moment\/(birthday|valentine|confession)$/);
  if (specialMomentMatch) {
    serveSpecialMomentContent(specialMomentMatch[1], res);
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
