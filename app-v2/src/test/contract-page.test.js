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
  assert.match(contractViewSource, /SharedSpaceHeader/)
  assert.match(contractViewSource, /Our agreement/)
  assert.match(contractViewSource, /Open profile/)
  assert.match(contractViewSource, /Open favorites/)
  assert.match(contractViewSource, /Refresh reads/)
  assert.match(contractViewSource, /The protected boundary stays visible\./)
  assert.doesNotMatch(contractViewSource, /Sign & Open Vault|Accept button|Edit agreement|Upload signature|Draw signature|Export PDF|Save/)
})

test('contract view keeps unavailable agreement wording honest and does not expose raw technical warnings', async () => {
  const contractViewSource = await readSource('../features/contract/ContractView.jsx')

  assert.match(contractViewSource, /No private agreement text is copied from the old static files into this routed page\./)
  assert.match(contractViewSource, /Agreement wording appears here only when it comes from a protected runtime source\./)
  assert.match(contractViewSource, /The latest protected refresh did not complete\. Existing read-only contract status remains intact\./)
  assert.doesNotMatch(contractViewSource, /model\.sourceStatus\.warnings/)
  assert.doesNotMatch(contractViewSource, /localStorage|memorybook_contract_signatures|users\/\{uid\}|data:image|base64/)
})
