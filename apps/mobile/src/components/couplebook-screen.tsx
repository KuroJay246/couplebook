import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CoupleBookScreenProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

type SectionCardProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

type InfoRowProps = {
  label: string;
  value: string;
  tone?: 'default' | 'accent' | 'success';
};

type BadgePillProps = {
  children: ReactNode;
  tone?: 'default' | 'accent';
};

type ActionButtonProps = {
  label: string;
  detail?: string;
  onPress?: () => void;
  disabled?: boolean;
};

type FilterChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

type SearchInputProps = {
  value: string;
  placeholder?: string;
  onChangeText?: (value: string) => void;
};

export function CoupleBookScreen({
  eyebrow,
  title,
  subtitle,
  children,
}: CoupleBookScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: insets.top + Spacing.four,
          paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
        },
      ]}>
      <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
        <View style={styles.contentColumn}>
          <View style={styles.heroBlock}>
            {eyebrow ? (
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.eyebrow}>
                {eyebrow}
              </ThemedText>
            ) : null}
            <ThemedText type="title" style={styles.title}>
              {title}
            </ThemedText>
            {subtitle ? (
              <ThemedText style={styles.subtitle} themeColor="textSecondary">
                {subtitle}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.sections}>{children}</View>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}

export function SectionCard({ title, description, children }: SectionCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {description ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.cardDescription}>
            {description}
          </ThemedText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function InfoRow({ label, value, tone = 'default' }: InfoRowProps) {
  const theme = useTheme();
  const toneColor =
    tone === 'accent' ? theme.accent : tone === 'success' ? theme.success : theme.textSecondary;

  return (
    <View style={styles.infoRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={[styles.infoValue, { color: toneColor }]}>
        {value}
      </ThemedText>
    </View>
  );
}

export function BadgePill({ children, tone = 'default' }: BadgePillProps) {
  const theme = useTheme();
  const backgroundColor = tone === 'accent' ? theme.accentSoft : theme.backgroundSelected;
  const textColor = tone === 'accent' ? theme.accent : theme.textSecondary;

  return (
    <View style={[styles.badgePill, { backgroundColor }]}>
      <ThemedText type="smallBold" style={{ color: textColor }}>
        {children}
      </ThemedText>
    </View>
  );
}

export function ActionButton({ label, detail, onPress, disabled = false }: ActionButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, (pressed || disabled) && styles.pressed]}>
      <View
        style={[
          styles.actionButtonSurface,
          {
            backgroundColor: theme.surfaceRaised,
            borderColor: theme.border,
          },
        ]}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.actionDetail}>
            {detail}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

export function FilterChip({ label, active = false, onPress }: FilterChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        {
          backgroundColor: active ? theme.accentSoft : theme.backgroundSelected,
          borderColor: active ? theme.accent : theme.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}>
      <ThemedText type="smallBold" style={{ color: active ? theme.accent : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function SearchInput({
  value,
  placeholder = 'Search',
  onChangeText,
}: SearchInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textMuted}
      selectionColor={theme.accent}
      style={[
        styles.searchInput,
        {
          backgroundColor: theme.backgroundSelected,
          borderColor: theme.border,
          color: theme.text,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  safeArea: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  contentColumn: {
    gap: Spacing.four,
  },
  heroBlock: {
    gap: Spacing.two,
  },
  eyebrow: {
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
  },
  subtitle: {
    maxWidth: 620,
  },
  sections: {
    gap: Spacing.three,
  },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  cardHeader: {
    gap: Spacing.one,
  },
  cardDescription: {
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    alignItems: 'center',
  },
  infoLabel: {
    flex: 1,
  },
  infoValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  badgePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  actionButton: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  actionButtonSurface: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.one,
    minHeight: 88,
    justifyContent: 'center',
  },
  actionDetail: {
    lineHeight: 18,
  },
  filterChip: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.72,
  },
});
