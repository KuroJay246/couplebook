const fs = require('fs');
const path = require('path');
const { REPO_ROOT, fail, log } = require('./lib');

const requiredDocs = [
  'APPROVED_ACCOUNT_SMOKE_STATUS.md',
  'APPROVED_ACCOUNT_SMOKE_RUNBOOK.md',
  'APPROVED_ACCOUNT_SMOKE_RESULTS_TEMPLATE.md',
  'SYSTEM_HEALTH_AUDIT.md',
  'SERVICE_LAYER_MIGRATION_STATUS.md',
  'COUPLEBOOK_REDESIGN_MASTER_PLAN.md',
  'PROTECTED_SHELL_BLUEPRINT.md',
  'COUPLEBOOK_DESIGN_SYSTEM_BLUEPRINT.md',
  'COUPLEBOOK_COMPONENT_MAP.md'
];

const missing = requiredDocs.filter((docPath) => !fs.existsSync(path.join(REPO_ROOT, docPath)));

if (missing.length > 0) {
  for (const docPath of missing) {
    fail(`Docs check failed: missing ${docPath}`);
  }
  process.exit(1);
}

log('Docs check passed.');
