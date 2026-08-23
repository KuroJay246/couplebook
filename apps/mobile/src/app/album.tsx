import { StyleSheet, View } from 'react-native';

import {
  BadgePill,
  CoupleBookScreen,
  InfoRow,
  SectionCard,
} from '@/components/couplebook-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const albumHighlights = [
  'Photo Book with larger editorial imagery',
  'All Memories grid with denser scan mode',
  'Live Album fallback when Drive is unavailable',
];

export default function AlbumScreen() {
  return (
    <CoupleBookScreen
      eyebrow="Album"
      title="Photo Book and Live Album"
      subtitle="The native Album is being built as a media-first surface, not an upload queue dashboard.">
      <SectionCard
        title="Primary views"
        description="The same metadata model must drive both platforms while each surface keeps its own layout rules.">
        <View style={styles.pillRow}>
          <BadgePill tone="accent">Photo Book</BadgePill>
          <BadgePill>All Memories</BadgePill>
          <BadgePill>Live Album</BadgePill>
        </View>
        <InfoRow label="Preview source" value="Google Drive authenticated previews" />
        <InfoRow label="Fallback" value="Selected cover, counts, and open-folder action" />
      </SectionCard>

      <SectionCard
        title="Media presentation"
        description="Images, videos, captions, and linked Story entries need native full-screen playback without exposing private locations.">
        <View style={styles.stack}>
          {albumHighlights.map((line) => (
            <View key={line} style={styles.highlightRow}>
              <ThemedText type="smallBold">{line}</ThemedText>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Upload workflow"
        description="Selection, duplicate checks, retry, and final metadata write still need to be wired after the screen shell.">
        <InfoRow label="Picker" value="Expo Image Picker" />
        <InfoRow label="Drive upload" value="Separate auth from Firebase session" />
        <InfoRow label="Queue surface" value="Visible only during active or failed work" />
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
