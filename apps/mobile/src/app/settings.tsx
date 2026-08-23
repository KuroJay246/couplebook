import { StyleSheet, View } from 'react-native';

import {
  BadgePill,
  CoupleBookScreen,
  InfoRow,
  SectionCard,
} from '@/components/couplebook-screen';
import { CoupleBookThemes, DefaultCoupleBookThemeId } from '@/constants/couplebook-theme';
import { Spacing } from '@/constants/theme';
import { PARTNER_BIRTHDAY_LABEL } from '../../../../packages/core/src/index.js';

export default function SettingsScreen() {
  return (
    <CoupleBookScreen
      eyebrow="Settings"
      title="Profile, media, and access"
      subtitle="Settings is being rebuilt as the mobile home for dates, theme preferences, Google Drive connection, privacy, and sync health.">
      <SectionCard
        title="Profile and dates"
        description="The partner birthday authority is shared and already corrected to September 16.">
        <InfoRow label="Partner birthday" value={PARTNER_BIRTHDAY_LABEL} tone="accent" />
        <InfoRow label="Theme preference" value="Personal per user, shared theme IDs" />
        <InfoRow label="Special pages" value="Birthday, Valentine, and Confession" />
      </SectionCard>

      <SectionCard
        title="Appearance"
        description="Theme IDs are shared across platforms while native uses its own semantic tokens.">
        <View style={styles.themeStack}>
          {CoupleBookThemes.map((theme) => (
            <View key={theme.id} style={styles.themeRow}>
              <BadgePill tone={theme.id === DefaultCoupleBookThemeId ? 'accent' : 'default'}>
                {theme.name}
              </BadgePill>
              <InfoRow label="Theme ID" value={theme.id} />
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Album and media"
        description="Google Drive remains the external media archive. Firebase holds auth, membership, and metadata.">
        <InfoRow label="Drive state" value="Not connected, connected, or reconnect required" />
        <InfoRow label="Live Album" value="Preview grid with approved fallback" />
        <InfoRow label="Import status" value="Owner-controlled local recovery only" />
      </SectionCard>

      <SectionCard
        title="Privacy and access"
        description="The same approval and couple membership rules must apply on web and mobile.">
        <InfoRow label="Allowed users" value="Approved active members only" />
        <InfoRow label="Pending or inactive" value="Blocked from private content" />
        <InfoRow label="System health" value="Last sync, failed writes, retry, sign out" />
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
});
