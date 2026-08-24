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

type AlbumFilter = 'all' | 'photo' | 'video';

function formatDateLabel(value: string, fallback = 'Undated') {
  const date = createDateAtNoon(value);
  if (!date) return fallback;

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMonthHeading(value: string) {
  const date = createDateAtNoon(value);
  if (!date) return 'Undated';

  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export default function AlbumScreen() {
  const { error, loading, memories, warnings } = useCoupleData();
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<AlbumFilter>('all');

  const visualMemories = useMemo(
    () =>
      memories
        .filter((entry) => entry.status === 'active' && entry.mediaState !== 'none')
        .sort((left, right) => right.date.localeCompare(left.date)),
    [memories],
  );
  const photos = visualMemories.filter((entry) => !entry.isVideo);
  const videos = visualMemories.filter((entry) => entry.isVideo);

  const filteredMemories = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return visualMemories.filter((entry) => {
      if (activeFilter === 'photo' && entry.isVideo) return false;
      if (activeFilter === 'video' && !entry.isVideo) return false;
      if (!searchTerm) return true;

      return [entry.title, entry.description, entry.date, ...(entry.tags || [])]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm);
    });
  }, [activeFilter, search, visualMemories]);

  const groupedMemories = useMemo(() => {
    return filteredMemories.reduce<Record<string, typeof filteredMemories>>((groups, entry) => {
      const key = formatMonthHeading(entry.date);
      groups[key] ||= [];
      groups[key].push(entry);
      return groups;
    }, {});
  }, [filteredMemories]);

  return (
    <CoupleBookScreen
      eyebrow="Album"
      title="Album"
      subtitle="Photo and video memories stay first here, with quick filtering and a cleaner pass through the same shared metadata the website reads.">
      <SectionCard
        title="Album views"
        description="The mobile Album separates visual memory counts up front, then lets you narrow to photos or videos without exposing private paths.">
        <View style={styles.pillRow}>
          <BadgePill tone="accent">Photo Book: {photos.length}</BadgePill>
          <BadgePill>Videos: {videos.length}</BadgePill>
          <BadgePill>All visuals: {visualMemories.length}</BadgePill>
        </View>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search titles, captions, and tags"
        />
        <View style={styles.filterRow}>
          <FilterChip active={activeFilter === 'all'} label="All" onPress={() => setActiveFilter('all')} />
          <FilterChip active={activeFilter === 'photo'} label="Photos" onPress={() => setActiveFilter('photo')} />
          <FilterChip active={activeFilter === 'video'} label="Videos" onPress={() => setActiveFilter('video')} />
        </View>
      </SectionCard>

      <SectionCard
        title="Photo Book"
        description="The latest visual memories stay larger and quieter here before the denser all-media run below.">
        <View style={styles.stack}>
          {filteredMemories.slice(0, 4).map((entry) => (
            <View
              key={entry.id}
              style={[
                styles.featureCard,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <ThemedText type="smallBold">{entry.title || 'Untitled memory'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {entry.description || 'Open the full chapter on web or Story for the complete memory text.'}
              </ThemedText>
              <InfoRow label="Saved date" value={formatDateLabel(entry.date)} />
              <InfoRow label="Type" value={entry.isVideo ? 'Video chapter' : 'Photo memory'} />
            </View>
          ))}
          {!filteredMemories.length ? (
            <ThemedText type="small" themeColor="textSecondary">
              {loading ? 'Loading visual memory metadata.' : error || 'No visual memories match the current Album filters.'}
            </ThemedText>
          ) : null}
        </View>
      </SectionCard>

      <SectionCard
        title="All memories"
        description="Every visual entry remains grouped by month so fast scanning still feels chronological on mobile.">
        <View style={styles.stack}>
          {Object.entries(groupedMemories).map(([heading, entries]) => (
            <View key={heading} style={styles.groupBlock}>
              <ThemedText type="smallBold">{heading}</ThemedText>
              <View style={styles.stack}>
                {entries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    style={[
                      styles.gridCard,
                      { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                    ]}>
                    <ThemedText type="smallBold">{entry.title || 'Untitled memory'}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {[formatDateLabel(entry.date), entry.isVideo ? 'Video' : 'Photo'].join(' • ')}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Live Album status"
        description="Drive-linked media remains private and external. The mobile Album keeps the rest of Couple Book usable even when only metadata is available.">
        <InfoRow label="Media state" value={loading ? 'Refreshing' : 'Metadata ready'} />
        <InfoRow label="Visible items" value={String(filteredMemories.length)} />
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
  featureCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  groupBlock: {
    gap: Spacing.two,
  },
  gridCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
});
