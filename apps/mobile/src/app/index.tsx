import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ActionButton,
  BadgePill,
  CoupleBookScreen,
  InfoRow,
  SectionCard,
} from '@/components/couplebook-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useCoupleData } from '@/hooks/use-couple-data';
import {
  PARTNER_BIRTHDAY_LABEL,
  calculateBirthdayCountdown,
  createDateAtNoon,
  formatMonthDayLabel,
} from '../../../../packages/core/src/index.js';

function getRelationshipStartDate(profiles: ReturnType<typeof useCoupleData>['profiles']) {
  const timestamps = profiles
    .map((entry) => createDateAtNoon(entry.joinedDate)?.getTime() || 0)
    .filter(Boolean)
    .sort((left, right) => left - right);

  return timestamps[0] ? new Date(timestamps[0]) : null;
}

function getDaysTogether(startDate: Date | null, now = new Date()) {
  if (!startDate) return 0;
  const diffMs = now.getTime() - startDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function findOnThisDay(memories: ReturnType<typeof useCoupleData>['memories'], now = new Date()) {
  const month = now.getMonth();
  const day = now.getDate();

  return memories.find((entry) => {
    const date = createDateAtNoon(entry.date);
    return date && date.getMonth() === month && date.getDate() === day;
  }) || null;
}

function formatDateLabel(value: string, fallback = 'Undated') {
  const date = createDateAtNoon(value);
  if (!date) return fallback;

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function HomeScreen() {
  const birthdayCountdown = calculateBirthdayCountdown('2006-09-16');
  const { approvedUser } = useAuth();
  const { error, loading, memories, plans, profiles, warnings } = useCoupleData();
  const displayName =
    approvedUser?.displayName || approvedUser?.profileName || approvedUser?.username || 'the two of you';

  const activeMemories = useMemo(
    () =>
      memories
        .filter((entry) => entry.status === 'active')
        .sort((left, right) => right.date.localeCompare(left.date)),
    [memories],
  );
  const featuredMemory = activeMemories.find((entry) => entry.mediaState !== 'none') || activeMemories[0] || null;
  const nextPlan = plans.find((entry) => entry.status === 'planned' || entry.status === 'idea') || null;
  const peopleSummary = profiles.map((entry) => entry.name).filter(Boolean).join(' and ') || displayName;
  const relationshipStart = getRelationshipStartDate(profiles);
  const daysTogether = getDaysTogether(relationshipStart);
  const onThisDay = findOnThisDay(activeMemories);

  return (
    <CoupleBookScreen
      eyebrow="Home"
      title="Home"
      subtitle="The same relationship timeline, dates, and private settings now land here with a native layout instead of a shell summary.">
      <SectionCard
        title="Relationship at a glance"
        description="Home opens on the relationship itself: who the book belongs to, how long it has been going, and the next date that matters.">
        <View style={styles.pillRow}>
          <BadgePill tone="accent">{peopleSummary}</BadgePill>
          <BadgePill>{PARTNER_BIRTHDAY_LABEL}</BadgePill>
        </View>
        <InfoRow label="Days together" value={daysTogether ? String(daysTogether) : 'Not set'} tone="accent" />
        <InfoRow
          label="Relationship start"
          value={relationshipStart ? formatDateLabel(relationshipStart.toISOString().slice(0, 10)) : 'Add a shared start date'}
        />
        <InfoRow
          label="Partner birthday"
          value={birthdayCountdown.isToday ? 'Today' : `${birthdayCountdown.days} days to ${PARTNER_BIRTHDAY_LABEL}`}
          tone="accent"
        />
      </SectionCard>

      <SectionCard
        title="Featured memory"
        description="The leading memory stays grounded in real couple data and keeps the date and media type visible on first load.">
        {featuredMemory ? (
          <View style={styles.stack}>
            <View style={styles.memoryCard}>
              <ThemedText type="smallBold">{featuredMemory.title || 'Untitled memory'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {featuredMemory.description || 'No extra note saved for this memory yet.'}
              </ThemedText>
            </View>
            <InfoRow label="Saved date" value={formatDateLabel(featuredMemory.date)} />
            <InfoRow
              label="Media"
              value={
                featuredMemory.mediaState === 'none'
                  ? 'Text memory'
                  : featuredMemory.isVideo
                    ? 'Video memory'
                    : 'Photo memory'
              }
            />
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {loading ? 'Loading shared memories.' : error || 'No approved shared memories are available yet.'}
          </ThemedText>
        )}
      </SectionCard>

      <View style={styles.twoUp}>
        <SectionCard
          title="On This Day"
          description="A same-date memory surfaces here when the timeline has one worth reopening.">
          {onThisDay ? (
            <View style={styles.stack}>
              <ThemedText type="smallBold">{onThisDay.title || 'Untitled memory'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {onThisDay.description || 'Open Story to revisit this chapter.'}
              </ThemedText>
              <InfoRow label="Original date" value={formatDateLabel(onThisDay.date)} />
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              No memory matches {formatMonthDayLabel(new Date())} yet.
            </ThemedText>
          )}
        </SectionCard>

        <SectionCard
          title="Next plan"
          description="The next shared plan stays visible here so Home can point back into Story and Plans without extra taps.">
          {nextPlan ? (
            <View style={styles.stack}>
              <ThemedText type="smallBold">{nextPlan.title || 'Untitled plan'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {[nextPlan.category, nextPlan.targetDate ? formatDateLabel(nextPlan.targetDate) : 'No target date']
                  .filter(Boolean)
                  .join(' • ')}
              </ThemedText>
              {nextPlan.notes ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {nextPlan.notes}
                </ThemedText>
              ) : null}
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {loading ? 'Loading shared plans.' : 'No saved plan is waiting right now.'}
            </ThemedText>
          )}
        </SectionCard>
      </View>

      <SectionCard
        title="Quick actions"
        description="These open the live routed tabs that already share the same auth, membership, and read model as the web app.">
        <View style={styles.actionGrid}>
          <ActionButton
            label="Add Memory"
            detail="Open Story and jump into the shared memory feed"
            onPress={() => router.push('/story')}
          />
          <ActionButton
            label="Open Album"
            detail="Browse photos and videos from the same shared collection"
            onPress={() => router.push('/album')}
          />
          <ActionButton
            label="Open Plans"
            detail={nextPlan ? nextPlan.title : 'Browse ideas, dates, and completed plans'}
            onPress={() => router.push('/plans')}
          />
          <ActionButton
            label="Open Settings"
            detail="Review profile dates, themes, and privacy state"
            onPress={() => router.push('/settings')}
          />
        </View>
        {warnings[0] ? (
          <ThemedText type="small" themeColor="textSecondary">
            {warnings[0]}
          </ThemedText>
        ) : null}
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
  twoUp: {
    gap: Spacing.three,
  },
  memoryCard: {
    gap: Spacing.one,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
