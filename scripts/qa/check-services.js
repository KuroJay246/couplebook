const fs = require('fs');
const path = require('path');
const { REPO_ROOT, fail, log, walkFiles } = require('./lib');

const serviceDirs = [
  path.join(REPO_ROOT, 'services'),
  path.join(REPO_ROOT, 'public', 'services')
];

const forbiddenRules = [
  {
    label: 'deleteDoc usage',
    pattern: /\bdeleteDoc\s*\(/
  },
  {
    label: 'setDoc usage',
    pattern: /\bsetDoc\s*\(/
  },
  {
    label: 'updateDoc usage',
    pattern: /\bupdateDoc\s*\(/
  },
  {
    label: 'users collection scan',
    pattern: /\bcollection\s*\([^)]*['"]users['"]/
  },
  {
    label: 'legacy usernames collection usage',
    pattern: /['"]usernames['"]/
  },
  {
    label: 'hardcoded token-like secret',
    pattern: /(AIza[0-9A-Za-z_-]{20,}|-----BEGIN [A-Z ]+PRIVATE KEY-----|sk_live_[0-9A-Za-z]+)/ 
  }
];

let ok = true;

for (const dir of serviceDirs) {
  const files = walkFiles(dir).filter((filePath) => filePath.endsWith('.js'));
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const rule of forbiddenRules) {
      if (rule.pattern.test(content)) {
        fail(`Service check failed: ${path.relative(REPO_ROOT, filePath)} contains forbidden ${rule.label}`);
        ok = false;
      }
    }
  }
}

if (!ok) {
  process.exit(1);
}

log('Service check passed.');
