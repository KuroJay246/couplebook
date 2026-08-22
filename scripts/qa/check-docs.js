const fs = require('fs');
const path = require('path');
const { REPO_ROOT, fail, log } = require('./lib');

const requiredDocs = [
  'README.md',
  'docs/AI_AGENT_RULES.md',
  'docs/PROJECT_HANDOFF.md',
  'docs/COUPLE_BOOK_MASTER_SYSTEM_REFERENCE.md',
  'docs/WORKFLOW.md',
  'docs/QA.md',
  'docs/MEDIA.md',
  'docs/STORAGE_AND_MEDIA.md',
  'docs/ARCHITECTURE.md',
  'docs/SECURITY.md',
  'docs/RELEASE_AND_DEPLOYMENT.md',
  'docs/COUPLE_BOOK_VISUAL_IDENTITY_STANDARD.md',
  'docs/COUPLE_BOOK_DISTINCT_UI_RESEARCH.md',
  'docs/HISTORICAL_ARCHIVE_INDEX.md'
];

const missing = requiredDocs.filter((docPath) => !fs.existsSync(path.join(REPO_ROOT, docPath)));
const activeDocs = requiredDocs.filter((docPath) => !missing.includes(docPath)).map((docPath) => ({
  docPath,
  text: fs.readFileSync(path.join(REPO_ROOT, docPath), 'utf8')
}));
const failures = [];

if (missing.length > 0) {
  for (const docPath of missing) {
    failures.push(`missing ${docPath}`);
  }
}

for (const { docPath, text } of activeDocs) {
  if (text.includes('firestore.app-v2.rules')) {
    failures.push(`${docPath} references stale firestore.app-v2.rules`);
  }
  if (text.includes('gathervibeshub') && !text.toLowerCase().includes('prohibited firebase project')) {
    failures.push(`${docPath} mentions gathervibeshub outside the prohibited-project boundary`);
  }
}

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'firebase.json'), 'utf8'));
const appV2FirebaseConfig = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'firebase.app-v2.json'), 'utf8'));
if (firebaseConfig?.firestore?.rules !== 'firestore.rules') failures.push('firebase.json must use firestore.rules');
if (appV2FirebaseConfig?.firestore?.rules !== 'firestore.rules') failures.push('firebase.app-v2.json must use firestore.rules');

if (failures.length > 0) {
  for (const failure of failures) fail(`Docs check failed: ${failure}`);
  process.exit(1);
}

log('Docs check passed for current Couple Book references.');
