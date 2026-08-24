import { StyleSheet, View } from 'react-native';

import { BadgePill, CoupleBookScreen, InfoRow, SectionCard } from '@/components/couplebook-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSpecialMoment } from '@/hooks/use-special-moment';

export default function BirthdayScreen() {
  const { loading, error, warnings, moment } = useSpecialMoment('birthday');

  return (
    <CoupleBookScreen
      eyebrow="Birthday"
      title={moment?.title || 'Birthday moment'}
      subtitle={moment?.subtitle || 'A protected birthday chapter for the approved couple session.'}>
      <SectionCard
        title="Birthday chapter"
        description="This native route reads the same protected special-moment document the web app uses, without bundling private text into the app source.">
        <BadgePill tone="accent">{moment?.date || 'September 16'}</BadgePill>
        <InfoRow label="Status" value={loading ? 'Loading' : moment ? 'Ready' : 'Unavailable'} />
        <InfoRow label="Sections" value={String(moment?.sections.length || 0)} />
        <InfoRow label="Media slots" value={String(moment?.mediaSlotCount || 0)} />
      </SectionCard>

      <SectionCard
        title="Message"
        description="The mobile presentation keeps the chapter readable first, with space for the celebration details and message to lead the route.">
        <View style={styles.stack}>
          {moment?.sections.length ? (
            moment.sections.map((section) => (
              <View key={section.id} style={styles.sectionRow}>
                {section.heading ? <ThemedText type="smallBold">{section.heading}</ThemedText> : null}
                {section.content ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {section.content}
                  </ThemedText>
                ) : null}
                {section.items.map((item) => (
                  <ThemedText key={item} type="small" themeColor="textSecondary">
                    • {item}
                  </ThemedText>
                ))}
              </View>
            ))
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {loading ? 'Loading the birthday chapter.' : error || 'This birthday chapter is not available yet.'}
            </ThemedText>
          )}
        </View>
      </SectionCard>

      <SectionCard
        title="Companion media"
        description="Private companion media stays outside the app bundle and remains controlled by the protected media architecture.">
        <InfoRow label="Media status" value={moment?.mediaStatus || 'Unavailable'} />
        <InfoRow label="Media type" value={moment?.mediaType || 'None'} />
        <InfoRow label="Warnings" value={warnings.length ? String(warnings.length) : 'None'} />
        {moment?.mediaNote ? (
          <ThemedText type="small" themeColor="textSecondary">
            {moment.mediaNote}
          </ThemedText>
        ) : null}
      </SectionCard>
    </CoupleBookScreen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.two,
  },
  sectionRow: {
    gap: Spacing.one,
  },
});
