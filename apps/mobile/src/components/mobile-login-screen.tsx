import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import {
  BadgePill,
  CoupleBookScreen,
  InfoRow,
  SectionCard,
} from '@/components/couplebook-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

export function MobileLoginScreen() {
  const { authError, authInitialized, isConfigured, isAuthorized, loading, signIn, signOut, user } =
    useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const statusCopy = useMemo(() => {
    if (!isConfigured) return 'Firebase config missing';
    if (loading && !authInitialized) return 'Restoring Couple Book';
    if (user && !isAuthorized) return 'Signed in but blocked';
    return 'Approved accounts only';
  }, [authInitialized, isAuthorized, isConfigured, loading, user]);

  async function handleSubmit() {
    setSubmitError('');
    setSubmitting(true);

    try {
      await signIn(email, password);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to complete sign-in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CoupleBookScreen
      eyebrow="Login"
      title="Open Couple Book"
      subtitle="Native access now depends on Firebase sign-in, approved-user lookup, and active couple membership before the private tabs open.">
      <SectionCard
        title="Private entry"
        description="The Android and iPhone client is now using the same approval and membership checks as the website.">
        <BadgePill tone="accent">{statusCopy}</BadgePill>
        <InfoRow label="Account gate" value="Firebase auth plus users/{uid}" />
        <InfoRow label="Couple scope" value="Active member of the assigned couple only" />
        <InfoRow label="Session storage" value="Secure device-backed persistence" />
      </SectionCard>

      <SectionCard
        title="Sign in"
        description="Use the approved Couple Book email and password for this private workspace.">
        <View style={styles.formStack}>
          <View style={styles.fieldStack}>
            <ThemedText type="smallBold">Email</ThemedText>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="approved-account@example.com"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundMuted,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={email}
            />
          </View>

          <View style={styles.fieldStack}>
            <ThemedText type="smallBold">Password</ThemedText>
            <TextInput
              autoComplete="password"
              onChangeText={setPassword}
              placeholder="Enter the account password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundMuted,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={password}
            />
          </View>

          <Pressable
            disabled={!isConfigured || loading || submitting}
            onPress={() => {
              void handleSubmit();
            }}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: theme.accent,
                opacity: !isConfigured || loading || submitting ? 0.55 : pressed ? 0.88 : 1,
              },
            ]}>
            {submitting || loading ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                Enter Couple Book
              </ThemedText>
            )}
          </Pressable>
        </View>

        {submitError || authError ? (
          <ThemedText type="small" style={{ color: theme.warning }}>
            {submitError || authError}
          </ThemedText>
        ) : null}

        {user && !isAuthorized ? (
          <Pressable
            onPress={() => {
              void signOut();
            }}
            style={({ pressed }) => [
              styles.signOutButton,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundSelected,
                opacity: pressed ? 0.88 : 1,
              },
            ]}>
            <ThemedText type="smallBold">Sign out</ThemedText>
          </Pressable>
        ) : null}
      </SectionCard>
    </CoupleBookScreen>
  );
}

const styles = StyleSheet.create({
  formStack: {
    gap: Spacing.three,
  },
  fieldStack: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  submitButton: {
    minHeight: 52,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
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
