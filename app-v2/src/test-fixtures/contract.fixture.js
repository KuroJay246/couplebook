export const sanitizedAuthorizedAgreementFixture = Object.freeze({
  status: 'ready',
  title: 'Our agreement',
  introduction: 'A fictional agreement record used only to exercise the Contract read model safely in local tests.',
  version: 'fixture-1',
  sourceLabel: 'Authorized runtime fixture',
  sections: Object.freeze([
    Object.freeze({
      id: 'shared-care',
      heading: 'Shared care',
      paragraphs: Object.freeze([
        'This fictional section exists only for safe automated testing.',
      ]),
    }),
    Object.freeze({
      id: 'read-only-boundary',
      heading: 'Read-only boundary',
      clauses: Object.freeze([
        'This migrated page can render a document without shipping private legacy wording.',
        'This fixture does not represent a live Couple Book agreement.',
      ]),
    }),
  ]),
})
