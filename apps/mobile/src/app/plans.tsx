import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<PlanFilter>('all');

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
});
