import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('plans view exposes complete create edit cancel and memory conversion workflows', async () => {
  const viewSource = await readSource('../features/plans/PlansView.jsx')
  const readModelSource = await readSource('../features/plans/plansReadModel.js')

  assert.match(viewSource, /Add Plan/)
  assert.match(viewSource, /Edit plan/)
  assert.match(viewSource, /Mark completed/)
  assert.match(viewSource, /Turn into memory/)
  assert.match(viewSource, /Cancel plan/)
  assert.match(viewSource, /status: 'archived'/)
  assert.match(viewSource, /This hides the plan from active planning without deleting the historical record\./)
  assert.match(readModelSource, /plan\.status !== 'archived'/)
  assert.doesNotMatch(viewSource, /deleteDoc|removeDoc|CODEX_TEST|Seed plan|QA|test provider/)
})
