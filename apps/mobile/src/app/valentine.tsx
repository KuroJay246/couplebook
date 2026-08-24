import { Pressable, StyleSheet, View } from 'react-native';

import { BadgePill, CoupleBookScreen, InfoRow, SectionCard } from '@/components/couplebook-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSpecialMoment } from '@/hooks/use-special-moment';
import { useTheme } from '@/hooks/use-theme';

const FLIRTY_MESSAGES = [
  'No stays retired here.',
  'The answer is still yes.',
  'This page knows better.',
  'Try the other button.',
];

export default function ValentineScreen() {
  const { loading, error, moment } = useSpecialMoment('valentine');
  const theme = useTheme();
  const question = moment?.title || 'Will you be my Valentine?';
  const subtitle = moment?.subtitle || 'A protected private love note.';

  return (
    <CoupleBookScreen eyebrow="Valentine" title={question} subtitle={subtitle}>
      <SectionCard
        title="Valentine chapter"
        description="This native version keeps the playful interaction, but the text still comes from the protected special-moment document.">
        <BadgePill tone="accent">{moment?.date || 'February 14'}</BadgePill>
        <InfoRow label="Status" value={loading ? 'Loading' : moment ? 'Ready' : 'Unavailable'} />
        <InfoRow label="Media slots" value={String(moment?.mediaSlotCount || 0)} />
      </SectionCard>

      <SectionCard
        title="Question"
        description="The interaction stays light, while the actual letter content remains couple-scoped and private.">
        <View style={styles.buttonRow}>
          <Pressable
            style={[
              styles.choiceButton,
              { backgroundColor: theme.accent, borderColor: theme.accentStrong },
            ]}>
            <ThemedText type="smallBold" style={styles.lightText}>
              Yes
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.choiceButton,
              { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
            ]}>
            <ThemedText type="smallBold">{FLIRTY_MESSAGES[0]}</ThemedText>
          </Pressable>
        </View>
        {moment?.sections.length ? (
          <View style={styles.stack}>
            {moment.sections.map((section) => (
              <View key={section.id} style={styles.sectionRow}>
                {section.heading ? <ThemedText type="smallBold">{section.heading}</ThemedText> : null}
                {section.content ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {section.content}
                  </ThemedText>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {loading ? 'Loading the valentine note.' : error || 'This valentine chapter is not available yet.'}
          </ThemedText>
        )}
      </SectionCard>
    </CoupleBookScreen>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  choiceButton: {
    minHeight: 48,
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
  stack: {
    gap: Spacing.two,
  },
  sectionRow: {
    gap: Spacing.one,
  },
});
