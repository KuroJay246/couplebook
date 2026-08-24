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

type StoryFilter = 'all' | 'text' | 'photo' | 'video';

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

function matchesFilter(
  entry: ReturnType<typeof useCoupleData>['memories'][number],
  activeFilter: StoryFilter,
) {
  if (activeFilter === 'text') return entry.mediaState === 'none';
  if (activeFilter === 'photo') return entry.mediaState !== 'none' && !entry.isVideo;
  if (activeFilter === 'video') return entry.isVideo;
  return true;
}

export default function StoryScreen() {
  const { error, loading, memories, warnings } = useCoupleData();
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<StoryFilter>('all');
  const [showArchived, setShowArchived] = useState(false);

  const filteredMemories = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return memories
      .filter((entry) => (showArchived ? true : entry.status === 'active'))
      .filter((entry) => matchesFilter(entry, activeFilter))
      .filter((entry) => {
        if (!searchTerm) return true;
        return [entry.title, entry.description, entry.date, ...(entry.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm);
      })
      .sort((left, right) => right.date.localeCompare(left.date));
  }, [activeFilter, memories, search, showArchived]);

  const groupedMemories = useMemo(() => {
    return filteredMemories.reduce<Record<string, typeof filteredMemories>>((groups, entry) => {
      const key = formatMonthHeading(entry.date);
      groups[key] ||= [];
      groups[key].push(entry);
      return groups;
    }, {});
  }, [filteredMemories]);

  const activeMemories = memories.filter((entry) => entry.status === 'active');
  const archivedMemories = memories.filter((entry) => entry.status === 'archived');

  return (
    <CoupleBookScreen
      eyebrow="Story"
      title="Story"
      subtitle="Search, filter, and reopen the same couple-scoped memory feed the web app uses, grouped into readable monthly chapters.">
      <SectionCard
        title="Timeline controls"
        description="Story keeps the counts close and lets you narrow the feed without losing the real shared data underneath it.">
        <View style={styles.pillRow}>
          <BadgePill tone="accent">Active: {activeMemories.length}</BadgePill>
          <BadgePill>Archived: {archivedMemories.length}</BadgePill>
          <BadgePill>Photos: {activeMemories.filter((entry) => entry.mediaState !== 'none' && !entry.isVideo).length}</BadgePill>
          <BadgePill>Videos: {activeMemories.filter((entry) => entry.isVideo).length}</BadgePill>
        </View>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search titles, dates, and tags"
        />
        <View style={styles.filterRow}>
          <FilterChip active={activeFilter === 'all'} label="All" onPress={() => setActiveFilter('all')} />
          <FilterChip active={activeFilter === 'text'} label="Text" onPress={() => setActiveFilter('text')} />
          <FilterChip active={activeFilter === 'photo'} label="Photos" onPress={() => setActiveFilter('photo')} />
          <FilterChip active={activeFilter === 'video'} label="Videos" onPress={() => setActiveFilter('video')} />
          <FilterChip active={showArchived} label="Archived" onPress={() => setShowArchived((value) => !value)} />
        </View>
      </SectionCard>

      <SectionCard
        title="Memory feed"
        description="Entries stay grouped by month, with the type, date, and archived state visible at a glance.">
        <View style={styles.stack}>
          {Object.entries(groupedMemories).map(([heading, entries]) => (
            <View key={heading} style={styles.groupBlock}>
              <ThemedText type="smallBold">{heading}</ThemedText>
              <View style={styles.stack}>
                {entries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    style={[
                      styles.memoryCard,
                      { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                    ]}>
                    <View style={styles.cardHeader}>
                      <ThemedText type="smallBold">{entry.title || 'Untitled memory'}</ThemedText>
                      {entry.status === 'archived' ? <BadgePill>Archived</BadgePill> : null}
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {[formatDateLabel(entry.date), entry.isVideo ? 'Video' : entry.mediaState === 'none' ? 'Text' : 'Photo']
                        .filter(Boolean)
                        .join(' • ')}
                    </ThemedText>
                    {entry.description ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {entry.description}
                      </ThemedText>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          {!filteredMemories.length ? (
            <ThemedText type="small" themeColor="textSecondary">
              {loading ? 'Loading the shared Story feed.' : error || 'No memories match the current Story filters.'}
            </ThemedText>
          ) : null}
        </View>
      </SectionCard>

      <SectionCard
        title="Sync state"
        description="This native Story view stays connected to the same couple-scoped listener and preserves the warning surface when data needs attention.">
        <InfoRow label="Feed state" value={loading ? 'Refreshing' : 'Live'} />
        <InfoRow label="Visible entries" value={String(filteredMemories.length)} />
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
  groupBlock: {
    gap: Spacing.two,
  },
  memoryCard: {
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
