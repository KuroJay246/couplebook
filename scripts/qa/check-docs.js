const fs = require('fs');
const path = require('path');
const { REPO_ROOT, fail, log } = require('./lib');

const requiredDocs = [
  'DOCS_INDEX.md',
  'PROJECT_STATUS_AND_PHASES.md',
  'FIREBASE_SYNC_AND_SERVICE_LAYER.md',
  'UI_REDESIGN_AND_PROTOTYPE_MASTER.md',
  'MEMORY_MEDIA_AND_STORAGE_MASTER.md',
  'QA_AUTOMATION.md',
  'APPROVED_ACCOUNT_SMOKE_STATUS.md',
  'APPROVED_ACCOUNT_SMOKE_RUNBOOK.md',
  'APPROVED_ACCOUNT_SMOKE_RESULTS_TEMPLATE.md',
  'PROJECT_CLEANUP_NOTES.md',
  'firestore.rules.audit.local.md'
];

const missing = requiredDocs.filter((docPath) => !fs.existsSync(path.join(REPO_ROOT, docPath)));

if (missing.length > 0) {
  for (const docPath of missing) {
    fail(`Docs check failed: missing ${docPath}`);
  }
  process.exit(1);
}

log('Docs check passed.');
