import assert from 'node:assert/strict';
import test from 'node:test';

import {
  archiveMemory,
  convertPlanToMemory,
  restoreMemory,
  saveMemory,
  saveOwnProfile,
  saveOwnSettings,
  savePlan,
  saveSharedSettings,
} from '../src/services/firestore-writes-core.mjs';

function createFirestoreStub({ active = true } = {}) {
  const writes = [];
  const docs = new Map();

  function seed(path, data) {
    docs.set(path, { ...data });
  }

  seed('couples/couple_alpha/profiles/member_one', { revision: 0 });
  seed('couples/couple_alpha/settings/member_one', { revision: 0 });
  seed('couples/couple_alpha/settings/shared', { revision: 0 });
  seed('couples/couple_alpha/memories/memory_one', { revision: 0, status: 'active' });
  seed('couples/couple_alpha/plans/plan_one', { revision: 0 });

  return {
    seed,
    writes,
    firestore: {},
    createDoc: (_firestore, ...pathParts) => ({ path: pathParts.join('/') }),
    getDocument: async (reference) => ({
      exists: () => {
        if (reference.path?.includes('/members/')) return true;
        return docs.has(reference.path);
      },
      data: () => {
        if (reference.path?.includes('/members/')) return { active, role: 'member' };
        return docs.get(reference.path) || {};
      },
    }),
    setDocument: async (reference, data) => {
      writes.push({ kind: 'set', path: reference.path, data });
      docs.set(reference.path, { ...data });
    },
    updateDocument: async (reference, data) => {
      writes.push({ kind: 'update', path: reference.path, data });
      docs.set(reference.path, { ...(docs.get(reference.path) || {}), ...data });
    },
    timestamp: () => 'ts',
  };
}

const context = Object.freeze({
  approvedUser: { uid: 'member_one', coupleId: 'couple_alpha' },
  env: { NODE_ENV: 'development', EXPO_PUBLIC_FIREBASE_WRITE_MODE: 'firestore-emulator-write' },
  user: { uid: 'member_one' },
});

test('mobile write services reject disabled write mode before writing', async () => {
  const firestore = createFirestoreStub();
  await assert.rejects(
    saveOwnProfile(
      { name: 'Member One' },
      {
        ...context,
        env: { NODE_ENV: 'development', EXPO_PUBLIC_FIREBASE_WRITE_MODE: 'production-write-disabled' },
        ...firestore,
      },
    ),
    /disabled/,
  );
  assert.equal(firestore.writes.length, 0);
});

test('mobile write services save profile and settings with scoped metadata', async () => {
  const firestore = createFirestoreStub();

  await saveOwnProfile(
    { name: 'Member One', bio: 'Safe bio', joinedDate: '2026-01-01' },
    { ...context, ...firestore },
  );
  await saveOwnSettings(
    { appearanceTheme: 'paper-hearts', localOnlyMode: true, reducedMotion: true },
    { ...context, ...firestore },
  );
  await saveSharedSettings(
    { liveAlbumCover: 'cover_a', previewOrder: ['media_1', 'media_2'] },
    { ...context, ...firestore },
  );

  assert.equal(firestore.writes[0].data.createdBy, 'member_one');
  assert.equal(firestore.writes[1].data.appearanceTheme, 'paper-hearts');
  assert.equal(firestore.writes[1].data.privacy.reducedMotion, true);
  assert.deepEqual(firestore.writes[2].data.previewOrder, ['media_1', 'media_2']);
});

test('mobile memory writes create text memories and enforce archive and restore revisions', async () => {
  const firestore = createFirestoreStub();

  await saveMemory(
    'memory_one',
    {
      title: 'A day together',
      description: 'We stayed in and watched movies.',
      date: '2026-02-14',
      mediaType: 'text',
      revision: 0,
    },
    { ...context, ...firestore },
  );
  await archiveMemory('memory_one', 1, { ...context, ...firestore });
  await restoreMemory('memory_one', 2, { ...context, ...firestore });

  assert.equal(firestore.writes[0].data.status, 'active');
  assert.equal(firestore.writes[0].data.createdAt, 'ts');
  assert.equal(firestore.writes[1].data.status, 'archived');
  assert.equal(firestore.writes[2].data.status, 'active');
});

test('mobile plan writes preserve conversion markers and block duplicates', async () => {
  const firestore = createFirestoreStub();

  await savePlan(
    'plan_one',
    {
      title: 'Beach picnic',
      category: 'Date Idea',
      status: 'idea',
      targetDate: '2026-08-30',
      revision: 0,
    },
    { ...context, ...firestore },
  );

  const memoryId = await convertPlanToMemory(
    'plan_one',
    {
      title: 'Beach picnic',
      category: 'Date Idea',
      status: 'planned',
      targetDate: '2026-08-30',
      notes: 'Bring snacks',
      revision: 1,
      convertedMemoryId: '',
    },
    { ...context, ...firestore },
  );

  assert.equal(memoryId, 'memory_from_plan_plan_one');
  assert.equal(firestore.writes[1].path, 'couples/couple_alpha/memories/memory_from_plan_plan_one');
  assert.equal(firestore.writes[2].data.convertedMemoryId, memoryId);

  await assert.rejects(
    convertPlanToMemory(
      'plan_one',
      {
        title: 'Beach picnic',
        category: 'Date Idea',
        status: 'completed',
        targetDate: '2026-08-30',
        notes: 'Bring snacks',
        revision: 2,
        convertedMemoryId: memoryId,
      },
      { ...context, ...firestore },
    ),
    /already has a memory/,
  );
});

test('mobile plan-to-memory retry reuses an existing deterministic memory before finalizing the plan marker', async () => {
  const firestore = createFirestoreStub();
  firestore.seed('couples/couple_alpha/memories/memory_from_plan_plan_one', {
    revision: 1,
    title: 'Beach picnic',
    date: '2026-08-30',
    mediaState: 'none',
    mediaType: 'text',
    linkedPlanId: 'plan_one',
    createdBy: 'member_one',
    updatedBy: 'member_one',
    status: 'active',
    schemaVersion: 1,
  });

  const memoryId = await convertPlanToMemory(
    'plan_one',
    {
      title: 'Beach picnic',
      category: 'Date Idea',
      status: 'planned',
      targetDate: '2026-08-30',
      notes: 'Bring snacks',
      revision: 0,
      convertedMemoryId: '',
    },
    { ...context, ...firestore },
  );

  assert.equal(memoryId, 'memory_from_plan_plan_one');
  assert.equal(firestore.writes.length, 1);
  assert.equal(firestore.writes[0].path, 'couples/couple_alpha/plans/plan_one');
  assert.equal(firestore.writes[0].data.convertedMemoryId, memoryId);
});

test('mobile write services reject stale revisions and invalid payloads', async () => {
  const firestore = createFirestoreStub();

  await savePlan(
    'plan_one',
    {
      title: 'Dinner out',
      category: 'Restaurant',
      status: 'planned',
      targetDate: '2026-08-24',
      revision: 0,
    },
    { ...context, ...firestore },
  );

  await assert.rejects(
    savePlan(
      'plan_one',
      {
        title: 'Stale edit',
        category: 'Restaurant',
        status: 'planned',
        targetDate: '2026-08-24',
        revision: 0,
      },
      { ...context, ...firestore },
    ),
    /changed in another session/i,
  );

  await assert.rejects(
    saveMemory(
      'memory_two',
      { title: 'Bad day', date: '2026-02-31', revision: 0 },
      { ...context, ...firestore },
    ),
    /real calendar date/i,
  );
});
