import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const panelSource = fs.readFileSync(path.join(__dirname, '..', 'components', 'WriteWorkflowPanel.jsx'), 'utf8')

test('workflow panel exposes approved reversible launch controls only', () => {
  assert.match(panelSource, /isFirestoreWriteMode/)
  assert.match(panelSource, /Anniversary view/)
  assert.match(panelSource, /launch_test_\$\{Date\.now\(\)\}/)
  assert.match(panelSource, /Archive temporary memory/)
  assert.doesNotMatch(panelSource, /firebase-admin|collection\(|getDocs|gathervibeshub|accessStatus|coupleId\s*=|approved\s*=/)
  assert.doesNotMatch(panelSource, /storage|mediaState|service_account|private_key|GOOGLE_APPLICATION_CREDENTIALS/)
})
