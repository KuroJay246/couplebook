import { router } from 'expo-router';
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
} from '../../../../packages/core/src/index.js';

export default function HomeScreen() {
  const birthdayCountdown = calculateBirthdayCountdown('2006-09-16');
  const { approvedUser } = useAuth();
  const { loading, memories, plans, profiles, warnings } = useCoupleData();
  const displayName =
    approvedUser?.displayName || approvedUser?.profileName || approvedUser?.username || 'the two of you';
  const activeMemories = memories.filter((entry) => entry.status === 'active');
  const featuredMemory =
    activeMemories.find((entry) => entry.mediaState !== 'none') || activeMemories[0] || null;
  const nextPlan =
    plans.find((entry) => entry.status === 'planned' || entry.status === 'idea') || null;
  const peopleSummary =
    profiles.map((entry) => entry.name).filter(Boolean).join(' and ') || displayName;

  return (
    <CoupleBookScreen
      eyebrow="Home"
      title="Couple Book"
      subtitle="One private relationship space across web and native, with shared dates, shared themes, and the same memory timeline.">
      <SectionCard
        title="Shared milestone"
        description="The native shell now reads approved couple data and user-scoped settings from the same Firebase project as the website.">
        <BadgePill>{peopleSummary}</BadgePill>
        <BadgePill tone="accent">Partner birthday: {PARTNER_BIRTHDAY_LABEL}</BadgePill>
        <InfoRow
          label="Countdown"
          value={
            birthdayCountdown.isToday
              ? 'Today'
              : `${birthdayCountdown.days} days until September 16`
          }
          tone="accent"
        />
        <InfoRow label="Next age" value={String(birthdayCountdown.nextAge ?? '--')} />
        <InfoRow label="Memories synced" value={String(activeMemories.length)} />
      </SectionCard>

      <SectionCard
        title="Featured memory"
        description="This summary comes from the live couple-scoped memory collection and updates through the native listener.">
        <View style={styles.featureStack}>
          {featuredMemory ? (
            <>
              <View style={styles.mediaPlaceholder}>
                <ThemedText type="smallBold">{featuredMemory.title || 'Untitled memory'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {featuredMemory.description || 'No extra note saved for this memory yet.'}
                </ThemedText>
              </View>
              <InfoRow label="Saved date" value={featuredMemory.date || 'Undated'} />
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
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {loading ? 'Loading shared memories.' : 'No approved shared memories are available yet.'}
            </ThemedText>
          )}
        </View>
      </SectionCard>

      <SectionCard
        title="Today"
        description="Quick actions stay compact on mobile and open the same routed features that use the shared data layer.">
        <View style={styles.actionGrid}>
          <ActionButton disabled label="Add Memory" detail="Write flow not wired on native yet" />
          <ActionButton
            label="Open Album"
            detail="Review photos and videos from the shared memory set"
            onPress={() => router.push('/album')}
          />
          <ActionButton
            label="Next Plan"
            detail={nextPlan ? nextPlan.title : 'No saved plan yet'}
            onPress={() => router.push('/plans')}
          />
          <ActionButton
            label="Open Story"
            detail="Review the latest couple timeline entries"
            onPress={() => router.push('/story')}
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
  featureStack: {
    gap: Spacing.two,
  },
  mediaPlaceholder: {
    gap: Spacing.one,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
