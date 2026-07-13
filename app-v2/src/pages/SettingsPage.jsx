import { PageDivider, QuietStatus, SettingsGroup, UtilityPageHeader, UtilitySection } from '../components/PageLayout'

const settingsGroups = [
  {
    eyebrow: 'Account',
    title: 'Your account',
    description: 'Shell-owned identity details stay visible here without turning this page into a profile editor.',
    items: [
      {
        label: 'Signed-in identity',
        description: 'The approved Firebase session will supply the visible account name and email instead of placeholder relationship data.',
        meta: 'Read-only',
      },
      {
        label: 'Approved-user status',
        description: 'This page will explain that access still depends on the targeted users/{uid} approval lookup after sign-in succeeds.',
        meta: 'Protected',
      },
      {
        label: 'Sign out',
        description: 'Leaving the private book stays a quiet control here and in the shell, not a dramatic primary action.',
        meta: 'Shell action',
      },
    ],
  },
  {
    eyebrow: 'Appearance',
    title: 'Appearance',
    description: 'Reading comfort stays simple, intentional, and lower-emphasis than the shared story surfaces.',
    items: [
      {
        label: 'Theme direction',
        description: 'Future controls will tune paper, ink, and accent warmth without reverting to bright pink software styling.',
        meta: 'Planned',
      },
      {
        label: 'Reading preference',
        description: 'Spacing and anniversary-view preferences can surface here once the read model is migrated safely.',
        meta: 'Deferred',
      },
      {
        label: 'Motion preference',
        description: 'Reduced-motion support is already present in the shared shell and will become a visible setting only if it adds real value.',
        meta: 'Optional',
      },
    ],
  },
  {
    eyebrow: 'Privacy',
    title: 'Privacy and access',
    description: 'Private-two-person boundaries should be explained plainly instead of hidden inside technical diagnostics.',
    items: [
      {
        label: 'Two-person status',
        description: 'This area will clarify that Couple Book is intentionally private for exactly two approved people.',
        meta: 'Core rule',
      },
      {
        label: 'Session and device context',
        description: 'Only calm session facts belong here, never broad internal keys or storage shortcuts that could imply localStorage-based auth.',
        meta: 'Planned',
      },
      {
        label: 'Privacy explanation',
        description: 'Users should understand how sign-in, approval, and protected routes work without seeing admin-like wording.',
        meta: 'Required',
      },
    ],
  },
  {
    eyebrow: 'Compatibility',
    title: 'Data and compatibility',
    description: 'Legacy reads and migration status belong here, but ordinary users should not see raw implementation details.',
    items: [
      {
        label: 'Legacy source availability',
        description: 'The page will show whether local compatibility reads are available, partial, or unavailable without pretending empty data is complete.',
        meta: 'Read-only',
      },
      {
        label: 'Migration status',
        description: 'Progress notes can explain what has moved into React and what still depends on compatibility adapters.',
        meta: 'Visible',
      },
      {
        label: 'Internal keys',
        description: 'Debug-only storage names and internal identifiers stay out of ordinary product flow.',
        meta: 'Hidden',
      },
    ],
  },
  {
    eyebrow: 'Advanced',
    title: 'Advanced',
    description: 'Diagnostics stay available for intentional troubleshooting without overwhelming the private-book experience.',
    items: [
      {
        label: 'Compatibility diagnostics',
        description: 'Narrow, read-only source summaries can surface here when they genuinely help support a migration issue.',
        meta: 'Lower emphasis',
      },
      {
        label: 'Developer details',
        description: 'Any implementation-focused information should remain tucked away from the everyday relationship journey.',
        meta: 'Restricted',
      },
    ],
  },
]

const dangerZone = {
  eyebrow: 'Separated actions',
  title: 'Danger zone',
  description: 'Destructive actions stay clearly isolated and remain inactive until a reviewed, approved write path exists.',
  items: [
    {
      label: 'Destructive controls',
      description: 'No delete, reset, or revoke action is exposed in this migration-safe placeholder.',
      meta: 'Disabled',
    },
    {
      label: 'Write protection',
      description: 'No live settings writes happen in this batch.',
      meta: 'Current rule',
    },
  ],
}

export function SettingsPage() {
  return (
    <section className="page-stack utility-page">
      <UtilityPageHeader
        eyebrow="Quiet utility"
        folio="Private controls"
        title="Settings"
        description="Calm preferences, privacy notes, and compatibility details belong here once the product structure is ready for safe read-only migration."
      />

      <QuietStatus
        eyebrow="Current status"
        title="This page is establishing structure before live settings migrate."
        description="The shell already owns sign-in, protection, and sign-out. This placeholder defines what settings should contain without showing fake account data or enabling writes."
        items={[
          'No fake account details are rendered here.',
          'No live settings writes happen in this batch.',
          'Diagnostics stay lower-emphasis than privacy and reading guidance.',
        ]}
      />

      <PageDivider label="Future groups" />

      <UtilitySection
        eyebrow="Planned structure"
        title="Settings stays grouped, quiet, and intentionally secondary."
        description="The future page should explain account, appearance, privacy, compatibility, and diagnostics without becoming a second dashboard."
      >
        <div className="settings-group-grid">
          {settingsGroups.map((group) => (
            <SettingsGroup
              description={group.description}
              eyebrow={group.eyebrow}
              items={group.items}
              key={group.title}
              title={group.title}
            />
          ))}
        </div>
      </UtilitySection>

      <UtilitySection
        className="utility-section-danger"
        eyebrow="Separated actions"
        title="Danger actions stay clearly apart from the rest of the page."
        description="If destructive controls return later, they should live below the main groups with plain language and unmistakable separation."
        tone="danger"
      >
        <SettingsGroup
          className="settings-group-danger-wrap"
          description={dangerZone.description}
          eyebrow={dangerZone.eyebrow}
          items={dangerZone.items}
          title={dangerZone.title}
          tone="danger"
        />
      </UtilitySection>
    </section>
  )
}
