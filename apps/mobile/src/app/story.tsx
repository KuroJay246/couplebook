import { StyleSheet, View } from 'react-native';

import {
  BadgePill,
  CoupleBookScreen,
  InfoRow,
  SectionCard,
} from '@/components/couplebook-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const storyRows = [
  { title: 'Written memory', detail: 'Text-first entry with caption, tags, and linked date' },
  { title: 'Photo memory', detail: 'Cover image, date, Story link, and Album relationship' },
  { title: 'Video memory', detail: 'Poster frame, duration, playback, and archive status' },
];

export default function StoryScreen() {
  return (
    <CoupleBookScreen
      eyebrow="Story"
      title="Chronological Story"
      subtitle="Native Story is being shaped around search, filters, archive controls, and efficient scrolling without reusing the desktop layout.">
      <SectionCard
        title="Timeline controls"
        description="The shared contracts are already in place for dates, special moments, and theme IDs.">
        <View style={styles.pillRow}>
          <BadgePill tone="accent">Search</BadgePill>
          <BadgePill>Year groups</BadgePill>
          <BadgePill>Photo and video filters</BadgePill>
          <BadgePill>Archive and restore</BadgePill>
        </View>
        <InfoRow label="List strategy" value="SectionList or FlatList" />
        <InfoRow label="State source" value="Shared memory repositories pending" />
      </SectionCard>

      <SectionCard
        title="Memory presentation"
        description="The native feed must support written entries, photos, videos, and milestone moments without exposing file paths or Drive IDs.">
        <View style={styles.stack}>
          {storyRows.map((row) => (
            <View key={row.title} style={styles.itemRow}>
              <ThemedText type="smallBold">{row.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {row.detail}
              </ThemedText>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Next wiring"
        description="The next implementation step after the mobile shell is the repository layer: auth gate, approved membership, Firestore reads, and linked Album media.">
        <InfoRow label="Search behavior" value="Client input with shared validation" />
        <InfoRow label="Edit flow" value="Memory detail modal route" />
        <InfoRow label="Reload" value="Pull to refresh and stale-state notice" />
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
