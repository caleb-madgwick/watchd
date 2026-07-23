import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { useTheme } from '@/theme/ThemeContext';
import { fontFamily, radius, spacing } from '@/theme/tokens';

export interface TitleFact {
  label: string;
  value?: string;
}

let languageNames: Intl.DisplayNames | undefined;
/** "en" → "English", falling back to the upper-cased code. */
export function languageName(code?: string): string | undefined {
  if (!code) return undefined;
  try {
    if (languageNames === undefined) {
      languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
    }
    return languageNames.of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/** "$185,000,000" — TMDB money figures are USD. */
export function formatMoney(amount?: number): string | undefined {
  if (!amount) return undefined;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "2010-07-15" → "15 July 2010". */
export function formatFullDate(date?: string): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    parsed,
  );
}

/**
 * The spec sheet on the back of the case: hairline-ruled label/value rows.
 * Facts with no value are skipped; the panel hides itself when empty.
 */
export function TitleFacts({ facts }: { facts: TitleFact[] }) {
  const { colors } = useTheme();
  const rows = facts.filter((fact): fact is Required<TitleFact> => !!fact.value);

  if (rows.length === 0) return null;

  return (
    <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {rows.map((fact, index) => (
        <View
          key={fact.label}
          style={[
            styles.row,
            index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
          ]}
        >
          <Text style={[styles.label, { color: colors.textMuted }]}>{fact.label.toUpperCase()}</Text>
          <Text variant="subhead" style={styles.value} numberOfLines={2}>
            {fact.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    maxWidth: 560,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  label: {
    fontFamily: fontFamily.display,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.2,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
