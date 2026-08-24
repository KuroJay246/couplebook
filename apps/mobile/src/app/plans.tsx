import { StyleSheet, View } from 'react-native';

import {
  BadgePill,
  CoupleBookScreen,
  InfoRow,
  SectionCard,
} from '@/components/couplebook-screen';
import { useCoupleData } from '@/hooks/use-couple-data';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export default function PlansScreen() {
  const { loading, plans, warnings } = useCoupleData();
  const ideaCount = plans.filter((entry) => entry.status === 'idea').length;
  const plannedCount = plans.filter((entry) => entry.status === 'planned').length;
  const completedCount = plans.filter((entry) => entry.status === 'completed').length;

  return (
    <CoupleBookScreen
      eyebrow="Plans"
      title="Shared plans"
      subtitle="The mobile Plans tab now reads the same saved status buckets as the web app and keeps completed plans separate from active ideas.">
      <SectionCard
        title="Plan states"
        description="These status buckets come from the live couple-scoped plan collection and should not drift between web and native.">
        <View style={styles.pillRow}>
          <BadgePill tone="accent">Ideas: {ideaCount}</BadgePill>
          <BadgePill>Planned: {plannedCount}</BadgePill>
          <BadgePill>Completed: {completedCount}</BadgePill>
        </View>
      </SectionCard>

      <SectionCard
        title="Native flow"
        description="Create and edit flows are still pending on native, but the live plan feed now reflects real shared data and conversion status.">
        <View style={styles.stack}>
          {plans.slice(0, 8).map((plan) => (
            <View key={plan.id} style={styles.itemRow}>
              <ThemedText type="smallBold">{plan.title || 'Untitled plan'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {[plan.category, plan.targetDate || 'No date', plan.status]
                  .filter(Boolean)
                  .join(' • ')}
              </ThemedText>
              {plan.notes ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {plan.notes}
                </ThemedText>
              ) : null}
              {plan.convertedMemoryId ? <BadgePill tone="accent">Memory created</BadgePill> : null}
            </View>
          ))}
          {!plans.length ? (
            <ThemedText type="small" themeColor="textSecondary">
              {loading ? 'Loading shared plans.' : 'No shared plans are saved yet.'}
            </ThemedText>
          ) : null}
        </View>
      </SectionCard>

      <SectionCard
        title="Shared data path"
        description="This tab now uses the approved member session and couple ID. The remaining work is write flows, filtering, and memory conversion UI.">
        <InfoRow label="Sync" value={loading ? 'Refreshing' : 'Live'} />
        <InfoRow label="Warnings" value={warnings.length ? String(warnings.length) : 'None'} />
        <InfoRow label="Next wiring" value="Create, edit, complete, and convert actions" />
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
  stack: {
    gap: Spacing.two,
  },
  itemRow: {
    gap: Spacing.one,
  },
});
