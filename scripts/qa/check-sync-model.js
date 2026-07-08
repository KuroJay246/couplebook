const path = require('path');
const { pathToFileURL } = require('url');
const { REPO_ROOT, fail, log } = require('./lib');

async function main() {
  const moduleUrl = pathToFileURL(path.join(REPO_ROOT, 'services', 'syncModelService.js')).href;
  const syncModel = await import(moduleUrl);

  const rawDocs = [
    {
      uid: 'uid-jaylan',
      username: 'Jaylan',
      theme: 'dark',
      settings: {
        anniversaryConfig: 'dual',
        privacyToggles: {
          localOnlyMode: true
        }
      },
      contractAccepted: true,
      profile: {
        name: 'Jaylan',
        bio: 'Memory keeper'
      },
      favorites: {
        Omia: {
          snack: 'Fries'
        }
      },
      signature: {
        accepted: true,
        timestamp: '2026-01-01T00:00:00.000Z',
        version: '3.0',
        history: []
      },
      migrationCompleted: true,
      lastSync: { seconds: 123 }
    },
    {
      uid: 'uid-omia',
      username: 'Omia',
      contractAccepted: true,
      profile: {
        name: 'Omia'
      },
      favorites: {
        Jaylan: {
          place: 'Boardwalk'
        }
      },
      migrationCompleted: false
    },
    {
      uid: 'uid-unknown',
      username: '',
      profile: {
        ignored: true
      }
    }
  ];

  const normalizedDocs = rawDocs
    .map((doc) => ({ uid: doc.uid, ...syncModel.normalizeCloudUserDoc(doc) }))
    .filter(Boolean);

  if (normalizedDocs.length !== 3) {
    fail('Sync model check failed: normalizeCloudUserDoc did not preserve expected fixture count');
    process.exit(1);
  }

  if (normalizedDocs[0].settings?.privacyToggles?.localOnlyMode !== true) {
    fail('Sync model check failed: nested privacy toggles were not preserved');
    process.exit(1);
  }

  const profiles = syncModel.buildSharedProfilesFromUserDocs(normalizedDocs);
  if (!profiles.Jaylan || !profiles.Omia || profiles['']) {
    fail('Sync model check failed: profile merge did not keep only expected named users');
    process.exit(1);
  }

  const favorites = syncModel.buildSharedFavoritesFromUserDocs(normalizedDocs);
  if (!favorites.Jaylan?.Omia?.snack || !favorites.Omia?.Jaylan?.place) {
    fail('Sync model check failed: favorites merge did not preserve nested username/person structure');
    process.exit(1);
  }

  if (!favorites.Omia?.snack || !favorites.Jaylan?.place) {
    fail('Sync model check failed: favorites merge did not preserve top-level backward-compatible structure');
    process.exit(1);
  }

  const signatures = syncModel.buildSharedSignaturesFromUserDocs(normalizedDocs);
  if (!signatures.Jaylan?.accepted || !signatures.Omia?.accepted) {
    fail('Sync model check failed: signature fallback or explicit signature handling regressed');
    process.exit(1);
  }

  const activeUser = syncModel.pickActiveUserCloudData(normalizedDocs, 'uid-jaylan');
  const partnerUser = syncModel.pickPartnerUserCloudData(
    normalizedDocs,
    'uid-jaylan',
    ['uid-jaylan', 'uid-omia']
  );

  if (activeUser?.username !== 'Jaylan' || partnerUser?.username !== 'Omia') {
    fail('Sync model check failed: active/partner picking did not return the expected user docs');
    process.exit(1);
  }

  if (syncModel.pickPartnerUserCloudData(normalizedDocs, 'uid-jaylan', ['uid-jaylan']) !== null) {
    fail('Sync model check failed: invalid approved UID pair should return null');
    process.exit(1);
  }

  log('Sync model check passed.');
}

main().catch((error) => {
  fail(`Sync model check failed: ${error.message}`);
  process.exit(1);
});
