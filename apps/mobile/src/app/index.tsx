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
import {
  PARTNER_BIRTHDAY_LABEL,
  calculateBirthdayCountdown,
} from '../../../../packages/core/src/index.js';

export default function HomeScreen() {
  const birthdayCountdown = calculateBirthdayCountdown('2006-09-16');

  return (
    <CoupleBookScreen
      eyebrow="Home"
      title="Couple Book"
      subtitle="One private relationship space across web and native, with shared dates, shared themes, and the same album and memory system.">
      <SectionCard
        title="Shared milestone"
        description="The mobile app is already reading the same birthday contract as the web app.">
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
      </SectionCard>

      <SectionCard
        title="Featured memory"
        description="This slot becomes the first real photo or video after Firebase and Drive repositories are wired into the native feed.">
        <View style={styles.featureStack}>
          <View style={styles.mediaPlaceholder}>
            <ThemedText type="smallBold">Featured photograph</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Native cover treatment pending repository hookup
            </ThemedText>
          </View>
          <InfoRow label="Story link" value="Recent shared memory" />
          <InfoRow label="Album" value="Photo Book cover slot" />
        </View>
      </SectionCard>

      <SectionCard
        title="Today"
        description="Quick actions stay compact on mobile and map to the same shared data model as the website.">
        <View style={styles.actionGrid}>
          <ActionButton label="Add Memory" detail="Create text, photo, or video entry" />
          <ActionButton label="Open Album" detail="Jump to Photo Book and Live Album" />
          <ActionButton label="Next Plan" detail="See the next shared date or outing" />
          <ActionButton label="On This Day" detail="Review matching memories and milestones" />
        </View>
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
