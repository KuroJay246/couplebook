import { Shield, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button.jsx'
import { ErrorState } from '../../components/ui/ErrorState.jsx'
import { FormField, SelectField } from '../../components/ui/FormField.jsx'
import { InlineAlert } from '../../components/ui/InlineAlert.jsx'
import { LoadingState } from '../../components/ui/LoadingState.jsx'
import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { PageTabs } from '../../components/ui/PageTabs.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { ContentCard, Surface } from '../../components/ui/Surface.jsx'
import { useOwnerWrite } from '../editing/useOwnerWrite.js'

const PANELS = [
  { key: 'appearance', label: 'Appearance' },
  { key: 'privacy', label: 'Privacy' },
  { key: 'account', label: 'Access' },
  { key: 'compatibility', label: 'Compatibility' },
  { key: 'advanced', label: 'Application' },
]

const THEMES = [
  { key: 'paper', label: 'Editorial paper' },
  { key: 'rose', label: 'Crisp light' },
  { key: 'olive', label: 'Warm sunset' },
  { key: 'plum', label: 'Kuromi gothic' },
]

function buildFormState(model) {
  return {
    theme: model.appearance?.preservedTheme?.value || 'paper',
    anniversaryView: model.appearance?.anniversaryView?.value || 'dual',
    localOnlyMode: model.appearance?.privacy?.localOnlyMode === true,
    reducedMotion: model.appearance?.privacy?.reducedMotion === true,
    revision: model.appearance?.revision || 0,
  }
}

function ToggleRow({ checked, description, label, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#24131d]">{label}</p>
        <p className="mt-1 text-sm leading-6 text-[#6B564C]">{description}</p>
      </div>
      <button
        aria-pressed={checked}
        className={`relative mt-1 h-7 w-12 rounded-full transition ${checked ? 'bg-[#8f5168]' : 'bg-[#dcc2cd]'}`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span className={`absolute top-1 size-5 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}

export function SettingsView({ compatibilityError, compatibilityState, model, onRefresh }) {
  const [active, setActive] = useState('appearance')
  const writer = useOwnerWrite(onRefresh)
  const loadedForm = buildFormState(model)
  const [draft, setDraft] = useState({})
  const [status, setStatus] = useState({ kind: '', message: '', saving: false })
  const form = useMemo(() => ({ ...loadedForm, ...draft, revision: loadedForm.revision }), [draft, loadedForm])
  const hasDraftChanges = Object.keys(draft).length > 0

  function updateField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function resetCurrentPanel() {
    setDraft({})
    setStatus({ kind: 'success', message: 'Settings restored to the current saved view.', saving: false })
  }

  async function saveSettings(event) {
    event.preventDefault()
    setStatus({ kind: '', message: '', saving: true })
    try {
      await writer.saveSettings(form)
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

  if (compatibilityState === 'loading') {
    return <LoadingState message="Loading Settings..." />
  }

  if (compatibilityError || model.status === 'invalid') {
    return <ErrorState title="Settings could not be loaded" message={compatibilityError || 'The Settings view is not available right now.'} onRetry={onRefresh} />
  }

  return (
    <section className="space-y-5" data-route="settings">
      <PageHeader
        eyebrow="Care And Privacy"
        title="Application Settings"
        description="Adjust themes, preferences, and account visibility details without changing Couple Book’s private boundaries."
        actions={(
          <>
            <StatusBadge tone={hasDraftChanges ? 'warning' : 'success'}>{hasDraftChanges ? 'Unsaved changes' : 'Saved view'}</StatusBadge>
            <PrimaryButton loading={status.saving} onClick={saveSettings}>{status.saving ? 'Saving' : 'Save settings'}</PrimaryButton>
          </>
        )}
      />

      {status.message ? <InlineAlert description={status.message} tone={status.kind === 'error' ? 'error' : 'success'} /> : null}

      <PageTabs active={active} controlsPanels={false} idPrefix="settings" label="Settings sections" onChange={setActive} tabs={PANELS.map((panel) => ({ id: panel.key, label: panel.label }))} />

      <form className="space-y-5" onSubmit={saveSettings}>
        {active === 'appearance' ? (
          <Surface>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Appearance</p>
            <h3 className="mt-2 font-serif text-3xl text-[#24131d]">{model.appearance?.runtimeTheme?.label || 'Editorial paper and ink'}</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6B564C]">{model.appearance?.runtimeTheme?.description}</p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {THEMES.map((theme) => (
                <button
                  aria-pressed={form.theme === theme.key}
                  className={`rounded-2xl border p-4 text-left transition ${form.theme === theme.key ? 'border-[#8f5168] bg-[#fceef3]' : 'border-[#EEDFD6] bg-white hover:bg-[#FFF8F2]'}`}
                  key={theme.key}
                  onClick={() => updateField('theme', theme.key)}
                  type="button"
                >
                  <div className="flex gap-2">
                    <span className="size-4 rounded-full bg-[#8f5168]" />
                    <span className="size-4 rounded-full bg-[#24131d]" />
                    <span className="size-4 rounded-full bg-[#f7dde6]" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-[#24131d]">{theme.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[#6B564C]">{theme.key === form.theme ? 'Selected for save.' : 'Available preference.'}</p>
                </button>
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
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#806572]">Preserved preference</p>
                <p className="mt-2 text-sm font-semibold text-[#24131d]">{model.appearance?.preservedTheme?.label}</p>
                <p className="mt-1 text-sm text-[#6B564C]">{model.appearance?.preservedTheme?.origin}</p>
              </ContentCard>
            </div>
          </Surface>
        ) : null}

        {active === 'privacy' ? (
          <Surface>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Privacy</p>
            <h3 className="mt-2 font-serif text-3xl text-[#24131d]">Quiet defaults for a private book</h3>
            <div className="mt-5 grid gap-4">
              <ToggleRow
                checked={form.localOnlyMode}
                description="Helpful when reviewing Couple Book on a trusted browser."
                label="Keep private reads on this device"
                onChange={(value) => updateField('localOnlyMode', value)}
              />
              <ToggleRow
                checked={form.reducedMotion}
                description="Keep transitions quieter while preserving the approved look."
                label="Reduce motion"
                onChange={(value) => updateField('reducedMotion', value)}
              />
            </div>
            <div className="mt-5 grid gap-3">
              {(model.privacy?.items || []).map((item) => (
                <ContentCard key={item.label}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#24131d]">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-[#6B564C]">{item.description}</p>
                    </div>
                    <StatusBadge>{item.meta}</StatusBadge>
                  </div>
                </ContentCard>
              ))}
            </div>
          </Surface>
        ) : null}

        {active === 'account' ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Surface>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Access</p>
              <h3 className="mt-2 font-serif text-3xl text-[#24131d]">{model.account?.displayName}</h3>
              <div className="mt-5 grid gap-3">
                {(model.account?.details || []).map((detail) => (
                  <ContentCard key={detail.key}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#806572]">{detail.label}</p>
                    <p className="mt-2 text-sm font-semibold text-[#24131d]">{detail.value}</p>
                  </ContentCard>
                ))}
              </div>
            </Surface>
            <Surface tone="soft">
              <div className="flex items-start gap-3">
                <Shield className="mt-1 size-5 text-[#8f5168]" aria-hidden="true" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Account boundaries</p>
                  <h3 className="mt-2 font-serif text-2xl text-[#24131d]">Protected access stays separate</h3>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {(model.account?.items || []).map((item) => (
                  <ContentCard key={item.label}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#24131d]">{item.label}</p>
                        <p className="mt-2 text-sm leading-6 text-[#6B564C]">{item.description}</p>
                      </div>
                      <StatusBadge>{item.meta}</StatusBadge>
                    </div>
                  </ContentCard>
                ))}
              </div>
            </Surface>
          </div>
        ) : null}

        {active === 'compatibility' ? (
          <Surface>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Compatibility</p>
            <h3 className="mt-2 font-serif text-3xl text-[#24131d]">Read bridges and migration state</h3>
            <div className="mt-5 grid gap-3">
              {(model.compatibility?.items || []).map((item) => (
                <ContentCard key={item.key}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#24131d]">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-[#6B564C]">{item.summary}</p>
                      {item.sourceName ? <p className="mt-2 text-xs text-[#806572]">{item.sourceName}</p> : null}
                    </div>
                    <StatusBadge>{item.statusLabel}</StatusBadge>
                  </div>
                </ContentCard>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
              {(model.compatibility?.notes || []).map((note) => <p className="text-sm leading-6 text-[#6B564C]" key={note}>{note}</p>)}
            </div>
          </Surface>
        ) : null}

        {active === 'advanced' ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Surface>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Application</p>
              <h3 className="mt-2 font-serif text-3xl text-[#24131d]">Current runtime and workflow</h3>
              <div className="mt-5 grid gap-3">
                {(model.advanced?.items || []).map((item) => (
                  <ContentCard key={item.label}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#24131d]">{item.label}</p>
                        <p className="mt-2 text-sm leading-6 text-[#6B564C]">{item.description}</p>
                      </div>
                      <StatusBadge>{item.meta}</StatusBadge>
                    </div>
                  </ContentCard>
                ))}
              </div>
            </Surface>
            <Surface tone="soft">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Safe limits</p>
              <h3 className="mt-2 font-serif text-2xl text-[#24131d]">Data and backup</h3>
              <div className="mt-5 grid gap-3">
                {(model.danger?.items || []).map((item) => (
                  <ContentCard key={item.label}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#24131d]">{item.label}</p>
                        <p className="mt-2 text-sm leading-6 text-[#6B564C]">{item.description}</p>
                      </div>
                      <StatusBadge>{item.meta}</StatusBadge>
                    </div>
                  </ContentCard>
                ))}
              </div>
            </Surface>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton disabled={!hasDraftChanges} onClick={resetCurrentPanel}>Cancel changes</SecondaryButton>
          <PrimaryButton loading={status.saving} type="submit">{status.saving ? 'Saving' : 'Save settings'}</PrimaryButton>
        </div>
      </form>
    </section>
  )
}
