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
  const writer = useOwnerWrite();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<StoryFilter>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [saveState, setSaveState] = useState({ kind: '', message: '', saving: false });
  const [form, setForm] = useState({
    id: '',
    title: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    revision: 0,
  });

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

  function resetComposer() {
    setForm({
      id: '',
      title: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
      revision: 0,
    });
    setComposerOpen(false);
  }

  function beginCreate() {
    setSaveState({ kind: '', message: '', saving: false });
    setComposerOpen(true);
    setForm({
      id: '',
      title: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
      revision: 0,
    });
  }

  function beginEdit(entry: (typeof filteredMemories)[number]) {
    setSaveState({ kind: '', message: '', saving: false });
    setComposerOpen(true);
    setForm({
      id: entry.id,
      title: entry.title || '',
      description: entry.description || '',
      date: entry.date || new Date().toISOString().slice(0, 10),
      revision: entry.revision || 0,
    });
  }

  function formatWriteError(error: unknown) {
    const message = error instanceof Error ? error.message : 'This memory could not be saved.';
    if (/disabled outside approved mobile Firestore write mode/i.test(message)) {
      return 'Memory writes are disabled in this build. Use the approved emulator write mode for development writes.';
    }
    if (/changed in another session/i.test(message)) {
      return 'This memory changed somewhere else. Reload the latest version and try again.';
    }
    if (/membership|approved user/i.test(message)) {
      return 'This account cannot write to Couple Book right now.';
    }
    return message;
  }

  async function handleSave() {
    setSaveState({ kind: '', message: '', saving: true });

    try {
      if (form.id) {
        await writer.updateMemory(form.id, {
          title: form.title,
          description: form.description,
          date: form.date,
          mediaType: 'text',
          revision: form.revision,
        });
        setSaveState({ kind: 'success', message: 'Memory updated.', saving: false });
      } else {
        await writer.createMemory({
          title: form.title,
          description: form.description,
          date: form.date,
          mediaType: 'text',
          kindLabel: 'Note',
        });
        setSaveState({ kind: 'success', message: 'Memory saved.', saving: false });
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

  async function handleArchive(entry: (typeof filteredMemories)[number]) {
    try {
      await writer.archiveMemory(entry.id, entry.revision || 0);
      setSaveState({ kind: 'success', message: 'Memory archived.', saving: false });
    } catch (writeError) {
      setSaveState({
        kind: 'error',
        message: formatWriteError(writeError),
        saving: false,
      });
    }
  }

  async function handleRestore(entry: (typeof filteredMemories)[number]) {
    try {
      await writer.restoreMemory(entry.id, entry.revision || 0);
      setSaveState({ kind: 'success', message: 'Memory restored.', saving: false });
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
        title="Write memory"
        description="Create a text memory, reopen it for edits, or archive and restore existing entries from the native Story tab.">
        <View style={styles.stack}>
          <Pressable
            onPress={beginCreate}
            style={[
              styles.primaryButton,
              { backgroundColor: theme.accent, borderColor: theme.accentStrong },
            ]}>
            <ThemedText type="smallBold" style={styles.lightText}>
              Add Memory
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
                placeholder="Memory title"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundSelected, borderColor: theme.border, color: theme.text },
                ]}
              />
              <TextInput
                value={form.description}
                onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
                placeholder="What happened?"
                placeholderTextColor={theme.textMuted}
                multiline
                style={[
                  styles.textArea,
                  { backgroundColor: theme.backgroundSelected, borderColor: theme.border, color: theme.text },
                ]}
              />
              <TextInput
                value={form.date}
                onChangeText={(value) => setForm((current) => ({ ...current, date: value }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundSelected, borderColor: theme.border, color: theme.text },
                ]}
              />
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
                    {saveState.saving ? 'Saving...' : form.id ? 'Save Memory' : 'Create Memory'}
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
                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => beginEdit(entry)}
                        style={[
                          styles.secondaryButton,
                          { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                        ]}>
                        <ThemedText type="smallBold">Edit</ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          void (entry.status === 'archived' ? handleRestore(entry) : handleArchive(entry));
                        }}
                        style={[
                          styles.secondaryButton,
                          { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                        ]}>
                        <ThemedText type="smallBold">
                          {entry.status === 'archived' ? 'Restore' : 'Archive'}
                        </ThemedText>
                      </Pressable>
                    </View>
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
