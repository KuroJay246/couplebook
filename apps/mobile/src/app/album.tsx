import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import {
  ActionButton,
  BadgePill,
  CoupleBookScreen,
  FilterChip,
  InfoRow,
  SearchInput,
  SectionCard,
} from '@/components/couplebook-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCoupleData } from '@/hooks/use-couple-data';
import { useMobileMediaQueue } from '@/hooks/use-mobile-media-queue';
import { useTheme } from '@/hooks/use-theme';
import { MOBILE_QUEUE_STATUS, formatBytes } from '@/services/mobile-media-core.mjs';
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

function queueStatusLabel(status: string) {
  switch (status) {
    case MOBILE_QUEUE_STATUS.complete:
      return 'Saved';
    case MOBILE_QUEUE_STATUS.failed:
      return 'Failed';
    case MOBILE_QUEUE_STATUS.cancelled:
      return 'Cancelled';
    case MOBILE_QUEUE_STATUS.duplicate:
      return 'Duplicate';
    case MOBILE_QUEUE_STATUS.uploading:
      return 'Uploading';
    case MOBILE_QUEUE_STATUS.finalizing:
      return 'Finalizing';
    case MOBILE_QUEUE_STATUS.hashing:
      return 'Hashing';
    case MOBILE_QUEUE_STATUS.validating:
      return 'Validating';
    default:
      return 'Ready';
  }
}

function QueueItemCard({
  item,
  onCancel,
  onOpen,
  onRemove,
  onRetry,
  onUpdate,
}: {
  item: ReturnType<typeof useMobileMediaQueue>['items'][number];
  onCancel: (itemId: string) => void;
  onOpen: (item: { id: string; localUri?: string }) => void;
  onRemove: (itemId: string) => void;
  onRetry: (itemId: string) => void;
  onUpdate: (itemId: string, patch: { caption?: string; title?: string; date?: string }) => void;
}) {
  const theme = useTheme();
  const editable =
    item.status === MOBILE_QUEUE_STATUS.selected ||
    item.status === MOBILE_QUEUE_STATUS.failed ||
    item.status === MOBILE_QUEUE_STATUS.cancelled;

  return (
    <View
      style={[
        styles.queueCard,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <Pressable onPress={() => onOpen({ id: item.id, localUri: item.localUri })} style={styles.queuePreview}>
        <Image
          source={{ uri: item.previewUri || item.localUri }}
          style={styles.queuePreviewImage}
          contentFit={item.mediaType === 'video' ? 'contain' : 'cover'}
        />
      </Pressable>
      <View style={styles.queueMeta}>
        <View style={styles.queueTitleRow}>
          <ThemedText type="smallBold">{item.title}</ThemedText>
          <BadgePill tone={item.status === MOBILE_QUEUE_STATUS.complete ? 'accent' : 'default'}>
            {queueStatusLabel(item.status)}
          </BadgePill>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {[item.mediaType === 'video' ? 'Video' : 'Photo', formatBytes(item.sizeBytes), formatDateLabel(item.date)].join(' • ')}
        </ThemedText>
        <TextInput
          value={item.title}
          editable={editable}
          onChangeText={(title) => onUpdate(item.id, { title })}
          placeholder="Memory title"
          placeholderTextColor={theme.textMuted}
          style={[
            styles.queueInput,
            {
              backgroundColor: theme.backgroundSelected,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
        />
        <TextInput
          value={item.caption}
          editable={editable}
          multiline
          onChangeText={(caption) => onUpdate(item.id, { caption })}
          placeholder="Caption"
          placeholderTextColor={theme.textMuted}
          style={[
            styles.queueTextArea,
            {
              backgroundColor: theme.backgroundSelected,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
        />
        <TextInput
          value={item.date}
          editable={editable}
          onChangeText={(date) => onUpdate(item.id, { date })}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.textMuted}
          style={[
            styles.queueInput,
            {
              backgroundColor: theme.backgroundSelected,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
        />
        {item.errorMessage ? (
          <ThemedText type="small" style={{ color: theme.warning }}>
            {item.errorMessage}
          </ThemedText>
        ) : null}
        <InfoRow label="Progress" value={`${item.progress}%`} />
        <View style={styles.queueActionRow}>
          {editable && item.status === MOBILE_QUEUE_STATUS.failed ? (
            <ActionButton label="Retry" onPress={() => onRetry(item.id)} />
          ) : null}
          {editable ? <ActionButton label="Remove" onPress={() => onRemove(item.id)} /> : null}
          {!editable ? <ActionButton label="Cancel" onPress={() => onCancel(item.id)} /> : null}
        </View>
      </View>
    </View>
  );
}

function AlbumViewerModal({
  item,
  loading,
  error,
  sourceUri,
  onClose,
}: {
  item: { id: string; title: string; caption?: string; date?: string; isVideo: boolean } | null;
  loading: boolean;
  error: string;
  sourceUri: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const player = useVideoPlayer(
    item?.isVideo && sourceUri ? { uri: sourceUri } : null,
    (videoPlayer) => {
      videoPlayer.loop = false;
      videoPlayer.muted = false;
    },
  );

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      transparent={false}
      visible={Boolean(item)}>
      <View style={[styles.viewerRoot, { backgroundColor: theme.background }]}>
        <View style={styles.viewerHeader}>
          <View style={styles.viewerHeaderText}>
            <ThemedText type="smallBold">{item?.title || 'Album viewer'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item ? formatDateLabel(item.date || '') : 'Private preview'}
            </ThemedText>
          </View>
          <ActionButton label="Close" onPress={onClose} />
        </View>
        <View style={[styles.viewerSurface, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
          {loading ? (
            <ActivityIndicator color={theme.accent} />
          ) : error ? (
            <ThemedText type="small" style={{ color: theme.warning }}>
              {error}
            </ThemedText>
          ) : item?.isVideo ? (
            <VideoView
              player={player}
              nativeControls
              contentFit="contain"
              style={styles.viewerMedia}
            />
          ) : (
            <Image source={{ uri: sourceUri }} style={styles.viewerMedia} contentFit="contain" />
          )}
        </View>
        {item?.caption ? (
          <ThemedText type="small" themeColor="textSecondary">
            {item.caption}
          </ThemedText>
        ) : null}
      </View>
    </Modal>
  );
}

export default function AlbumScreen() {
  const { error, loading, memories, warnings } = useCoupleData();
  const theme = useTheme();
  const uploadQueue = useMobileMediaQueue();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<AlbumFilter>('all');
  const [removingId, setRemovingId] = useState('');

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

      return [entry.title, entry.description, entry.caption, entry.date, ...(entry.tags || [])]
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

  const viewerMemory =
    visualMemories.find((entry) => entry.id === uploadQueue.viewerItemId) ||
    uploadQueue.items.find((entry) => entry.id === uploadQueue.viewerItemId) ||
    null;
  const viewerDescriptor = viewerMemory
    ? {
        id: viewerMemory.id,
        title: viewerMemory.title || 'Album viewer',
        caption:
          'description' in viewerMemory
            ? viewerMemory.caption || viewerMemory.description
            : viewerMemory.caption || '',
        date: viewerMemory.date,
        isVideo: 'isVideo' in viewerMemory ? viewerMemory.isVideo : viewerMemory.mediaType === 'video',
      }
    : null;

  async function handleRemoveSavedItem(memoryId: string) {
    const memory = visualMemories.find((entry) => entry.id === memoryId);
    if (!memory || typeof memory.media !== 'object' || memory.media.status !== 'storage-verified') {
      return;
    }
    setRemovingId(memoryId);
    try {
      await uploadQueue.removeSavedItem({
        id: memory.id,
        media: {
          status: 'storage-verified',
          storagePath: memory.media.storagePath,
          thumbnailPath: memory.media.thumbnailPath,
          posterPath: memory.media.posterPath,
        },
        revision: memory.revision,
        title: memory.title,
      });
    } finally {
      setRemovingId('');
    }
  }

  return (
    <>
      <CoupleBookScreen
        eyebrow="Album"
        title="Album"
        subtitle="The mobile Album now owns picking, queueing, saving, and viewing private media against the same Couple Book metadata model used elsewhere.">
        <SectionCard
          title="Album controls"
          description="Pick private photos or videos only when you ask to add them, then queue, validate, upload, and save them as Couple Book memories.">
          <View style={styles.pillRow}>
            <BadgePill tone="accent">Photo Book: {photos.length}</BadgePill>
            <BadgePill>Videos: {videos.length}</BadgePill>
            <BadgePill>Queue ready: {uploadQueue.summary.ready}</BadgePill>
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
          <View style={styles.buttonRow}>
            <ActionButton
              label="Add Photos"
              detail="Opens the device picker only when you choose it."
              onPress={uploadQueue.pickAssets}
            />
            <ActionButton
              label="Start Uploads"
              detail="Validates, uploads, then writes Couple Book metadata."
              disabled={!uploadQueue.canUpload || uploadQueue.summary.ready === 0}
              onPress={uploadQueue.startUploads}
            />
            <ActionButton
              label="Clear Finished"
              detail="Removes completed and cancelled queue cards from this device."
              disabled={uploadQueue.summary.complete + uploadQueue.summary.cancelled === 0}
              onPress={uploadQueue.clearFinished}
            />
          </View>
          {uploadQueue.notice.message ? (
            <ThemedText
              type="small"
              style={{
                color:
                  uploadQueue.notice.kind === 'error'
                    ? theme.warning
                    : uploadQueue.notice.kind === 'success'
                      ? theme.success
                      : theme.textSecondary,
              }}>
              {uploadQueue.notice.message}
            </ThemedText>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Upload queue"
          description="Queue entries persist locally so an in-progress media pass can survive a restart without exposing the original bytes in Firestore.">
          <InfoRow label="Queued" value={String(uploadQueue.summary.ready)} />
          <InfoRow label="Active" value={String(uploadQueue.summary.active)} />
          <InfoRow label="Saved" value={String(uploadQueue.summary.complete)} />
          <InfoRow label="Failed" value={String(uploadQueue.summary.failed)} />
          <View style={styles.stack}>
            {uploadQueue.items.length ? (
              uploadQueue.items.map((item) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  onCancel={uploadQueue.cancelItem}
                  onOpen={uploadQueue.openViewer}
                  onRemove={uploadQueue.removeItem}
                  onRetry={uploadQueue.retryItem}
                  onUpdate={uploadQueue.updateDraft}
                />
              ))
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Add photos or videos to start a mobile Album queue on this device.
              </ThemedText>
            )}
          </View>
        </SectionCard>

        <SectionCard
          title="Photo Book"
          description="The latest saved visual memories stay larger here, with quick viewer access and safe removal for verified private media.">
          <View style={styles.stack}>
            {filteredMemories.slice(0, 6).map((entry) => (
              <View
                key={entry.id}
                style={[
                  styles.featureCard,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}>
                <Pressable onPress={() => uploadQueue.openViewer(entry)} style={styles.featurePreview}>
                  <View style={[styles.featurePreviewFallback, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="smallBold">
                      {entry.isVideo ? 'Private video ready' : 'Private photo ready'}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Open viewer
                    </ThemedText>
                  </View>
                </Pressable>
                <ThemedText type="smallBold">{entry.title || 'Untitled memory'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {entry.caption || entry.description || 'Saved private media metadata is available for this memory.'}
                </ThemedText>
                <InfoRow label="Saved date" value={formatDateLabel(entry.date)} />
                <InfoRow label="Type" value={entry.isVideo ? 'Video chapter' : 'Photo memory'} />
                <View style={styles.queueActionRow}>
                  <ActionButton label="Open Viewer" onPress={() => uploadQueue.openViewer(entry)} />
                  {typeof entry.media === 'object' && entry.media.status === 'storage-verified' ? (
                    <ActionButton
                      label={removingId === entry.id ? 'Removing' : 'Remove Media'}
                      disabled={removingId === entry.id}
                      onPress={() => handleRemoveSavedItem(entry.id)}
                    />
                  ) : null}
                </View>
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
          description="Every visual entry remains grouped by month for scanning, but each card can now open the viewer or expose verified-media state.">
          <View style={styles.stack}>
            {Object.entries(groupedMemories).map(([heading, entries]) => (
              <View key={heading} style={styles.groupBlock}>
                <ThemedText type="smallBold">{heading}</ThemedText>
                <View style={styles.stack}>
                  {entries.map((entry) => (
                    <Pressable
                      key={entry.id}
                      onPress={() => uploadQueue.openViewer(entry)}
                      style={[
                        styles.gridCard,
                        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                      ]}>
                      <ThemedText type="smallBold">{entry.title || 'Untitled memory'}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {[formatDateLabel(entry.date), entry.isVideo ? 'Video' : 'Photo'].join(' • ')}
                      </ThemedText>
                      {entry.caption ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {entry.caption}
                        </ThemedText>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard
          title="Live Album status"
          description="The mobile Album now handles local queueing and private verified-media metadata while the broader Drive-backed Live Album work remains separate.">
          <InfoRow label="Media state" value={loading ? 'Refreshing' : 'Metadata ready'} />
          <InfoRow label="Visible items" value={String(filteredMemories.length)} />
          <InfoRow label="Warnings" value={warnings.length ? String(warnings.length) : 'None'} />
          <InfoRow label="Queue persisted" value={uploadQueue.items.length ? 'Yes' : 'Idle'} />
        </SectionCard>
      </CoupleBookScreen>

      <AlbumViewerModal
        item={viewerDescriptor}
        error={uploadQueue.viewerError}
        loading={uploadQueue.viewerLoading}
        onClose={uploadQueue.closeViewer}
        sourceUri={uploadQueue.viewerSourceUri}
      />
    </>
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
  buttonRow: {
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
  featurePreview: {
    width: '100%',
    minHeight: 180,
  },
  featurePreviewFallback: {
    minHeight: 180,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
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
  queueCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  queuePreview: {
    width: '100%',
    minHeight: 160,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  queuePreviewImage: {
    width: '100%',
    minHeight: 160,
  },
  queueMeta: {
    gap: Spacing.two,
  },
  queueTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  queueInput: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  queueTextArea: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  queueActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  viewerRoot: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    gap: Spacing.three,
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  viewerHeaderText: {
    flex: 1,
    gap: Spacing.one,
  },
  viewerSurface: {
    flex: 1,
    minHeight: 320,
    borderWidth: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: Spacing.two,
  },
  viewerMedia: {
    width: '100%',
    height: '100%',
    minHeight: 320,
  },
});
