export const sanitizedLegacyMemoryFixture = Object.freeze([
  Object.freeze({
    id: 'fixture-memory-001',
    title: 'Fictional Sunrise Walk',
    description: 'A fictional compatibility-test memory used only for local adapter coverage.',
    date: '2026-01-15',
    media: '/assets/photos/fictional-sunrise.jpg',
    isVideo: false,
    tags: ['fictional', 'test'],
  }),
  Object.freeze({
    id: 'fixture-memory-002',
    title: 'Imaginary Voice Note',
    description: 'A generic placeholder clip that proves the adapter can normalize videos safely.',
    date: '2026-01-16',
    media: '/assets/videos/imaginary-note.mp4',
    isVideo: true,
    tags: ['fictional', 'video'],
  }),
])
