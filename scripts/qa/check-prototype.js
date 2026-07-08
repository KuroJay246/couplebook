const fs = require('fs');
const path = require('path');
const { REPO_ROOT, fail, log, walkFiles } = require('./lib');

const prototypeRoot = path.join(REPO_ROOT, 'prototypes', 'couplebook-shell');
const forbiddenPrototypeMarkers = [
  {
    label: 'Firebase import/reference',
    pattern: /(gstatic\.com\/firebasejs|from\s+['"][^'"]*firebase|import\s*\([^)]*firebase|initializeApp\s*\(|getFirestore\s*\(|getAuth\s*\()/i
  },
  {
    label: 'private media folder reference',
    pattern: /(assets\/photos|assets\/videos|OUR MEMORIES)/i
  },
  {
    label: 'private media extension reference',
    pattern: /\.(mp4|mov|mp3|wav|jpg|jpeg|png)\b/i
  }
];

if (fs.existsSync(path.join(REPO_ROOT, 'public', 'prototypes'))) {
  fail('Prototype check failed: prototypes directory must not exist under public/');
  process.exit(1);
}

if (!fs.existsSync(prototypeRoot)) {
  fail('Prototype check failed: prototypes/couplebook-shell is missing');
  process.exit(1);
}

const files = walkFiles(prototypeRoot);
let ok = true;

for (const filePath of files) {
  const relative = path.relative(REPO_ROOT, filePath);
  const content = fs.readFileSync(filePath, 'utf8');

  for (const rule of forbiddenPrototypeMarkers) {
    if (rule.pattern.test(content)) {
      fail(`Prototype check failed: ${relative} contains ${rule.label}`);
      ok = false;
    }
  }
}

const indexPath = path.join(prototypeRoot, 'index.html');
if (!fs.existsSync(indexPath)) {
  fail('Prototype check failed: prototypes/couplebook-shell/index.html is missing');
  ok = false;
} else {
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  if (!/NON-LIVE PROTOTYPE/i.test(indexHtml)) {
    fail('Prototype check failed: index.html must clearly label the shell as NON-LIVE PROTOTYPE');
    ok = false;
  }
}

if (!ok) {
  process.exit(1);
}

log('Prototype check passed.');
