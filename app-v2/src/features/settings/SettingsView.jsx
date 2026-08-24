import {
  Gift,
  Heart,
  LockKeyhole,
  LogOut,
  MonitorCog,
  PenSquare,
  ScrollText,
  Shield,
  Sparkles,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button.jsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { FormField, SelectField } from '../../components/ui/FormField.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { LoadingState } from '../../components/ui/LoadingState.jsx'
import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { ContentCard, Surface } from '../../components/ui/Surface.jsx'
import { useAuth } from '../../auth/useAuth.js'
import { useTheme } from '../../theme/useTheme.js'
import { DEFAULT_THEME_ID, THEME_REGISTRY } from '../../theme/themeRegistry.js'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'

const MOMENT_LINKS = [
  {
    href: '/birthday',
    icon: Gift,
    title: 'Birthday',
    description: 'A warmer chapter for celebrations, notes, and meaningful reveals.',
  },
  {
    href: '/valentine',
    icon: Heart,
    title: 'Valentine',
    description: 'A love-letter reading flow with a softer, more intimate pace.',
  },
  {
    href: '/confession',
    icon: PenSquare,
    title: 'Confession',
    description: 'A quieter private page for vulnerable writing and protected edits.',
  },
]

function buildFormState(model) {
  return {
    appearanceTheme: model.appearance?.currentTheme?.value || model.appearance?.preservedTheme?.value || DEFAULT_THEME_ID,
    anniversaryView: model.appearance?.anniversaryView?.value || 'dual',
    localOnlyMode: model.appearance?.privacy?.localOnlyMode === true,
    reducedMotion: model.appearance?.privacy?.reducedMotion === true,
    revision: model.appearance?.revision || 0,
  }
}

function hasChanges(loadedForm, form) {
  return (
    loadedForm.appearanceTheme !== form.appearanceTheme
    || loadedForm.anniversaryView !== form.anniversaryView
    || loadedForm.localOnlyMode !== form.localOnlyMode
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

export function SettingsView({ compatibilityError, compatibilityState, model, onRefresh }) {
  const writer = useOwnerWrite(onRefresh)
  const { signOut } = useAuth()
  const { activeTheme, previewTheme, commitTheme, resetTheme } = useTheme()
  const loadedForm = useMemo(() => buildFormState(model), [model])
  const [draft, setDraft] = useState({})
  const [signOutState, setSignOutState] = useState({ open: false, pending: false })
  const [status, setStatus] = useState({ kind: '', message: '', saving: false })
  const form = useMemo(() => ({ ...loadedForm, ...draft, revision: loadedForm.revision }), [draft, loadedForm])
  const dirty = hasChanges(loadedForm, form)
  const agreementCards = [model.contract?.currentUser, model.contract?.partner].filter(Boolean)

  function updateField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
    if (key === 'appearanceTheme') {
      previewTheme(value)
    }
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

  if (compatibilityState === 'loading') {
    return <LoadingState message="Loading Settings..." />
  }

  if (compatibilityError || model.status === 'invalid') {
    return <ErrorState title="Settings could not be loaded" message={compatibilityError || 'The Settings view is not available right now.'} onRetry={onRefresh} />
  }

  return (
    <section className="space-y-5" data-route="settings">
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        description="Appearance, special pages, privacy details, and the personal controls that belong around your private shared journal."
        actions={(
          <>
            <StatusBadge tone={dirty ? 'warning' : 'success'}>
              {dirty ? 'Unsaved changes' : `Saved theme: ${activeTheme}`}
            </StatusBadge>
            <SecondaryButton disabled={!dirty || status.saving} onClick={resetCurrentView}>Cancel</SecondaryButton>
            <PrimaryButton loading={status.saving} onClick={saveSettings}>{status.saving ? 'Saving' : 'Save changes'}</PrimaryButton>
          </>
        )}
      />

      {status.message ? <InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <Surface className="cb-page-frame">
          <p className="cb-kicker">Special moments</p>
          <h3 className="cb-page-title mt-2 text-3xl">Birthday, Valentine, and Confession</h3>
          <p className="cb-body-copy mt-3 text-sm">
            Birthday, Valentine, and Confession stay close here so they feel like part of the same product without becoming ordinary list pages.
          </p>
          <div className="mt-5 grid gap-3">
            {MOMENT_LINKS.map(({ href, icon: Icon, title, description }) => (
              <Link className="cb-card cb-motion-standard flex items-start gap-4 p-4 hover:translate-y-[-1px]" key={href} to={href}>
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-2xl"
                  style={{
                    background: 'color-mix(in srgb, var(--cb-accent-soft) 88%, transparent)',
                    color: 'var(--cb-accent)',
                  }}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>{title}</span>
                  <span className="cb-body-copy mt-1 block text-sm">{description}</span>
                </span>
              </Link>
            ))}
          </div>
        </Surface>

        <Surface tone="soft">
          <div className="flex items-start gap-3">
            <span
              className="grid size-11 shrink-0 place-items-center rounded-2xl"
              style={{
                background: 'color-mix(in srgb, var(--cb-accent-soft) 88%, transparent)',
                color: 'var(--cb-accent)',
              }}
            >
              <ScrollText className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="cb-kicker">Our commitment</p>
              <h3 className="cb-page-title mt-2 text-2xl">Contract</h3>
              <p className="cb-body-copy mt-2 text-sm">The contract stays readable, deliberate, and visually secondary to the promise itself.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {agreementCards.length > 0 ? agreementCards.map((record) => (
              <ContentCard key={record.displayName}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>{record.displayName}</p>
                    <p className="cb-body-copy mt-2 text-sm">{record.note}</p>
                  </div>
                  <StatusBadge tone={record.status === 'accepted' ? 'success' : 'warning'}>{record.label}</StatusBadge>
                </div>
              </ContentCard>
            )) : null}
            <SecondaryButton as={Link} to="/contract">Open Contract</SecondaryButton>
          </div>
        </Surface>
      </div>

      <Surface className="cb-page-frame">
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: 'var(--cb-border)' }}>
          <div>
            <p className="cb-kicker">Appearance</p>
            <h3 className="cb-page-title mt-2 text-3xl">Appearance</h3>
            <p className="cb-body-copy mt-2 text-sm">Preview every supported theme instantly. Save only one allowed theme ID to your personal settings.</p>
          </div>
          <StatusBadge tone="info">{THEME_REGISTRY.find((theme) => theme.id === form.appearanceTheme)?.name || 'Midnight Rose'}</StatusBadge>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {THEME_REGISTRY.map((theme) => (
            <ThemeTile active={form.appearanceTheme === theme.id} key={theme.id} onSelect={(themeId) => updateField('appearanceTheme', themeId)} theme={theme} />
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <FormField label="Relationship dates view">
            <SelectField id="setting-anniversary-view" onChange={(event) => updateField('anniversaryView', event.target.value)} value={form.anniversaryView}>
              <option value="dual">Show both perspectives</option>
              <option value="jaylan">Jaylan perspective</option>
              <option value="omia">Omia perspective</option>
            </SelectField>
          </FormField>
          <ContentCard>
            <p className="cb-kicker">Saved preference</p>
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>{model.appearance?.preservedTheme?.label}</p>
            <p className="cb-body-copy mt-2 text-sm">{model.appearance?.preservedTheme?.origin}</p>
          </ContentCard>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <ToggleRow
            checked={form.localOnlyMode}
            description="Helpful when reviewing Couple Book on a trusted browser without changing the underlying auth boundary."
            label="Keep private reads on this device"
            onChange={(value) => updateField('localOnlyMode', value)}
          />
          <ToggleRow
            checked={form.reducedMotion}
            description="Use quieter transitions while preserving the Couple Book layout and route structure."
            label="Reduce motion"
            onChange={(value) => updateField('reducedMotion', value)}
          />
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
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
            {(model.account?.details || []).map((detail) => (
              <ContentCard key={detail.key}>
                <p className="cb-kicker">{detail.label}</p>
                <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--cb-text)' }}>{detail.value}</p>
              </ContentCard>
            ))}
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

        <div className="grid gap-5">
          <Surface tone="soft">
            <div className="flex items-start gap-3">
              <MonitorCog className="mt-1 size-5" style={{ color: 'var(--cb-accent)' }} aria-hidden="true" />
              <div>
                <p className="cb-kicker">System health</p>
                <h3 className="cb-page-title mt-2 text-2xl">System health</h3>
                <p className="cb-body-copy mt-2 text-sm">Compatibility stays visible here without turning Settings into an engineering dashboard.</p>
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

          <Surface tone="soft">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 size-5" style={{ color: 'var(--cb-accent)' }} aria-hidden="true" />
              <div>
                <p className="cb-kicker">Account</p>
                <h3 className="cb-page-title mt-2 text-2xl">Leave this device</h3>
                <p className="cb-body-copy mt-2 text-sm">Sign out closes Couple Book on this device and returns to the private sign-in screen.</p>
              </div>
            </div>
            <div className="mt-5">
              <SecondaryButton onClick={confirmSignOut}><LogOut className="size-4" />Sign out</SecondaryButton>
            </div>
          </Surface>
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
