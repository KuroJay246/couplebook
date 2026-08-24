import { StyleSheet, View } from 'react-native';

import { BadgePill, CoupleBookScreen, InfoRow, SectionCard } from '@/components/couplebook-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSpecialMoment } from '@/hooks/use-special-moment';

function splitParagraphs(sections: { content: string }[]) {
  return sections
    .map((section) => section.content.trim())
    .filter(Boolean)
    .flatMap((content) => content.split(/\n{2,}/).map((entry) => entry.trim()).filter(Boolean));
}

export default function ConfessionScreen() {
  const { loading, error, warnings, moment } = useSpecialMoment('confession');
  const paragraphs = moment ? splitParagraphs(moment.sections) : [];

  return (
    <CoupleBookScreen
      eyebrow="Confession"
      title={moment?.title || 'Confession moment'}
      subtitle={moment?.subtitle || 'A protected private confession chapter for the approved couple session.'}>
      <SectionCard
        title="Confession chapter"
        description="The mobile app now has a native confession route backed by the protected Couple Book document instead of a placeholder shell.">
        <BadgePill tone="accent">{moment?.date || 'Protected date'}</BadgePill>
        <InfoRow label="Status" value={loading ? 'Loading' : moment ? 'Ready' : 'Unavailable'} />
        <InfoRow label="Revision" value={String(moment?.revision || 0)} />
        <InfoRow label="Media slots" value={String(moment?.mediaSlotCount || 0)} />
      </SectionCard>

      <SectionCard
        title="Letter"
        description="The confession copy stays readable in a native format without exposing private local media locations or owner-only tooling.">
        <View style={styles.stack}>
          {paragraphs.length ? (
            paragraphs.map((paragraph) => (
              <ThemedText key={paragraph.slice(0, 60)} type="small" themeColor="textSecondary">
                {paragraph}
              </ThemedText>
            ))
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {loading ? 'Loading the confession letter.' : error || 'This confession chapter is not available yet.'}
            </ThemedText>
          )}
        </View>
      </SectionCard>

      <SectionCard
        title="Companion media"
        description="Owner-only recovery tooling stays outside the mobile build. This route reports the protected media state without exposing the private bridge.">
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
});
