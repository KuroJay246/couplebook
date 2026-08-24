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

export default function StoryScreen() {
  const { loading, memories, warnings } = useCoupleData();
  const activeMemories = memories.filter((entry) => entry.status === 'active');
  const archivedMemories = memories.filter((entry) => entry.status === 'archived');

  return (
    <CoupleBookScreen
      eyebrow="Story"
      title="Chronological Story"
      subtitle="Native Story now reads the same couple-scoped memory collection as the website and keeps archived entries out of the active feed.">
      <SectionCard
        title="Timeline controls"
        description="The live mobile read model is still compact, but it now uses real Firestore memory records instead of shell copy.">
        <View style={styles.pillRow}>
          <BadgePill tone="accent">Active: {activeMemories.length}</BadgePill>
          <BadgePill>Archived: {archivedMemories.length}</BadgePill>
          <BadgePill>Photos: {activeMemories.filter((entry) => entry.mediaState !== 'none' && !entry.isVideo).length}</BadgePill>
          <BadgePill>Videos: {activeMemories.filter((entry) => entry.isVideo).length}</BadgePill>
        </View>
        <InfoRow label="List strategy" value="Client-side date ordering from the live listener" />
        <InfoRow label="Special moments" value={String(activeMemories.filter((entry) => Boolean(entry.specialMomentType)).length)} />
      </SectionCard>

      <SectionCard
        title="Memory presentation"
        description="Written entries, photos, videos, and special routes are all normalized before they reach the native tab.">
        <View style={styles.stack}>
          {activeMemories.slice(0, 8).map((entry) => (
            <View key={entry.id} style={styles.itemRow}>
              <ThemedText type="smallBold">{entry.title || 'Untitled memory'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {[entry.date || 'Undated', entry.isVideo ? 'Video' : entry.mediaState === 'none' ? 'Text' : 'Photo']
                  .filter(Boolean)
                  .join(' • ')}
              </ThemedText>
              {entry.description ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {entry.description}
                </ThemedText>
              ) : null}
            </View>
          ))}
          {!activeMemories.length ? (
            <ThemedText type="small" themeColor="textSecondary">
              {loading ? 'Loading the shared Story feed.' : 'No active memories are available for Story yet.'}
            </ThemedText>
          ) : null}
        </View>
      </SectionCard>

      <SectionCard
        title="Sync state"
        description="The mobile Story tab is now fed by couple-scoped Firestore reads and stays aligned with the same access model as the website.">
        <InfoRow label="Loading" value={loading ? 'Refreshing' : 'Live'} />
        <InfoRow label="Warnings" value={warnings.length ? String(warnings.length) : 'None'} />
        <InfoRow label="Next wiring" value="Search, detail routes, and native media preview" />
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
