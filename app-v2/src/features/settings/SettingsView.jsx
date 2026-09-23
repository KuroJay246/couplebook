import {
  Bell,
  CalendarDays,
  HardDrive,
  HeartHandshake,
  Info,
  KeyRound,
  LockKeyhole,
  LogOut,
  MonitorCog,
  Shield,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button.jsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { FormField, SelectField } from '../../components/ui/FormField.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { LoadingState } from '../../components/ui/LoadingState.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { ContentCard, Surface } from '../../components/ui/Surface.jsx'
import { useAuth } from '../../auth/useAuth.js'
import { useTheme } from '../../theme/useTheme.js'
import { DEFAULT_THEME_ID, THEME_REGISTRY } from '../../theme/themeRegistry.js'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'
import { GOOGLE_PROVIDER_ID, isGoogleProviderLinked } from '../../services/authService.js'
import { MediaSettingsSection } from './MediaSettingsSection.jsx'

const SETTINGS_CATEGORIES = [
  { key: 'account', label: 'Account', group: 'Access', description: 'Signed-in identity and session controls.' },
  { key: 'profiles', label: 'Relationship & Profiles', group: 'Couple Book', description: 'Where shared profile details live.' },
  { key: 'dates', label: 'Important Dates', group: 'Couple Book', description: 'Birthday and anniversary ownership.' },
  { key: 'appearance', label: 'Appearance', group: 'Personalization', description: 'Theme, motion, and relationship date view.' },
  { key: 'media', label: 'Media & Sync', group: 'Library', description: 'Drive connection, upload queue, and sync health.' },
  { key: 'notifications', label: 'Notifications', group: 'Personalization', description: 'Quiet app reminders and permission state.' },
  { key: 'privacy', label: 'Privacy & Security', group: 'Safety', description: 'Private-data boundaries and access checks.' },
  { key: 'storage', label: 'App & Storage', group: 'Safety', description: 'Local cache and offline shell limits.' },
  { key: 'advanced', label: 'Advanced / Diagnostics', group: 'Maintenance', description: 'System health for owner review.' },
  { key: 'about', label: 'About', group: 'Maintenance', description: 'Product mode and media boundary.' },
]

function getSettingsCategory(key) {
  return SETTINGS_CATEGORIES.find((category) => category.key === key) || SETTINGS_CATEGORIES[0]
}

function getSettingsGroups() {
  return SETTINGS_CATEGORIES.reduce((groups, category) => {
    const existing = groups.find((group) => group.label === category.group)
    if (existing) {
      existing.categories.push(category)
      return groups
    }
    groups.push({ label: category.group, categories: [category] })
    return groups
  }, [])
}

function buildFormState(model) {
  return {
    appearanceTheme: model.appearance?.currentTheme?.value || model.appearance?.preservedTheme?.value || DEFAULT_THEME_ID,
    anniversaryView: model.appearance?.anniversaryView?.value || 'dual',
    localOnlyMode: model.appearance?.privacy?.localOnlyMode === true,
    notifications: Object.fromEntries((model.notifications?.categories || []).map((category) => [category.key, category.enabled === true])),
    reducedMotion: model.appearance?.privacy?.reducedMotion === true,
    revision: model.appearance?.revision || 0,
  }
}

function hasChanges(loadedForm, form) {
  return (
    loadedForm.appearanceTheme !== form.appearanceTheme
    || loadedForm.anniversaryView !== form.anniversaryView
    || loadedForm.localOnlyMode !== form.localOnlyMode
    || JSON.stringify(loadedForm.notifications || {}) !== JSON.stringify(form.notifications || {})
    || loadedForm.reducedMotion !== form.reducedMotion
  )
}

function ToggleRow({ checked, description, label, onChange }) {
  return (
    <div className="cb-card flex items-start justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>{label}</p>
        <p className="cb-body-copy mt-1 text-sm">{description}</p>
      </div>
      <button
        aria-label={label}
        aria-pressed={checked}
        className="cb-motion-standard relative mt-1 h-9 min-w-14 shrink-0 rounded-full"
        style={{ background: checked ? 'var(--cb-accent)' : 'color-mix(in srgb, var(--cb-border-strong) 90%, transparent)' }}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span
          className="cb-motion-standard absolute top-1 size-7 rounded-full"
          style={{
            left: checked ? '1.75rem' : '0.25rem',
            background: 'var(--cb-surface-raised)',
            boxShadow: 'var(--cb-shadow-soft)',
          }}
        />
      </button>
    </div>
  )
}

function ThemeTile({ active, onSelect, theme }) {
  return (
    <button
      aria-pressed={active}
      className="cb-motion-standard cb-card text-left"
      style={{
        padding: '1rem',
        borderColor: active ? 'var(--cb-accent)' : 'var(--cb-border)',
        boxShadow: active
          ? '0 0 0 2px color-mix(in srgb, var(--cb-accent) 18%, transparent)'
          : undefined,
      }}
      key={theme.id}
      onClick={() => onSelect(theme.id)}
      type="button"
    >
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>{theme.name}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--cb-text-muted)' }}>{theme.shortDescription}</p>
          </div>
          {active ? <StatusBadge tone="success">Selected</StatusBadge> : null}
        </div>
        <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr] gap-2">
          <span className="h-16 rounded-2xl border" style={{ background: theme.nav, borderColor: 'color-mix(in srgb, white 12%, transparent)' }} />
          <span className="h-16 rounded-2xl border" style={{ background: theme.surface, borderColor: 'color-mix(in srgb, black 8%, transparent)' }} />
          <span className="h-16 rounded-2xl border" style={{ background: theme.accent, borderColor: 'color-mix(in srgb, black 8%, transparent)' }} />
          <span className="h-16 rounded-2xl border" style={{ background: theme.text, borderColor: 'color-mix(in srgb, black 8%, transparent)' }} />
        </div>
        <p className="text-sm leading-6" style={{ color: 'var(--cb-text-secondary)' }}>{theme.description}</p>
      </div>
    </button>
  )
}

function NotificationSettingsSection({ notifications, onToggle, values }) {
  return (
    <Surface className="cb-page-frame">
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between" style={{ borderColor: 'var(--cb-border)' }}>
        <div className="flex items-start gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-2xl"
            style={{
              background: 'color-mix(in srgb, var(--cb-accent-soft) 88%, transparent)',
              color: 'var(--cb-accent)',
            }}
          >
            <Bell className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="cb-kicker">Notifications</p>
            <h3 className="cb-page-title mt-2 text-3xl">{notifications?.title || 'Notifications'}</h3>
            <p className="cb-body-copy mt-2 text-sm">{notifications?.description}</p>
          </div>
        </div>
        <StatusBadge tone={notifications?.permissionTone || 'warning'}>{notifications?.permissionLabel || 'Not requested'}</StatusBadge>
      </div>

      <InlineAlert
        className="mt-5"
        tone="info"
        title="Permission is not requested automatically"
        description={notifications?.backendBoundary}
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {(notifications?.categories || []).map((category) => (
          <ToggleRow
            checked={values?.[category.key] === true}
            description={category.description}
            key={category.key}
            label={category.label}
            onChange={(checked) => onToggle(category.key, checked)}
          />
        ))}
      </div>
    </Surface>
  )
}

function SettingsHeading({ activeCategory, dirty, onCancel, onSave, status }) {
  const category = getSettingsCategory(activeCategory)

  return (
    <div className="cb-settings-heading">
      <div>
        <p className="cb-kicker">Settings</p>
        <h2>Private settings</h2>
        <p>Manage the parts of Couple Book that affect access, media, appearance, privacy, and this device.</p>
        <div className="cb-settings-context" aria-live="polite">
          <span>{category.group}</span>
          <strong>{category.label}</strong>
          <span>{category.description}</span>
        </div>
      </div>
      <div className="cb-settings-actions">
        <StatusBadge tone={dirty ? 'warning' : 'success'}>
          {dirty ? 'Unsaved changes' : 'Saved'}
        </StatusBadge>
        <SecondaryButton disabled={!dirty || status.saving} onClick={onCancel}>Cancel</SecondaryButton>
        <PrimaryButton loading={status.saving} onClick={onSave}>{status.saving ? 'Saving' : 'Save changes'}</PrimaryButton>
      </div>
    </div>
  )
}

function SettingsTabs({ activeCategory, onSelect }) {
  return (
    <nav aria-label="Settings categories" className="cb-settings-tabs">
      {getSettingsGroups().map((group) => (
        <div className="cb-settings-tab-group" key={group.label}>
          <p className="cb-settings-tab-group-label">{group.label}</p>
          {group.categories.map((category) => (
            <button
              aria-current={activeCategory === category.key ? 'page' : undefined}
              className={activeCategory === category.key ? 'cb-settings-tab cb-settings-tab-active min-h-11' : 'cb-settings-tab min-h-11'}
              key={category.key}
              onClick={() => onSelect(category.key)}
              type="button"
            >
              <span>{category.label}</span>
              <small>{category.description}</small>
            </button>
          ))}
        </div>
      ))}
    </nav>
  )
}

function AccountSettingsSection({ googleLinkState, googleLinked, model, onLinkGoogle, onSignOut }) {
  return (
    <Surface className="cb-page-frame">
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between" style={{ borderColor: 'var(--cb-border)' }}>
        <div className="flex items-start gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-2xl"
            style={{
              background: 'color-mix(in srgb, var(--cb-accent-soft) 88%, transparent)',
              color: 'var(--cb-accent)',
            }}
          >
            <UserRound className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="cb-kicker">Account</p>
            <h3 className="cb-page-title mt-2 text-2xl">Approved account</h3>
            <p className="cb-body-copy mt-2 text-sm">Review the signed-in account, connection method, and this device session without exposing private relationship content.</p>
          </div>
        </div>
        <StatusBadge tone={googleLinked ? 'success' : 'warning'}>{googleLinked ? 'Google linked' : 'Password only'}</StatusBadge>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {(model.account?.details || []).map((detail) => (
          <ContentCard key={detail.key}>
            <p className="cb-kicker">{detail.label}</p>
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>{detail.value}</p>
          </ContentCard>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ContentCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--cb-accent)' }} aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>Google sign-in</p>
                <p className="cb-body-copy mt-2 text-sm">
                  Link Google only while signed in with the existing approved account so the approved identity, couple membership, and private book data stay intact.
                </p>
              </div>
            </div>
            <StatusBadge tone={googleLinked ? 'success' : 'warning'}>{googleLinked ? 'Linked' : 'Not linked'}</StatusBadge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <SecondaryButton disabled={googleLinked || googleLinkState.pending} onClick={onLinkGoogle}>
              {googleLinkState.pending ? 'Opening Google...' : 'Link Google sign-in'}
            </SecondaryButton>
            <StatusBadge>{GOOGLE_PROVIDER_ID}</StatusBadge>
          </div>
          {googleLinkState.message ? (
            <InlineAlert className="mt-4" description={googleLinkState.message} tone={googleLinkState.kind === 'error' ? 'error' : 'success'} />
          ) : null}
        </ContentCard>

        <ContentCard>
          <div className="flex items-start gap-3">
            <LogOut className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--cb-accent)' }} aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>Leave this device</p>
              <p className="cb-body-copy mt-2 text-sm">Sign out closes Couple Book on this device and returns to the private sign-in screen.</p>
            </div>
          </div>
          <div className="mt-4">
            <SecondaryButton onClick={onSignOut}><LogOut className="size-4" />Sign out</SecondaryButton>
          </div>
        </ContentCard>
      </div>
    </Surface>
  )
}

function ProfileSettingsSection() {
  return (
    <Surface className="cb-page-frame">
      <div className="flex items-start gap-3">
        <HeartHandshake className="mt-1 size-5" style={{ color: 'var(--cb-accent)' }} aria-hidden="true" />
        <div>
          <p className="cb-kicker">Relationship & Profiles</p>
          <h3 className="cb-page-title mt-2 text-2xl">Use Us for profile details</h3>
          <p className="cb-body-copy mt-2 text-sm">Partner names, birthdays, shared relationship dates, and favorites live on the Us page so Settings stays focused on configuration.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <PrimaryButton as={Link} to="/profile"><HeartHandshake className="size-4" />Open Us</PrimaryButton>
            <SecondaryButton as={Link} to="/favorites"><Sparkles className="size-4" />Open Favorites</SecondaryButton>
          </div>
        </div>
      </div>
    </Surface>
  )
}

function DatesSettingsSection() {
  return (
    <Surface className="cb-page-frame">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-1 size-5" style={{ color: 'var(--cb-accent)' }} aria-hidden="true" />
        <div>
          <p className="cb-kicker">Important Dates</p>
          <h3 className="cb-page-title mt-2 text-2xl">Dates are managed from Us</h3>
          <p className="cb-body-copy mt-2 text-sm">Birthdays are partner dates. The primary anniversary is a couple-level relationship date.</p>
          <div className="mt-5">
            <PrimaryButton as={Link} to="/profile"><CalendarDays className="size-4" />Manage important dates</PrimaryButton>
          </div>
        </div>
      </div>
    </Surface>
  )
}

function AppearanceSettingsSection({ form, model, onUpdateField }) {
  const currentThemeName = THEME_REGISTRY.find((theme) => theme.id === form.appearanceTheme)?.name || 'Midnight Rose'

  return (
    <Surface className="cb-page-frame">
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: 'var(--cb-border)' }}>
        <div>
          <p className="cb-kicker">Appearance</p>
          <h3 className="cb-page-title mt-2 text-3xl">Appearance</h3>
          <p className="cb-body-copy mt-2 text-sm">Preview every supported theme instantly. Save only one allowed theme ID to your personal settings.</p>
        </div>
        <StatusBadge tone="info">Theme: {currentThemeName}</StatusBadge>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {THEME_REGISTRY.map((theme) => (
          <ThemeTile active={form.appearanceTheme === theme.id} key={theme.id} onSelect={(themeId) => onUpdateField('appearanceTheme', themeId)} theme={theme} />
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <FormField label="Relationship dates view">
          <SelectField id="setting-anniversary-view" onChange={(event) => onUpdateField('anniversaryView', event.target.value)} value={form.anniversaryView}>
            <option value="dual">Show both perspectives</option>
            <option value="jaylan">Jaylan perspective</option>
            <option value="omia">Omia perspective</option>
          </SelectField>
        </FormField>
        <ContentCard>
          <p className="cb-kicker">Current theme</p>
          <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>{model.appearance?.preservedTheme?.label}</p>
          <p className="cb-body-copy mt-2 text-sm">{model.appearance?.preservedTheme?.origin}</p>
        </ContentCard>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ToggleRow
          checked={form.localOnlyMode}
          description="Helpful when reviewing Couple Book on a trusted browser without changing the underlying auth boundary."
          label="Keep private reads on this device"
          onChange={(value) => onUpdateField('localOnlyMode', value)}
        />
        <ToggleRow
          checked={form.reducedMotion}
          description="Use quieter transitions while preserving the Couple Book layout and route structure."
          label="Reduce motion"
          onChange={(value) => onUpdateField('reducedMotion', value)}
        />
      </div>
    </Surface>
  )
}

function AppStorageSettingsSection({ model }) {
  const storageItems = [
    {
      key: 'private-cache',
      label: 'Private app cache',
      summary: 'The web app may keep lightweight local state for responsiveness, but private media originals stay in the approved Drive archive.',
      statusLabel: 'Local device',
    },
    {
      key: 'offline-shell',
      label: 'Offline shell',
      summary: 'Core application files can remain available after first load. Protected data still requires an approved session and current permissions.',
      statusLabel: 'Guarded',
    },
    {
      key: 'media-queue',
      label: 'Media queue',
      summary: model.media?.queue?.summary || 'Upload and recovery queue status is surfaced from the Media & Sync section when available.',
      statusLabel: model.media?.queue?.statusLabel || 'Ready',
    },
  ]

  return (
    <Surface className="cb-page-frame">
      <div className="flex items-start gap-3">
        <HardDrive className="mt-1 size-5" style={{ color: 'var(--cb-accent)' }} aria-hidden="true" />
        <div>
          <p className="cb-kicker">App & Storage</p>
          <h3 className="cb-page-title mt-2 text-2xl">Local app storage</h3>
          <p className="cb-body-copy mt-2 text-sm">Review what the installed web app can keep locally without changing the Drive-first media boundary.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        {storageItems.map((item) => <StorageItemCard key={item.key} item={item} />)}
      </div>
    </Surface>
  )
}

function StorageItemCard({ item }) {
  return (
    <ContentCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>{item.label}</p>
          <p className="cb-body-copy mt-2 text-sm">{item.summary}</p>
        </div>
        <StatusBadge>{item.statusLabel}</StatusBadge>
      </div>
    </ContentCard>
  )
}

function AboutSettingsSection({ model }) {
  return (
    <Surface className="cb-page-frame">
      <div className="flex items-start gap-3">
        <Info className="mt-1 size-5" style={{ color: 'var(--cb-accent)' }} aria-hidden="true" />
        <div>
          <p className="cb-kicker">About</p>
          <h3 className="cb-page-title mt-2 text-2xl">Couple Book</h3>
          <p className="cb-body-copy mt-2 text-sm">A private two-person memory book for shared plans, photos, videos, milestones, and special pages.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <ContentCard>
          <p className="cb-kicker">Media boundary</p>
          <p className="cb-body-copy mt-2 text-sm">{model.media?.boundary || 'Original media stays Drive-first. Firestore stores stable metadata, not temporary preview URLs.'}</p>
        </ContentCard>
        <ContentCard>
          <p className="cb-kicker">Product mode</p>
          <p className="cb-body-copy mt-2 text-sm">Owner-review web app. Native work remains frozen unless explicitly resumed.</p>
        </ContentCard>
      </div>
    </Surface>
  )
}

function PrivacySettingsSection({ model }) {
  return (
    <Surface>
      <div className="flex items-start gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-2xl"
          style={{
            background: 'color-mix(in srgb, var(--cb-accent-soft) 88%, transparent)',
            color: 'var(--cb-accent)',
          }}
        >
          <Shield className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="cb-kicker">Privacy and access</p>
          <h3 className="cb-page-title mt-2 text-2xl">Account boundaries stay quiet</h3>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        {(model.privacy?.items || []).map((item) => (
          <ContentCard key={item.label}>
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--cb-accent)' }} aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>{item.label}</p>
                <p className="cb-body-copy mt-2 text-sm">{item.description}</p>
              </div>
            </div>
          </ContentCard>
        ))}
      </div>
    </Surface>
  )
}

function AdvancedSettingsSection({ model }) {
  return (
    <details className="cb-advanced-panel" open>
      <summary className="cb-advanced-summary">
        <span>
          <span className="cb-kicker">Advanced / Diagnostics</span>
          <span className="mt-1 block text-lg font-semibold" style={{ color: 'var(--cb-text)' }}>System health</span>
        </span>
        <span className="text-sm font-semibold" style={{ color: 'var(--cb-accent)' }}>Review</span>
      </summary>
      <div className="grid gap-5 pt-5">
        <Surface tone="soft">
          <div className="flex items-start gap-3">
            <MonitorCog className="mt-1 size-5" style={{ color: 'var(--cb-accent)' }} aria-hidden="true" />
            <div>
              <p className="cb-kicker">System health</p>
              <h3 className="cb-page-title mt-2 text-2xl">System health</h3>
              <p className="cb-body-copy mt-2 text-sm">Private access, saved data, and media connection health.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {(model.compatibility?.items || []).map((item) => (
              <ContentCard key={item.key}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>{item.label}</p>
                    <p className="cb-body-copy mt-2 text-sm">{item.summary}</p>
                  </div>
                  <StatusBadge>{item.statusLabel}</StatusBadge>
                </div>
              </ContentCard>
            ))}
          </div>
        </Surface>

      </div>
    </details>
  )
}

function SettingsCategoryPane({ activeCategory, form, googleLinkState, googleLinked, model, onLinkGoogle, onSignOut, onToggleNotification, onUpdateField }) {
  if (activeCategory === 'account') {
    return <AccountSettingsSection googleLinkState={googleLinkState} googleLinked={googleLinked} model={model} onLinkGoogle={onLinkGoogle} onSignOut={onSignOut} />
  }
  if (activeCategory === 'profiles') return <ProfileSettingsSection />
  if (activeCategory === 'dates') return <DatesSettingsSection />
  if (activeCategory === 'appearance') return <AppearanceSettingsSection form={form} model={model} onUpdateField={onUpdateField} />
  if (activeCategory === 'media') return <MediaSettingsSection media={model.media} />
  if (activeCategory === 'notifications') {
    return <NotificationSettingsSection notifications={model.notifications} onToggle={onToggleNotification} values={form.notifications} />
  }
  if (activeCategory === 'privacy') {
    return <PrivacySettingsSection model={model} />
  }
  if (activeCategory === 'storage') return <AppStorageSettingsSection model={model} />
  if (activeCategory === 'about') return <AboutSettingsSection model={model} />
  return <AdvancedSettingsSection model={model} />
}

export function SettingsView({ compatibilityError, compatibilityState, model, onRefresh }) {
  const writer = useOwnerWrite(onRefresh)
  const { linkGoogleProvider, signOut, user } = useAuth()
  const { previewTheme, commitTheme, resetTheme } = useTheme()
  const loadedForm = useMemo(() => buildFormState(model), [model])
  const [draft, setDraft] = useState({})
  const [signOutState, setSignOutState] = useState({ open: false, pending: false })
  const [googleLinkState, setGoogleLinkState] = useState({ kind: '', message: '', pending: false })
  const [status, setStatus] = useState({ kind: '', message: '', saving: false })
  const [activeCategory, setActiveCategory] = useState('account')
  const form = useMemo(() => ({ ...loadedForm, ...draft, revision: loadedForm.revision }), [draft, loadedForm])
  const dirty = hasChanges(loadedForm, form)
  const googleLinked = isGoogleProviderLinked(user)

  function updateField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
    if (key === 'appearanceTheme') {
      previewTheme(value)
    }
  }

  function updateNotificationPreference(key, value) {
    setDraft((current) => ({
      ...current,
      notifications: {
        ...(form.notifications || {}),
        ...(current.notifications || {}),
        [key]: value,
      },
    }))
  }

  function resetCurrentView() {
    setDraft({})
    resetTheme()
    setStatus({ kind: 'success', message: 'Appearance and settings restored to the saved view.', saving: false })
  }

  async function saveSettings() {
    setStatus({ kind: '', message: '', saving: true })
    try {
      await writer.saveSettings(form)
      commitTheme(form.appearanceTheme)
      setDraft({})
      setStatus({ kind: 'success', message: 'Settings saved.', saving: false })
    } catch (error) {
      const message = error?.message || 'Settings could not be saved.'
      setStatus({
        kind: 'error',
        message: /another session|refresh and try again/i.test(message)
          ? 'These settings changed somewhere else. Refresh, review the latest values, and try again.'
          : message,
        saving: false,
      })
    }
  }

  async function confirmSignOut() {
    setSignOutState({ open: true, pending: false })
  }

  async function handleSignOut() {
    setSignOutState({ open: true, pending: true })
    try {
      await signOut()
    } finally {
      setSignOutState({ open: false, pending: false })
    }
  }

  async function handleLinkGoogle() {
    setGoogleLinkState({ kind: '', message: '', pending: true })
    try {
      const result = await linkGoogleProvider()
      setGoogleLinkState({
        kind: 'success',
        message: result.alreadyLinked
          ? 'Google sign-in is already linked to this approved Couple Book account.'
          : 'Google sign-in is now linked to this approved Couple Book account.',
        pending: false,
      })
    } catch (error) {
      setGoogleLinkState({
        kind: 'error',
        message: error?.message || 'Google sign-in could not be linked. Try again.',
        pending: false,
      })
    }
  }

  if (compatibilityState === 'loading') {
    return <LoadingState message="Loading Settings..." />
  }

  if (compatibilityError || model.status === 'invalid') {
    return <ErrorState title="Settings could not be loaded" message={compatibilityError || 'The Settings view is not available right now.'} onRetry={onRefresh} />
  }

  return (
    <section className="cb-settings-page" data-route="settings">
      <SettingsHeading activeCategory={activeCategory} dirty={dirty} onCancel={resetCurrentView} onSave={saveSettings} status={status} />

      {status.message ? <InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /> : null}

      <div className="cb-settings-layout">
        <SettingsTabs activeCategory={activeCategory} onSelect={setActiveCategory} />

        <div className="cb-settings-pane">
          <SettingsCategoryPane
            activeCategory={activeCategory}
            form={form}
            googleLinkState={googleLinkState}
            googleLinked={googleLinked}
            model={model}
            onLinkGoogle={handleLinkGoogle}
            onSignOut={confirmSignOut}
            onToggleNotification={updateNotificationPreference}
            onUpdateField={updateField}
          />
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="Sign out"
        message="This closes the approved Couple Book session on this device and returns to the sign-in screen."
        onCancel={() => setSignOutState({ open: false, pending: false })}
        onConfirm={handleSignOut}
        open={signOutState.open}
        pending={signOutState.pending}
        recordName={model.account?.email}
        title="Sign out of Couple Book?"
      />
    </section>
  )
}
