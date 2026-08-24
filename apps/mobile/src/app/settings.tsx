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
import { PARTNER_BIRTHDAY_LABEL } from '../../../../packages/core/src/index.js';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const { approvedUser, signOut, user } = useAuth();
  const theme = useTheme();
  const coupleData = useCoupleData();
  const activeTheme = coupleData.theme;
  const favoriteCount = coupleData.favorites.reduce(
    (total, entry) => total + Object.values(entry.favorites).reduce((sum, items) => sum + items.length, 0),
    0,
  );

  return (
    <CoupleBookScreen
      eyebrow="Settings"
      title="Profile, media, and access"
      subtitle="Settings now reflects live user-scoped theme and privacy records from the same protected Firestore collections as the website.">
      <SectionCard
        title="Profile and dates"
        description="The partner birthday authority is shared and already corrected to September 16. Approved user identity and profile counts now come from live mobile reads.">
        <InfoRow label="Partner birthday" value={PARTNER_BIRTHDAY_LABEL} tone="accent" />
        <InfoRow label="Theme preference" value={activeTheme.name} />
        <InfoRow label="Profiles loaded" value={String(coupleData.profiles.length)} />
        <InfoRow label="Favorites saved" value={String(favoriteCount)} />
      </SectionCard>

      <SectionCard
        title="Appearance"
        description="Theme IDs are shared across platforms while native uses its own semantic tokens. The highlighted theme now follows the protected user settings document.">
        <View style={styles.themeStack}>
          {CoupleBookThemes.map((themeOption) => (
            <View key={themeOption.id} style={styles.themeRow}>
              <BadgePill tone={themeOption.id === activeTheme.id ? 'accent' : 'default'}>
                {themeOption.name}
              </BadgePill>
              <InfoRow label="Theme ID" value={themeOption.id} />
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Album and media"
        description="Google Drive remains the external media archive. Firebase holds auth, membership, and metadata. Native Drive connection UI is still pending.">
        <InfoRow label="Drive state" value="Not connected in native yet" />
        <InfoRow label="Live Album" value="Metadata only until Drive auth is added" />
        <InfoRow label="Memories loaded" value={String(coupleData.memories.length)} />
      </SectionCard>

      <SectionCard
        title="Special pages"
        description="Birthday, Valentine, and Confession now have dedicated native routes backed by the protected special-moment collection.">
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
        <InfoRow label="Allowed users" value="Approved active members only" />
        <InfoRow label="Pending or inactive" value="Blocked from private content" />
        <InfoRow
          label="System health"
          value={coupleData.loading ? 'Refreshing live data' : coupleData.error ? 'Needs review' : 'Live sync ready'}
        />
        <InfoRow
          label="Privacy toggles"
          value={
            coupleData.privateSettings
              ? `Local only: ${coupleData.privateSettings.privacy.localOnlyMode ? 'On' : 'Off'}`
              : 'No private settings yet'
          }
        />
        {coupleData.warnings[0] ? (
          <ThemedText type="small" themeColor="textSecondary">
            {coupleData.warnings[0]}
          </ThemedText>
        ) : null}
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
  themeStack: {
    gap: Spacing.three,
  },
  themeRow: {
    gap: Spacing.two,
  },
  specialPageActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  signOutButton: {
    marginTop: Spacing.two,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
