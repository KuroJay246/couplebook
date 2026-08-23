import { StyleSheet, View } from 'react-native';

import {
  BadgePill,
  CoupleBookScreen,
  InfoRow,
  SectionCard,
} from '@/components/couplebook-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const planColumns = [
  { title: 'Dreaming', detail: 'Saved ideas and future places' },
  { title: 'Coming Up', detail: 'Scheduled plans with dates and reminders' },
  { title: 'We Did It', detail: 'Completed plans ready for memory conversion' },
];

export default function PlansScreen() {
  return (
    <CoupleBookScreen
      eyebrow="Plans"
      title="Shared plans"
      subtitle="The mobile plans flow needs the same statuses and conversion rules as the web app, but with native sheets and quick edits.">
      <SectionCard
        title="Plan states"
        description="These status buckets are part of the shared system and should not drift between the website and mobile app.">
        <View style={styles.pillRow}>
          <BadgePill tone="accent">Dreaming</BadgePill>
          <BadgePill>Coming Up</BadgePill>
          <BadgePill>We Did It</BadgePill>
        </View>
      </SectionCard>

      <SectionCard
        title="Native flow"
        description="Create, edit, complete, and convert to a memory without allowing duplicate conversions.">
        <View style={styles.stack}>
          {planColumns.map((column) => (
            <View key={column.title} style={styles.itemRow}>
              <ThemedText type="smallBold">{column.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {column.detail}
              </ThemedText>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Shared data path"
        description="The remaining work here is repository integration, auth gating, and the conversion link into Story and Album.">
        <InfoRow label="Search" value="Title and note filtering" />
        <InfoRow label="Detail view" value="Modal or pushed route" />
        <InfoRow label="Memory conversion" value="Guard against duplicate records" />
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
