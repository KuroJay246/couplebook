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

export default function AlbumScreen() {
  const { loading, memories, warnings } = useCoupleData();
  const visualMemories = memories.filter((entry) => entry.status === 'active' && entry.mediaState !== 'none');
  const photos = visualMemories.filter((entry) => !entry.isVideo);
  const videos = visualMemories.filter((entry) => entry.isVideo);
  const latestVisuals = visualMemories.slice(0, 6);

  return (
    <CoupleBookScreen
      eyebrow="Album"
      title="Photo Book and Live Album"
      subtitle="The native Album now reads real shared memory metadata and separates text-only entries from visual memories.">
      <SectionCard
        title="Primary views"
        description="The same memory metadata now feeds both platforms while native keeps a simpler first pass layout.">
        <View style={styles.pillRow}>
          <BadgePill tone="accent">Photo Book: {photos.length}</BadgePill>
          <BadgePill>Videos: {videos.length}</BadgePill>
          <BadgePill>All active: {memories.filter((entry) => entry.status === 'active').length}</BadgePill>
        </View>
        <InfoRow label="Preview source" value="Shared Firestore media metadata" />
        <InfoRow label="Drive fallback" value="Not connected in native yet" />
      </SectionCard>

      <SectionCard
        title="Media presentation"
        description="The current native Album keeps titles, dates, and media type explicit without exposing private file locations or Drive IDs.">
        <View style={styles.stack}>
          {latestVisuals.map((entry) => (
            <View key={entry.id} style={styles.highlightRow}>
              <ThemedText type="smallBold">{entry.title || 'Untitled memory'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {[entry.date || 'Undated', entry.isVideo ? 'Video' : 'Photo', entry.mediaState]
                  .filter(Boolean)
                  .join(' • ')}
              </ThemedText>
            </View>
          ))}
          {!latestVisuals.length ? (
            <ThemedText type="small" themeColor="textSecondary">
              {loading ? 'Loading visual memory metadata.' : 'No approved photo or video memories are available yet.'}
            </ThemedText>
          ) : null}
        </View>
      </SectionCard>

      <SectionCard
        title="Upload workflow"
        description="Upload, retry, duplicate detection, and Google Drive handoff are still separate work items. This tab now honestly reports the current state from live metadata.">
        <InfoRow label="Sync" value={loading ? 'Refreshing' : 'Live metadata ready'} />
        <InfoRow label="Warnings" value={warnings.length ? String(warnings.length) : 'None'} />
        <InfoRow label="Next wiring" value="Picker, viewer, and Drive connection flow" />
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
  highlightRow: {
    gap: Spacing.one,
  },
});
