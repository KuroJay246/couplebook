import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

test('contract route uses the read-only feature hook and shared-space view', async () => {
  const contractPageSource = await readSource('../pages/ContractPage.jsx')
  const contractViewSource = await readSource('../features/contract/ContractView.jsx')

  assert.match(contractPageSource, /useContractData/)
  assert.match(contractPageSource, /ContractView/)
  assert.match(contractViewSource, /Shared Relationship Contract/)
  assert.match(contractViewSource, /contract-display-container/)
  assert.match(contractViewSource, /Pillar I: Mutual Respect/)
  assert.match(contractViewSource, /contract-status-box/)
  assert.doesNotMatch(contractViewSource, /Sign & Open Vault|Accept button|Edit agreement|Upload signature|Draw signature|Export PDF|Save/)
})

test('contract view keeps unavailable agreement wording honest and does not expose raw technical warnings', async () => {
  const contractViewSource = await readSource('../features/contract/ContractView.jsx')

  assert.match(contractViewSource, /Pillar II: Absolute Trust/)
  assert.match(contractViewSource, /Pillar IV: Healthy Boundaries/)
  assert.doesNotMatch(contractViewSource, /model\.sourceStatus\.warnings/)
  assert.doesNotMatch(contractViewSource, /localStorage|memorybook_contract_signatures|users\/\{uid\}|data:image|base64/)
})
