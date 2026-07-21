const fs = require('fs');
const path = require('path');
const { REPO_ROOT, fail, log, runCommand } = require('./lib');

const FIRESTORE_RULES = path.join(REPO_ROOT, 'firestore.rules');
const FIRESTORE_DRAFT = path.join(REPO_ROOT, 'firestore.rules.private-draft');
const STORAGE_DRAFT = path.join(REPO_ROOT, 'storage.rules.private-draft');
const FIREBASE_JSON = path.join(REPO_ROOT, 'firebase.json');

function load(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function main() {
  let hasFailure = false;

  const firestoreRules = load(FIRESTORE_RULES);
  const firestoreDraft = load(FIRESTORE_DRAFT);
  const storageDraft = load(STORAGE_DRAFT);
  const firebaseConfig = JSON.parse(load(FIREBASE_JSON));

  if (firestoreRules !== firestoreDraft) {
    hasFailure = true;
    fail('firestore.rules does not match firestore.rules.private-draft.');
  } else {
    log('Live and draft Firestore rules are aligned locally.');
  }

  if (firestoreRules.includes('<JAYLAN_UID>') || firestoreRules.includes('<PARTNER_UID>') || firestoreDraft.includes('<JAYLAN_UID>') || firestoreDraft.includes('<PARTNER_UID>') || storageDraft.includes('<JAYLAN_UID>') || storageDraft.includes('<PARTNER_UID>')) {
    hasFailure = true;
    fail('UID placeholders remain in a rules file.');
  } else {
    log('Rules files contain real approved UID values only.');
  }

  if (firebaseConfig?.hosting?.public !== 'app-v2/dist') {
    hasFailure = true;
    fail('firebase.json hosting.public is not set to app-v2/dist.');
  } else {
    log('firebase.json publishes app-v2/dist for Version 1.0.');
  }

  const rewrites = firebaseConfig?.hosting?.rewrites || [];
  if (!rewrites.some((rewrite) => rewrite.source === '**' && rewrite.destination === '/index.html')) {
    hasFailure = true;
    fail('firebase.json is missing the app-v2 SPA rewrite.');
  }

  if (!storageDraft.includes('allow delete: if false;')) {
    hasFailure = true;
    fail('storage.rules.private-draft does not explicitly block deletes.');
  } else {
    log('Storage draft explicitly blocks deletes.');
  }

  log('Running Firestore rules dry-run compile via Firebase CLI.');
  const dryRun = process.platform === 'win32'
    ? runCommand('cmd.exe', [
      '/d',
      '/s',
      '/c',
      'npx -y firebase-tools@latest deploy --only firestore:rules --project couplebook-97830 --dry-run --non-interactive'
    ])
    : runCommand('npx', [
      '-y',
      'firebase-tools@latest',
      'deploy',
      '--only',
      'firestore:rules',
      '--project',
      'couplebook-97830',
      '--dry-run',
      '--non-interactive'
    ]);

  if (dryRun.status !== 0) {
    hasFailure = true;
    fail(`Firestore rules dry-run failed:\n${dryRun.stderr || dryRun.stdout}`);
  } else {
    log('Firestore rules dry-run passed.');
  }

  log('Storage rules remain future-only. Firebase Storage is not initialized and is not deployed by this check.');

  if (hasFailure) {
    process.exitCode = 1;
    return;
  }

  log('Rules check passed.');
}

main();
