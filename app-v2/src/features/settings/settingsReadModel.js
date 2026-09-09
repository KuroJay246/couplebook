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
  selectSettingsMedia,
  selectSettingsMigrationProgress,
  selectSettingsPrivacy,
} from './settingsSelectors.js'

export function buildSettingsReadModel({
  approvedUser = null,
  authUser = null,
  compatibilitySnapshot = null,
  profileSource = null,
  settingsSource = null,
  runtimeMode = getRuntimeMode(),
  migrationStatus = routeMigrationStatus,
  smokeGate = approvedAccountMigrationGate,
} = {}) {
  const snapshot = compatibilitySnapshot || {
    status: 'empty',
    sources: {},
    warnings: [],
  }
  const resolvedSettingsSource = settingsSource || snapshot.sources?.settings || null
  const resolvedSnapshot = {
    ...snapshot,
    sources: {
      ...(snapshot.sources || {}),
      profile: profileSource || snapshot.sources?.profile,
      settings: resolvedSettingsSource,
    },
  }

  const model = {
    status: deriveSettingsStatus(resolvedSettingsSource),
    account: selectSettingsAccount({ approvedUser, authUser }),
    appearance: selectSettingsAppearance(resolvedSettingsSource),
    media: selectSettingsMedia(),
    privacy: selectSettingsPrivacy(),
    compatibility: selectSettingsCompatibility(resolvedSnapshot),
    migration: selectSettingsMigrationProgress(migrationStatus, smokeGate),
    advanced: selectSettingsAdvanced({ runtimeMode, compatibilitySnapshot: resolvedSnapshot }),
    danger: selectSettingsDangerZone(),
  }

  model.openingNotes = describeSettingsOpening(model)

  return freezeClone(model)
}
