const path = require('path');
const { REPO_ROOT, fail, log, walkFiles } = require('./lib');

const PUBLIC_ROOT = path.join(REPO_ROOT, 'public');
const PRIVATE_MEDIA_EXTENSIONS = new Set(['.mp4', '.mov', '.mp3', '.wav', '.jpg', '.jpeg', '.png']);

function main() {
  const files = walkFiles(PUBLIC_ROOT);
  const flagged = files
    .filter((filePath) => PRIVATE_MEDIA_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
    .map((filePath) => path.relative(REPO_ROOT, filePath));

  if (flagged.length > 0) {
    fail('Potential private media or undeclared safe image assets found in public/:');
    for (const filePath of flagged) {
      fail(`- ${filePath}`);
    }
    process.exitCode = 1;
    return;
  }

  log('Public folder media boundary check passed.');
}

main();
