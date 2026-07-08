const fs = require('fs');
const path = require('path');
const { REPO_ROOT, fail, log } = require('./lib');

const explicitPairs = [
  ['js/app.js', 'public/js/app.js'],
  ['js/auth.js', 'public/js/auth.js'],
  ['js/settings.js', 'public/js/settings.js'],
  ['core/healthCheck.js', 'public/core/healthCheck.js'],
  ['core/firestoreSync.js', 'public/core/firestoreSync.js'],
  ['core/state.js', 'public/core/state.js']
];

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n');
}

function comparePair(rootRelative, publicRelative) {
  const rootPath = path.join(REPO_ROOT, rootRelative);
  const publicPath = path.join(REPO_ROOT, publicRelative);

  if (!fs.existsSync(rootPath)) {
    fail(`Mirror check failed: missing root file ${rootRelative}`);
    return false;
  }

  if (!fs.existsSync(publicPath)) {
    fail(`Mirror check failed: missing public file ${publicRelative}`);
    return false;
  }

  const left = normalizeText(fs.readFileSync(rootPath, 'utf8'));
  const right = normalizeText(fs.readFileSync(publicPath, 'utf8'));

  if (left !== right) {
    fail(`Mirror check failed: ${rootRelative} does not match ${publicRelative}`);
    return false;
  }

  return true;
}

function compareServiceMirrors() {
  const servicesDir = path.join(REPO_ROOT, 'services');
  const publicServicesDir = path.join(REPO_ROOT, 'public', 'services');

  if (!fs.existsSync(servicesDir) || !fs.existsSync(publicServicesDir)) {
    fail('Mirror check failed: services or public/services directory is missing');
    return false;
  }

  const rootFiles = fs.readdirSync(servicesDir).filter((name) => name.endsWith('.js')).sort();
  const publicFiles = fs.readdirSync(publicServicesDir).filter((name) => name.endsWith('.js')).sort();

  if (JSON.stringify(rootFiles) !== JSON.stringify(publicFiles)) {
    fail('Mirror check failed: services and public/services file lists differ');
    return false;
  }

  return rootFiles.every((name) => comparePair(`services/${name}`, `public/services/${name}`));
}

let ok = true;

for (const [rootRelative, publicRelative] of explicitPairs) {
  ok = comparePair(rootRelative, publicRelative) && ok;
}

ok = compareServiceMirrors() && ok;

if (!ok) {
  process.exit(1);
}

log('Mirror check passed.');
