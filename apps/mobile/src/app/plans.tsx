import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  BadgePill,
  CoupleBookScreen,
  FilterChip,
  InfoRow,
  SearchInput,
  SectionCard,
} from '@/components/couplebook-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCoupleData } from '@/hooks/use-couple-data';
import { useOwnerWrite } from '@/hooks/use-owner-write';
import { createDateAtNoon } from '../../../../packages/core/src/index.js';

type PlanFilter = 'all' | 'idea' | 'planned' | 'completed';

function formatDateLabel(value: string, fallback = 'No date') {
  const date = createDateAtNoon(value);
  if (!date) return fallback;

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PlansScreen() {
  const { error, loading, plans, warnings } = useCoupleData();
  const theme = useTheme();
  const writer = useOwnerWrite();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<PlanFilter>('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [saveState, setSaveState] = useState({ kind: '', message: '', saving: false });
  const [form, setForm] = useState({
    id: '',
    title: '',
    category: 'Date Idea',
    status: 'idea',
    targetDate: new Date().toISOString().slice(0, 10),
    notes: '',
    revision: 0,
    convertedMemoryId: '',
  });

  const ideaCount = plans.filter((entry) => entry.status === 'idea').length;
  const plannedCount = plans.filter((entry) => entry.status === 'planned').length;
  const completedCount = plans.filter((entry) => entry.status === 'completed').length;
  const nextPlan = plans.find((entry) => entry.status === 'planned' || entry.status === 'idea') || null;

  const filteredPlans = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return plans.filter((entry) => {
      if (activeFilter !== 'all' && entry.status !== activeFilter) return false;
      if (!searchTerm) return true;

      return [entry.title, entry.category, entry.notes, entry.targetDate, entry.status]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm);
    });
  }, [activeFilter, plans, search]);

  function resetComposer() {
    setComposerOpen(false);
    setForm({
      id: '',
      title: '',
      category: 'Date Idea',
      status: 'idea',
      targetDate: new Date().toISOString().slice(0, 10),
      notes: '',
      revision: 0,
      convertedMemoryId: '',
    });
  }

  function beginCreate() {
    setSaveState({ kind: '', message: '', saving: false });
    setComposerOpen(true);
    resetComposer();
    setComposerOpen(true);
  }

  function beginEdit(plan: (typeof filteredPlans)[number]) {
    setSaveState({ kind: '', message: '', saving: false });
    setComposerOpen(true);
    setForm({
      id: plan.id,
      title: plan.title || '',
      category: plan.category || 'Date Idea',
      status: plan.status || 'idea',
      targetDate: plan.targetDate || new Date().toISOString().slice(0, 10),
      notes: plan.notes || '',
      revision: plan.revision || 0,
      convertedMemoryId: plan.convertedMemoryId || '',
    });
  }

  function formatWriteError(error: unknown) {
    const message = error instanceof Error ? error.message : 'This plan could not be saved.';
    if (/disabled outside approved mobile Firestore write mode/i.test(message)) {
      return 'Plan writes are disabled in this build. Use the approved emulator write mode for development writes.';
    }
    if (/changed in another session/i.test(message)) {
      return 'This plan changed somewhere else. Reload the latest version and try again.';
    }
    if (/already has a memory/i.test(message)) {
      return 'This plan was already converted to a memory.';
    }
    return message;
  }

  async function handleSave() {
    setSaveState({ kind: '', message: '', saving: true });
    try {
      if (form.id) {
        await writer.updatePlan(form.id, {
          title: form.title,
          category: form.category,
          status: form.status,
          targetDate: form.targetDate,
          notes: form.notes,
          revision: form.revision,
          convertedMemoryId: form.convertedMemoryId,
        });
        setSaveState({ kind: 'success', message: 'Plan updated.', saving: false });
      } else {
        await writer.createPlan({
          title: form.title,
          category: form.category,
          status: form.status,
          targetDate: form.targetDate,
          notes: form.notes,
        });
        setSaveState({ kind: 'success', message: 'Plan saved.', saving: false });
      }
      resetComposer();
    } catch (writeError) {
      setSaveState({
        kind: 'error',
        message: formatWriteError(writeError),
        saving: false,
      });
    }
  }

  async function handleComplete(plan: (typeof filteredPlans)[number]) {
    try {
      await writer.updatePlan(plan.id, {
        ...plan,
        status: 'completed',
        revision: plan.revision || 0,
      });
      setSaveState({ kind: 'success', message: 'Plan marked complete.', saving: false });
    } catch (writeError) {
      setSaveState({
        kind: 'error',
        message: formatWriteError(writeError),
        saving: false,
      });
    }
  }

  async function handleConvert(plan: (typeof filteredPlans)[number]) {
    try {
      await writer.convertPlanToMemory(plan.id, {
        ...plan,
        revision: plan.revision || 0,
      });
      setSaveState({ kind: 'success', message: 'Plan converted to a memory.', saving: false });
    } catch (writeError) {
      setSaveState({
        kind: 'error',
        message: formatWriteError(writeError),
        saving: false,
      });
    }
  }

  return (
    <CoupleBookScreen
      eyebrow="Plans"
      title="Plans"
      subtitle="Dreaming, upcoming, and completed plans now stay browseable on mobile with the same shared status buckets as the web app.">
      <SectionCard
        title="Plan states"
        description="These buckets come straight from the live couple-scoped plan collection and are filterable instead of static counters only.">
        <View style={styles.pillRow}>
          <BadgePill tone="accent">Ideas: {ideaCount}</BadgePill>
          <BadgePill>Planned: {plannedCount}</BadgePill>
          <BadgePill>Completed: {completedCount}</BadgePill>
        </View>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search ideas, dates, and notes"
        />
        <View style={styles.filterRow}>
          <FilterChip active={activeFilter === 'all'} label="All" onPress={() => setActiveFilter('all')} />
          <FilterChip active={activeFilter === 'idea'} label="Dreaming" onPress={() => setActiveFilter('idea')} />
          <FilterChip active={activeFilter === 'planned'} label="Coming Up" onPress={() => setActiveFilter('planned')} />
          <FilterChip active={activeFilter === 'completed'} label="We Did It" onPress={() => setActiveFilter('completed')} />
        </View>
      </SectionCard>

      <SectionCard
        title="Write plan"
        description="Create, edit, complete, and convert plans from the native tab using the same revision-aware write model as the web app.">
        <View style={styles.stack}>
          <Pressable
            onPress={beginCreate}
            style={[
              styles.primaryButton,
              { backgroundColor: theme.accent, borderColor: theme.accentStrong },
            ]}>
            <ThemedText type="smallBold" style={styles.lightText}>
              Add Plan
            </ThemedText>
          </Pressable>
          {composerOpen ? (
            <View
              style={[
                styles.composerCard,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <TextInput
                value={form.title}
                onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
                placeholder="Plan title"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundSelected, borderColor: theme.border, color: theme.text },
                ]}
              />
              <TextInput
                value={form.targetDate}
                onChangeText={(value) => setForm((current) => ({ ...current, targetDate: value }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundSelected, borderColor: theme.border, color: theme.text },
                ]}
              />
              <TextInput
                value={form.notes}
                onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))}
                placeholder="Notes"
                placeholderTextColor={theme.textMuted}
                multiline
                style={[
                  styles.textArea,
                  { backgroundColor: theme.backgroundSelected, borderColor: theme.border, color: theme.text },
                ]}
              />
              <View style={styles.filterRow}>
                {['Date Idea', 'Restaurant', 'Place to Visit', 'Movie or Show'].map((category) => (
                  <FilterChip
                    key={category}
                    active={form.category === category}
                    label={category}
                    onPress={() => setForm((current) => ({ ...current, category }))}
                  />
                ))}
              </View>
              <View style={styles.filterRow}>
                {[
                  { label: 'Dreaming', value: 'idea' },
                  { label: 'Coming Up', value: 'planned' },
                  { label: 'We Did It', value: 'completed' },
                ].map((statusOption) => (
                  <FilterChip
                    key={statusOption.value}
                    active={form.status === statusOption.value}
                    label={statusOption.label}
                    onPress={() => setForm((current) => ({ ...current, status: statusOption.value }))}
                  />
                ))}
              </View>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={resetComposer}
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                  ]}>
                  <ThemedText type="smallBold">Cancel</ThemedText>
                </Pressable>
                <Pressable
                  disabled={saveState.saving}
                  onPress={() => {
                    void handleSave();
                  }}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.accent, borderColor: theme.accentStrong, opacity: saveState.saving ? 0.7 : 1 },
                  ]}>
                  <ThemedText type="smallBold" style={styles.lightText}>
                    {saveState.saving ? 'Saving...' : form.id ? 'Save Plan' : 'Create Plan'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : null}
          {saveState.message ? (
            <ThemedText type="small" themeColor="textSecondary">
              {saveState.message}
            </ThemedText>
          ) : null}
        </View>
      </SectionCard>

      <SectionCard
        title="Next up"
        description="The most immediate plan stays visible before the longer list so the tab opens with a clear next step.">
        {nextPlan ? (
          <View style={styles.stack}>
            <ThemedText type="smallBold">{nextPlan.title || 'Untitled plan'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {[nextPlan.category, formatDateLabel(nextPlan.targetDate), nextPlan.status]
                .filter(Boolean)
                .join(' • ')}
            </ThemedText>
            {nextPlan.notes ? (
              <ThemedText type="small" themeColor="textSecondary">
                {nextPlan.notes}
              </ThemedText>
            ) : null}
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {loading ? 'Loading shared plans.' : error || 'No shared plans are saved yet.'}
          </ThemedText>
        )}
      </SectionCard>

      <SectionCard
        title="Plan list"
        description="The list keeps category, date, conversion state, and completion visible without mixing plan records into a second mobile-only model.">
        <View style={styles.stack}>
          {filteredPlans.map((plan) => (
            <Pressable
              key={plan.id}
              style={[
                styles.planCard,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <View style={styles.cardHeader}>
                <ThemedText type="smallBold">{plan.title || 'Untitled plan'}</ThemedText>
                {plan.convertedMemoryId ? <BadgePill tone="accent">Memory created</BadgePill> : null}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {[plan.category, formatDateLabel(plan.targetDate), plan.status]
                  .filter(Boolean)
                  .join(' • ')}
              </ThemedText>
              {plan.notes ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {plan.notes}
                </ThemedText>
              ) : null}
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => beginEdit(plan)}
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                  ]}>
                  <ThemedText type="smallBold">Edit</ThemedText>
                </Pressable>
                {plan.status !== 'completed' ? (
                  <Pressable
                    onPress={() => {
                      void handleComplete(plan);
                    }}
                    style={[
                      styles.secondaryButton,
                      { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                    ]}>
                    <ThemedText type="smallBold">Complete</ThemedText>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => {
                    void handleConvert(plan);
                  }}
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                  ]}>
                  <ThemedText type="smallBold">
                    {plan.convertedMemoryId ? 'Converted' : 'Convert'}
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>
          ))}
          {!filteredPlans.length ? (
            <ThemedText type="small" themeColor="textSecondary">
              {loading ? 'Loading shared plans.' : 'No plans match the current filter.'}
            </ThemedText>
          ) : null}
        </View>
      </SectionCard>

      <SectionCard
        title="Shared data state"
        description="This tab still reflects the approved member session and couple ID while keeping sync warnings visible.">
        <InfoRow label="Sync" value={loading ? 'Refreshing' : 'Live'} />
        <InfoRow label="Visible plans" value={String(filteredPlans.length)} />
        <InfoRow label="Warnings" value={warnings.length ? String(warnings.length) : 'None'} />
      </SectionCard>
    </CoupleBookScreen>
  );
}

const styles = StyleSheet.create({
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  stack: {
    gap: Spacing.two,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  composerCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  textArea: {
    minHeight: 112,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  primaryButton: {
    minHeight: 44,
    minWidth: 120,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightText: {
    color: '#fff',
  },
});
