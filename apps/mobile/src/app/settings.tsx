import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  ActionButton,
  BadgePill,
  CoupleBookScreen,
  InfoRow,
  SectionCard,
} from '@/components/couplebook-screen';
import { CoupleBookThemes } from '@/constants/couplebook-theme';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useCoupleData } from '@/hooks/use-couple-data';
import { useTheme } from '@/hooks/use-theme';
import { PARTNER_BIRTHDAY_LABEL, createDateAtNoon } from '../../../../packages/core/src/index.js';
import { ThemedText } from '@/components/themed-text';

function formatDateLabel(value: string, fallback = 'Not set') {
  const date = createDateAtNoon(value);
  if (!date) return fallback;

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function SettingsScreen() {
  const { approvedUser, signOut, user } = useAuth();
  const theme = useTheme();
  const coupleData = useCoupleData();
  const activeTheme = coupleData.theme;
  const favoriteCount = coupleData.favorites.reduce(
    (total, entry) => total + Object.values(entry.favorites).reduce((sum, items) => sum + items.length, 0),
    0,
  );
  const schemaVersion = Math.max(
    0,
    ...coupleData.memories.map((entry) => entry.schemaVersion),
    ...coupleData.plans.map((entry) => entry.schemaVersion),
    ...coupleData.favorites.map((entry) => entry.schemaVersion),
    coupleData.privateSettings?.schemaVersion || 0,
  );

  return (
    <CoupleBookScreen
      eyebrow="Settings"
      title="Settings"
      subtitle="Profiles, dates, themes, album status, and private access details now read as one owner-facing mobile surface.">
      <SectionCard
        title="Profile and dates"
        description="The two profiles, birthdays, and relationship dates stay visible here without exposing internal membership terms.">
        <InfoRow label="Partner birthday" value={PARTNER_BIRTHDAY_LABEL} tone="accent" />
        <InfoRow label="Theme preference" value={activeTheme.name} />
        <InfoRow label="Profiles loaded" value={String(coupleData.profiles.length)} />
        <InfoRow label="Favorites saved" value={String(favoriteCount)} />
        <View style={styles.stack}>
          {coupleData.profiles.map((profile) => (
            <View
              key={profile.uid}
              style={[
                styles.profileCard,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <ThemedText type="smallBold">{profile.name || 'Profile'}</ThemedText>
              {profile.bio ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {profile.bio}
                </ThemedText>
              ) : null}
              <InfoRow label="Birthday" value={formatDateLabel(profile.birthday)} />
              <InfoRow label="Joined date" value={formatDateLabel(profile.joinedDate)} />
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Appearance"
        description="All supported Couple Book themes stay visible on mobile, with Paper Hearts still treated as the light editorial option.">
        <View style={styles.stack}>
          {CoupleBookThemes.map((themeOption) => (
            <View
              key={themeOption.id}
              style={[
                styles.themeCard,
                {
                  backgroundColor: themeOption.colors.backgroundElement,
                  borderColor: themeOption.id === activeTheme.id ? activeTheme.accent : theme.border,
                },
              ]}>
              <View style={styles.themeHeader}>
                <ThemedText type="smallBold" style={{ color: themeOption.colors.text }}>
                  {themeOption.name}
                </ThemedText>
                {themeOption.id === activeTheme.id ? <BadgePill tone="accent">Selected</BadgePill> : null}
              </View>
              <ThemedText type="small" style={{ color: themeOption.colors.textSecondary }}>
                {themeOption.shortDescription}
              </ThemedText>
              <InfoRow label="Theme ID" value={themeOption.id} />
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Album and media"
        description="Album metadata, upload status, and Drive-facing state stay readable here while the media archive remains private.">
        <InfoRow label="Memories loaded" value={String(coupleData.memories.length)} />
        <InfoRow
          label="Visual memories"
          value={String(coupleData.memories.filter((entry) => entry.mediaState !== 'none').length)}
        />
        <InfoRow label="Drive state" value="External archive linked through shared metadata" />
        <InfoRow label="Upload queue" value="Not active on this device session" />
      </SectionCard>

      <SectionCard
        title="Special moments"
        description="Birthday, Valentine, and Confession keep their dedicated native routes close to Settings.">
        <View style={styles.specialPageActions}>
          <ActionButton label="Birthday" detail="Open the birthday chapter" onPress={() => router.push('/birthday')} />
          <ActionButton label="Valentine" detail="Open the valentine chapter" onPress={() => router.push('/valentine')} />
          <ActionButton label="Confession" detail="Open the confession chapter" onPress={() => router.push('/confession')} />
        </View>
      </SectionCard>

      <SectionCard
        title="Privacy and access"
        description="The same approval and couple membership rules apply on web and mobile, and private settings stay owner-scoped.">
        <InfoRow label="Signed-in email" value={user?.email || 'Unavailable'} />
        <InfoRow label="Approved member" value={approvedUser?.displayName || approvedUser?.username || 'Unavailable'} />
        <InfoRow
          label="Local only mode"
          value={coupleData.privateSettings?.privacy.localOnlyMode ? 'On' : 'Off'}
        />
        <InfoRow
          label="Reduced motion"
          value={coupleData.privateSettings?.privacy.reducedMotion ? 'On' : 'Off'}
        />
      </SectionCard>

      <SectionCard
        title="System health"
        description="Owner-readable status stays on by default, while deeper engineering diagnostics remain outside the normal mobile interface.">
        <InfoRow label="Sync state" value={coupleData.loading ? 'Refreshing live data' : coupleData.error ? 'Needs review' : 'Live sync ready'} />
        <InfoRow label="Warnings" value={coupleData.warnings.length ? String(coupleData.warnings.length) : 'None'} />
        <InfoRow label="Schema version" value={schemaVersion ? String(schemaVersion) : 'Unknown'} />
        <InfoRow label="Theme ID" value={activeTheme.id} />
        {coupleData.warnings[0] ? (
          <ThemedText type="small" themeColor="textSecondary">
            {coupleData.warnings[0]}
          </ThemedText>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Sign out"
        description="Sign out clears the approved Couple Book session on this device and returns to the native login screen.">
        <Pressable
          onPress={() => {
            void signOut();
          }}
          style={({ pressed }) => [
            styles.signOutButton,
            {
              backgroundColor: theme.backgroundSelected,
              borderColor: theme.border,
              opacity: pressed ? 0.88 : 1,
            },
          ]}>
          <ThemedText type="smallBold">Sign out</ThemedText>
        </Pressable>
      </SectionCard>
    </CoupleBookScreen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.two,
  },
  profileCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  themeCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  themeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  specialPageActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  signOutButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
