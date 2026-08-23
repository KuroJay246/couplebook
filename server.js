/**
 * MemoryBook Dev Server
 * Serves static files + auto-scans assets/photos and assets/videos
 * so any new file dropped into those folders appears on next page refresh.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const ROOT = __dirname;
const PUBLIC_ROOT = path.join(ROOT, 'public');
const PRIVATE_IMPORT_ROOT = path.join(ROOT, '..', 'couplebook.private-import');
const SPECIAL_PAGE_MAPPING_FILE = path.join(PRIVATE_IMPORT_ROOT, 'special-page-media-mapping.json');
const CONFESSION_CANDIDATE_CATALOG_FILE = path.join(PRIVATE_IMPORT_ROOT, 'confession-candidate-catalog.json');

const PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const VIDEO_EXTS = ['.mp4', '.mov', '.webm', '.mkv', '.avi'];
const SPECIAL_MOMENT_SOURCES = Object.freeze({
  birthday: path.join(ROOT, 'pages', 'omnia-happy-birthday.html'),
  valentine: path.join(ROOT, 'pages', 'valentine', 'index.html'),
  confession: path.join(ROOT, 'pages', 'confession', 'index.html'),
});
const CONFESSION_MEDIA_SLOTS = Object.freeze([
  { id: 'top-note-photo', label: 'Top note photo', kind: 'image', required: true },
  { id: 'cheesy-note-image', label: 'Cheesy note image', kind: 'image', required: true },
  { id: 'outside-note-photo', label: 'Outside note photo', kind: 'image', required: true },
  { id: 'inline-meme-image', label: 'Inline meme image', kind: 'image', required: true },
  { id: 'closing-video', label: 'Closing video', kind: 'video', required: true },
  { id: 'background-audio', label: 'Background audio', kind: 'audio', required: false },
]);

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
  '.mp3': 'audio/mpeg',
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

function jsonHeaders(statusCode = 200) {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    statusCode,
  };
}

function sendJson(res, statusCode, payload) {
  const headers = jsonHeaders(statusCode);
  const { statusCode: _, ...responseHeaders } = headers;
  res.writeHead(statusCode, responseHeaders);
  res.end(JSON.stringify(payload));
}

function readJsonFile(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function readSpecialPageMediaMapping() {
  return readJsonFile(SPECIAL_PAGE_MAPPING_FILE, {});
}

function writeSpecialPageMediaMapping(mapping) {
  writeJsonFile(SPECIAL_PAGE_MAPPING_FILE, mapping);
}

function readConfessionCandidateCatalog() {
  return readJsonFile(CONFESSION_CANDIDATE_CATALOG_FILE, {});
}

function resolveCatalogPath(filePath) {
  const rawPath = String(filePath || '').trim();
  if (!rawPath) return null;
  return path.isAbsolute(rawPath)
    ? path.resolve(rawPath)
    : path.resolve(PRIVATE_IMPORT_ROOT, rawPath);
}

function readConfessionCandidateEntries(slotId) {
  const catalog = readConfessionCandidateCatalog();
  const slotEntries = Array.isArray(catalog?.[slotId]) ? catalog[slotId] : [];

  return slotEntries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const resolved = resolveCatalogPath(entry.path);
    if (!resolved) return [];

    return [{
      path: resolved,
      note: typeof entry.note === 'string' ? entry.note : '',
      confidence: typeof entry.confidence === 'string' ? entry.confidence : 'possible',
    }];
  });
}

function mappedSpecialMedia(momentKey, slotId) {
  const mapping = readSpecialPageMediaMapping();
  const moment = mapping?.[momentKey];
  const slot = moment?.[slotId];
  if (!slot || !slot.path) return null;
  const resolved = path.resolve(String(slot.path));
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return { ...slot, path: resolved };
}

function candidateIdFor(slotId, filename) {
  const slug = String(filename || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slotId}-${slug || 'candidate'}`;
}

function buildConfessionCandidateRegistry() {
  const byId = new Map();
  const bySlot = new Map();

  for (const slot of CONFESSION_MEDIA_SLOTS) {
    const candidates = readConfessionCandidateEntries(slot.id).flatMap((entry) => {
      const resolved = path.resolve(String(entry.path || ''));
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
        return [];
      }

      const filename = path.basename(resolved);
      const candidate = {
        id: candidateIdFor(slot.id, filename),
        slotId: slot.id,
        kind: slot.kind,
        label: slot.label,
        filename,
        path: resolved,
        note: entry.note || '',
        confidence: entry.confidence || 'possible',
        previewUrl: `/api/private-media/confession/candidate/${candidateIdFor(slot.id, filename)}`,
      };

      byId.set(candidate.id, candidate);
      return [candidate];
    });

    bySlot.set(slot.id, candidates);
  }

  return { byId, bySlot };
}

function buildConfessionOwnerState() {
  const registry = buildConfessionCandidateRegistry();

  return {
    momentKey: 'confession',
    slots: CONFESSION_MEDIA_SLOTS.map((slot) => {
      const mapped = mappedSpecialMedia('confession', slot.id);
      return {
        ...slot,
        current: mapped
          ? {
              filename: path.basename(mapped.path),
              note: mapped.note || '',
              url: `/api/private-media/confession/${slot.id}`,
            }
          : null,
        status: mapped ? 'mapped' : slot.required ? 'pending' : 'optional',
        candidates: registry.bySlot.get(slot.id) || [],
      };
    }),
    mappingFile: SPECIAL_PAGE_MAPPING_FILE,
    generatedAt: new Date().toISOString(),
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function saveConfessionOwnerMapping({ slotId, candidateId, clear = false }) {
  const slot = CONFESSION_MEDIA_SLOTS.find((entry) => entry.id === slotId);
  if (!slot) {
    return { ok: false, statusCode: 404, error: 'Unknown confession slot.' };
  }

  const mapping = readSpecialPageMediaMapping();
  mapping.confession ||= {};

  if (clear) {
    delete mapping.confession[slotId];
    writeSpecialPageMediaMapping(mapping);
    return { ok: true, ownerState: buildConfessionOwnerState() };
  }

  const registry = buildConfessionCandidateRegistry();
  const candidate = registry.byId.get(candidateId);
  if (!candidate || candidate.slotId !== slotId) {
    return { ok: false, statusCode: 404, error: 'Candidate is not available for this slot.' };
  }

  mapping.confession[slotId] = {
    path: candidate.path,
    status: 'mapped',
    note: candidate.note,
    confidence: candidate.confidence,
    filename: candidate.filename,
    updatedAt: new Date().toISOString(),
  };
  writeSpecialPageMediaMapping(mapping);
  return { ok: true, ownerState: buildConfessionOwnerState() };
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
    .replace(/\r/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
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

function extractTextById(html, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<([a-zA-Z0-9]+)[^>]*id=["']${escapedId}["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
  const match = html.match(pattern);
  return match ? decodeHtmlEntities(stripTags(match[2])) : '';
}

function extractConfessionSubtitle(html) {
  const match = html.match(/<div[^>]*class=["'][^"']*\bcard-inside\b[^"']*["'][^>]*>[\s\S]*?<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
  return match ? decodeHtmlEntities(stripTags(match[1])) : '';
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
    const message = extractTextById(html, 'confessionMessage');
    const slotIds = CONFESSION_MEDIA_SLOTS.map(({ id, label, kind, required }) => {
      const mapped = mappedSpecialMedia('confession', id);
      return {
        id,
        label,
        kind,
        required,
        status: mapped?.status || 'pending',
        note: mapped?.note || (required ? 'Awaiting restoration' : 'Optional'),
        url: mapped ? `/api/private-media/confession/${id}` : '',
      };
    });
    return {
      moment: {
        type: 'confession',
        title: headings[0] || '',
        subtitle: extractConfessionSubtitle(html) || 'A private confession chapter from the legacy book.',
        sections: [
          section('confession-message', 'paragraph', 'Private letter', message),
        ].filter((entry) => entry.content),
      },
      media: {
        status: 'private-legacy-reference',
        type: null,
        note: 'Companion images, video, and audio remain private in the legacy book.',
      },
      mediaSlots: slotIds,
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

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
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

  if (url === '/api/private-media/confession/owner-state' && req.method === 'GET') {
    sendJson(res, 200, buildConfessionOwnerState());
    return;
  }

  if (url === '/api/private-media/confession/owner-state' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const result = saveConfessionOwnerMapping({
        slotId: String(body.slotId || ''),
        candidateId: String(body.candidateId || ''),
        clear: body.clear === true,
      });

      if (!result.ok) {
        sendJson(res, result.statusCode || 400, { error: result.error || 'Mapping update failed.' });
        return;
      }

      sendJson(res, 200, result.ownerState);
    } catch {
      sendJson(res, 400, { error: 'Mapping update payload was invalid.' });
    }
    return;
  }

  const candidateMatch = url.match(/^\/api\/private-media\/confession\/candidate\/([a-z0-9-]+)$/);
  if (candidateMatch) {
    const registry = buildConfessionCandidateRegistry();
    const candidate = registry.byId.get(candidateMatch[1]);
    if (!candidate) {
      sendJson(res, 404, { error: 'Candidate media unavailable.' });
      return;
    }
    serveFile(res, candidate.path);
    return;
  }

  const privateSlotMatch = url.match(/^\/api\/private-media\/(confession)\/([a-z0-9-]+)$/);
  if (privateSlotMatch) {
    const mapped = mappedSpecialMedia(privateSlotMatch[1], privateSlotMatch[2]);
    if (!mapped) {
      sendJson(res, 404, { error: 'Mapped media unavailable.' });
      return;
    }
    serveFile(res, mapped.path);
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
