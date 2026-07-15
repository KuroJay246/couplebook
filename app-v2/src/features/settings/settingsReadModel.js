import { getRuntimeMode, freezeClone } from '../../data/adapterUtils.js'
import { approvedAccountMigrationGate, routeMigrationStatus } from '../../app/migrationStatus.js'
import {
  deriveSettingsStatus,
  describeSettingsOpening,
  selectSettingsAccount,
  selectSettingsAdvanced,
  selectSettingsAppearance,
  selectSettingsCompatibility,
  selectSettingsDangerZone,
  selectSettingsMigrationProgress,
  selectSettingsPrivacy,
} from './settingsSelectors.js'

export function buildSettingsReadModel({
  approvedUser = null,
  authUser = null,
  compatibilitySnapshot = null,
  runtimeMode = getRuntimeMode(),
  migrationStatus = routeMigrationStatus,
  smokeGate = approvedAccountMigrationGate,
} = {}) {
  const snapshot = compatibilitySnapshot || {
    status: 'empty',
    sources: {},
    warnings: [],
  }
  const settingsSource = snapshot.sources?.settings || null

  const model = {
    status: deriveSettingsStatus(settingsSource),
    account: selectSettingsAccount({ approvedUser, authUser }),
    appearance: selectSettingsAppearance(settingsSource),
    privacy: selectSettingsPrivacy(),
    compatibility: selectSettingsCompatibility(snapshot),
    migration: selectSettingsMigrationProgress(migrationStatus, smokeGate),
    advanced: selectSettingsAdvanced({ runtimeMode, compatibilitySnapshot: snapshot }),
    danger: selectSettingsDangerZone(),
  }

  model.openingNotes = describeSettingsOpening(model)

  return freezeClone(model)
}
