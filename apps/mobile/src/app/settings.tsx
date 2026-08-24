import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

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
import { useOwnerWrite } from '@/hooks/use-owner-write';
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
  const writer = useOwnerWrite();
  const activeTheme = coupleData.theme;
  const currentProfile = coupleData.profiles.find((entry) => entry.uid === user?.uid) || coupleData.profiles[0] || null;
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
  const profileSource = {
    name: currentProfile?.name || '',
    bio: currentProfile?.bio || '',
    joinedDate: currentProfile?.joinedDate || '',
    birthday: currentProfile?.birthday || '',
    revision: currentProfile?.revision || 0,
  };
  const settingsSource = {
    appearanceTheme: activeTheme.id,
    anniversaryView: coupleData.privateSettings?.anniversaryView || 'dual',
    preferredAlbumView:
      coupleData.privateSettings?.preferredAlbumView
      || coupleData.sharedSettings?.preferredAlbumView
      || 'photo-book',
    localOnlyMode: coupleData.privateSettings?.privacy.localOnlyMode === true,
    reducedMotion: coupleData.privateSettings?.privacy.reducedMotion === true,
    revision: coupleData.privateSettings?.revision || 0,
  };
  const sharedSource = {
    liveAlbumCover: coupleData.sharedSettings?.liveAlbumCover || '',
    previewOrder: (coupleData.sharedSettings?.previewOrder || []).join(', '),
    revision: coupleData.sharedSettings?.revision || 0,
  };
  const [status, setStatus] = useState<{ kind: string; message: string; saving: boolean }>({ kind: '', message: '', saving: false });
  const [profileDraft, setProfileDraft] = useState<{
    name: string;
    bio: string;
    joinedDate: string;
    birthday: string;
    revision: number;
  } | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<{
    appearanceTheme: string;
    anniversaryView: string;
    preferredAlbumView: string;
    localOnlyMode: boolean;
    reducedMotion: boolean;
    revision: number;
  } | null>(null);
  const [sharedDraft, setSharedDraft] = useState<{
    liveAlbumCover: string;
    previewOrder: string;
    revision: number;
  } | null>(null);
  const resolvedProfileDraft = profileDraft || profileSource;
  const resolvedSettingsDraft = settingsDraft || settingsSource;
  const resolvedSharedDraft = sharedDraft || sharedSource;

  function formatWriteError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Settings could not be saved.';
    if (/disabled outside approved mobile Firestore write mode/i.test(message)) {
      return 'Settings writes are disabled in this build. Use the approved emulator write mode for development writes.';
    }
    if (/changed in another session/i.test(message)) {
      return 'These settings changed somewhere else. Reload the latest values and try again.';
    }
    if (/membership|approved user/i.test(message)) {
      return 'This account cannot save Couple Book settings right now.';
    }
    return message;
  }

  async function handleSaveProfile() {
    setStatus({ kind: '', message: '', saving: true });
    try {
      const saved = await writer.saveProfile(resolvedProfileDraft);
      setProfileDraft({
        name: saved.name || resolvedProfileDraft.name,
        bio: saved.bio || '',
        joinedDate: saved.joinedDate || '',
        birthday: saved.birthday || '',
        revision: Number(saved.revision || resolvedProfileDraft.revision || 0),
      });
      setStatus({ kind: 'success', message: 'Profile and dates saved.', saving: false });
    } catch (writeError) {
      setStatus({ kind: 'error', message: formatWriteError(writeError), saving: false });
    }
  }

  async function handleSaveSettings() {
    setStatus({ kind: '', message: '', saving: true });
    try {
      const saved = await writer.saveOwnSettings(resolvedSettingsDraft);
      setSettingsDraft({
        appearanceTheme: saved.appearanceTheme || resolvedSettingsDraft.appearanceTheme,
        anniversaryView: saved.anniversaryView || '',
        preferredAlbumView: saved.preferredAlbumView || resolvedSettingsDraft.preferredAlbumView,
        localOnlyMode: saved.privacy?.localOnlyMode === true,
        reducedMotion: saved.privacy?.reducedMotion === true,
        revision: Number(saved.revision || resolvedSettingsDraft.revision || 0),
      });
      setStatus({ kind: 'success', message: 'Personal settings saved.', saving: false });
    } catch (writeError) {
      setStatus({ kind: 'error', message: formatWriteError(writeError), saving: false });
    }
  }

  async function handleSaveSharedSettings() {
    setStatus({ kind: '', message: '', saving: true });
    try {
      const saved = await writer.saveSharedSettings({
        liveAlbumCover: resolvedSharedDraft.liveAlbumCover,
        previewOrder: resolvedSharedDraft.previewOrder
          .split(',')
          .map((entry: string) => entry.trim())
          .filter(Boolean),
        preferredAlbumView: resolvedSettingsDraft.preferredAlbumView,
        revision: resolvedSharedDraft.revision,
      });
      setSharedDraft({
        liveAlbumCover: saved.liveAlbumCover || '',
        previewOrder: Array.isArray(saved.previewOrder) ? saved.previewOrder.join(', ') : '',
        revision: Number(saved.revision || resolvedSharedDraft.revision || 0),
      });
      setStatus({ kind: 'success', message: 'Shared Album settings saved.', saving: false });
    } catch (writeError) {
      setStatus({ kind: 'error', message: formatWriteError(writeError), saving: false });
    }
  }

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
        <View
          style={[
            styles.profileCard,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <TextInput
            value={resolvedProfileDraft.name}
            onChangeText={(value) =>
              setProfileDraft((current) => ({ ...(current || profileSource), name: value }))
            }
            placeholder="Your name"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              { backgroundColor: theme.backgroundSelected, borderColor: theme.border, color: theme.text },
            ]}
          />
          <TextInput
            value={resolvedProfileDraft.joinedDate}
            onChangeText={(value) =>
              setProfileDraft((current) => ({ ...(current || profileSource), joinedDate: value }))
            }
            placeholder="Relationship start YYYY-MM-DD"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              { backgroundColor: theme.backgroundSelected, borderColor: theme.border, color: theme.text },
            ]}
          />
          <TextInput
            value={resolvedProfileDraft.birthday}
            onChangeText={(value) =>
              setProfileDraft((current) => ({ ...(current || profileSource), birthday: value }))
            }
            placeholder="Birthday YYYY-MM-DD"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              { backgroundColor: theme.backgroundSelected, borderColor: theme.border, color: theme.text },
            ]}
          />
          <TextInput
            value={resolvedProfileDraft.bio}
            onChangeText={(value) =>
              setProfileDraft((current) => ({ ...(current || profileSource), bio: value }))
            }
            placeholder="Profile note"
            placeholderTextColor={theme.textMuted}
            multiline
            style={[
              styles.textArea,
              { backgroundColor: theme.backgroundSelected, borderColor: theme.border, color: theme.text },
            ]}
          />
          <Pressable
            onPress={() => {
              void handleSaveProfile();
            }}
            style={[
              styles.primaryButton,
              { backgroundColor: theme.accent, borderColor: theme.accentStrong, opacity: status.saving ? 0.7 : 1 },
            ]}>
            <ThemedText type="smallBold" style={styles.lightText}>
              {status.saving ? 'Saving...' : 'Save Profile and Dates'}
            </ThemedText>
          </Pressable>
        </View>
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
            <Pressable
              key={themeOption.id}
              onPress={() =>
                setSettingsDraft((current) => ({
                  ...(current || settingsSource),
                  appearanceTheme: themeOption.id,
                }))
              }
              style={[
                styles.themeCard,
                {
                  backgroundColor: themeOption.colors.backgroundElement,
                  borderColor:
                    themeOption.id === resolvedSettingsDraft.appearanceTheme
                      ? activeTheme.accent
                      : theme.border,
                },
              ]}>
              <View style={styles.themeHeader}>
                <ThemedText type="smallBold" style={{ color: themeOption.colors.text }}>
                  {themeOption.name}
                </ThemedText>
                {themeOption.id === resolvedSettingsDraft.appearanceTheme ? (
                  <BadgePill tone="accent">Selected</BadgePill>
                ) : null}
              </View>
              <ThemedText type="small" style={{ color: themeOption.colors.textSecondary }}>
                {themeOption.shortDescription}
              </ThemedText>
              <InfoRow label="Theme ID" value={themeOption.id} />
            </Pressable>
          ))}
          <View style={styles.filterRow}>
            <BadgePill tone={resolvedSettingsDraft.localOnlyMode ? 'accent' : 'default'}>
              Local only: {resolvedSettingsDraft.localOnlyMode ? 'On' : 'Off'}
            </BadgePill>
            <BadgePill tone={resolvedSettingsDraft.reducedMotion ? 'accent' : 'default'}>
              Reduced motion: {resolvedSettingsDraft.reducedMotion ? 'On' : 'Off'}
            </BadgePill>
          </View>
          <View style={styles.actionRow}>
            <Pressable
              onPress={() =>
                setSettingsDraft((current) => ({
                  ...(current || settingsSource),
                  localOnlyMode: !(current || settingsSource).localOnlyMode,
                }))
              }
              style={[
                styles.secondaryButton,
                { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
              ]}>
              <ThemedText type="smallBold">Toggle Local Only</ThemedText>
            </Pressable>
            <Pressable
              onPress={() =>
                setSettingsDraft((current) => ({
                  ...(current || settingsSource),
                  reducedMotion: !(current || settingsSource).reducedMotion,
                }))
              }
              style={[
                styles.secondaryButton,
                { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
              ]}>
              <ThemedText type="smallBold">Toggle Reduced Motion</ThemedText>
            </Pressable>
          </View>
          <Pressable
            onPress={() => {
              void handleSaveSettings();
            }}
            style={[
              styles.primaryButton,
              { backgroundColor: theme.accent, borderColor: theme.accentStrong, opacity: status.saving ? 0.7 : 1 },
            ]}>
            <ThemedText type="smallBold" style={styles.lightText}>
              {status.saving ? 'Saving...' : 'Save Personal Settings'}
            </ThemedText>
          </Pressable>
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
        <View
          style={[
            styles.profileCard,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <TextInput
            value={resolvedSharedDraft.liveAlbumCover}
            onChangeText={(value) =>
              setSharedDraft((current) => ({ ...(current || sharedSource), liveAlbumCover: value }))
            }
            placeholder="Selected Live Album cover ID"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              { backgroundColor: theme.backgroundSelected, borderColor: theme.border, color: theme.text },
            ]}
          />
          <TextInput
            value={resolvedSharedDraft.previewOrder}
            onChangeText={(value) =>
              setSharedDraft((current) => ({ ...(current || sharedSource), previewOrder: value }))
            }
            placeholder="Preview order IDs separated by commas"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.textArea,
              { backgroundColor: theme.backgroundSelected, borderColor: theme.border, color: theme.text },
            ]}
          />
          <Pressable
            onPress={() => {
              void handleSaveSharedSettings();
            }}
            style={[
              styles.primaryButton,
              { backgroundColor: theme.accent, borderColor: theme.accentStrong, opacity: status.saving ? 0.7 : 1 },
            ]}>
            <ThemedText type="smallBold" style={styles.lightText}>
              {status.saving ? 'Saving...' : 'Save Shared Album Settings'}
            </ThemedText>
          </Pressable>
        </View>
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
        {status.message ? (
          <ThemedText type="small" themeColor="textSecondary">
            {status.message}
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  primaryButton: {
    minHeight: 44,
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
  signOutButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
