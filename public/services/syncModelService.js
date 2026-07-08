export function normalizeCloudUserDoc(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  return {
    username: typeof data.username === 'string' ? data.username : '',
    theme: typeof data.theme === 'string' ? data.theme : null,
    settings: data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)
      ? {
          ...data.settings,
          privacyToggles: data.settings.privacyToggles && typeof data.settings.privacyToggles === 'object' && !Array.isArray(data.settings.privacyToggles)
            ? { ...data.settings.privacyToggles }
            : undefined
        }
      : null,
    contractAccepted: data.contractAccepted === true,
    profile: data.profile && typeof data.profile === 'object' && !Array.isArray(data.profile)
      ? { ...data.profile }
      : null,
    favorites: data.favorites && typeof data.favorites === 'object' && !Array.isArray(data.favorites)
      ? JSON.parse(JSON.stringify(data.favorites))
      : null,
    signature: data.signature && typeof data.signature === 'object' && !Array.isArray(data.signature)
      ? JSON.parse(JSON.stringify(data.signature))
      : null,
    migrationCompleted: data.migrationCompleted === true,
    lastSync: data.lastSync ?? null
  };
}

function cloneObject(value) {
  return value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
}

export function buildSharedProfilesFromUserDocs(userDocs) {
  const profiles = {};

  for (const userDoc of userDocs || []) {
    if (!userDoc || !userDoc.username || !userDoc.profile) continue;
    profiles[userDoc.username] = {
      ...(profiles[userDoc.username] || {}),
      ...cloneObject(userDoc.profile)
    };
  }

  return profiles;
}

export function buildSharedFavoritesFromUserDocs(userDocs) {
  const favorites = {};

  for (const userDoc of userDocs || []) {
    if (!userDoc || !userDoc.username || !userDoc.favorites || typeof userDoc.favorites !== 'object') continue;

    for (const person of Object.keys(userDoc.favorites)) {
      const personValue = userDoc.favorites[person];
      if (!personValue || typeof personValue !== 'object' || Array.isArray(personValue)) continue;

      if (!favorites[userDoc.username]) favorites[userDoc.username] = {};
      favorites[userDoc.username][person] = {
        ...((favorites[userDoc.username] && favorites[userDoc.username][person]) || {}),
        ...cloneObject(personValue)
      };

      if (!favorites[person]) favorites[person] = {};
      favorites[person] = {
        ...favorites[person],
        ...cloneObject(personValue)
      };
    }
  }

  return favorites;
}

export function buildSharedSignaturesFromUserDocs(userDocs) {
  const signatures = {};

  for (const userDoc of userDocs || []) {
    if (!userDoc || !userDoc.username) continue;

    if (userDoc.signature && typeof userDoc.signature === 'object' && !Array.isArray(userDoc.signature)) {
      signatures[userDoc.username] = cloneObject(userDoc.signature);
      continue;
    }

    if (userDoc.contractAccepted === true && !signatures[userDoc.username]) {
      signatures[userDoc.username] = {
        accepted: true,
        timestamp: null,
        version: '3.0',
        history: []
      };
    }
  }

  return signatures;
}

export function pickActiveUserCloudData(userDocs, uid) {
  if (!uid) return null;

  for (const userDoc of userDocs || []) {
    if (userDoc && userDoc.uid === uid) {
      return cloneObject(userDoc);
    }
  }

  return null;
}

export function pickPartnerUserCloudData(userDocs, activeUid, approvedUidPair) {
  if (!activeUid || !Array.isArray(approvedUidPair) || approvedUidPair.length !== 2) return null;
  const partnerUid = approvedUidPair.find((uid) => uid && uid !== activeUid);
  if (!partnerUid) return null;
  return pickActiveUserCloudData(userDocs, partnerUid);
}
