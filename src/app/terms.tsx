import { Stack } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { contentWidth, spacing } from '@/theme/tokens';

/**
 * Public terms of use. Reachable in-app from Settings and, on the static web
 * build, at /terms — a stable URL you can link from the app store listings.
 *
 * Keep this in sync with how the service actually works and with the companion
 * privacy policy at /privacy.
 */

// The public contact address for questions about these terms. Replace with an
// address you own and monitor before submitting to the app stores.
const CONTACT_EMAIL = 'support@videoclub.app';
const EFFECTIVE_DATE = '23 July 2026';
// The jurisdiction whose laws govern these terms. Set to where you operate.
const GOVERNING_LAW = 'Australia';

function Heading({ children }: { children: string }) {
  return (
    <Text variant="title3" style={styles.heading}>
      {children}
    </Text>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="body" color="secondary" style={styles.para}>
      {children}
    </Text>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text variant="body" color="secondary" style={styles.bulletDot}>
        •
      </Text>
      <Text variant="body" color="secondary" style={styles.bulletText}>
        {children}
      </Text>
    </View>
  );
}

function ExternalLink({ label, url }: { label: string; url: string }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(url)}>
      <Text variant="body" color="accent">
        {label}
      </Text>
    </Pressable>
  );
}

export default function TermsOfUseScreen() {
  return (
    <ProfileSubpageShell title="Terms of use">
      <Stack.Screen options={{ title: 'Terms of use — Video Club' }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text variant="caption" color="muted">
          Last updated {EFFECTIVE_DATE}
        </Text>

        <Para>
          These terms are an agreement between you and Video Club. They cover your use of the Video
          Club app on iOS, Android and the web. By creating an account or using the app, you agree to
          these terms. If you don’t agree, please don’t use Video Club.
        </Para>

        <Heading>Who can use Video Club</Heading>
        <Para>
          You must be at least 13 years old (or the minimum age required in your country) to use
          Video Club. By using the app you confirm that you meet this requirement and that the
          information you give us when you sign up is accurate.
        </Para>

        <Heading>Your account</Heading>
        <Para>
          You’re responsible for your account and for keeping your password secure. Don’t share your
          account or let anyone else use it, and let us know promptly if you think someone has
          accessed it without your permission. You’re responsible for the activity that happens under
          your account.
        </Para>

        <Heading>Your content</Heading>
        <Para>
          Video Club lets you post content — reviews, ratings, lists, your profile and other things
          you add. You keep ownership of the content you create. By posting it, you give us
          permission to store, display and share it within the app as needed to run the service (for
          example, showing your public reviews on a film’s page or to people who follow you).
        </Para>
        <Para>
          You’re responsible for what you post, and you confirm you have the right to post it. Please
          only share content you own or are allowed to use.
        </Para>

        <Heading>Community rules</Heading>
        <Para>Video Club is a shared space. When you use it, please don’t:</Para>
        <Bullet>Post reviews with spoilers without marking them as spoilers.</Bullet>
        <Bullet>Harass, threaten, bully or abuse other people.</Bullet>
        <Bullet>Post content that is unlawful, hateful, or sexually explicit.</Bullet>
        <Bullet>Impersonate anyone, or misrepresent who you are or your connection to others.</Bullet>
        <Bullet>Post spam, advertising, or content that infringes someone else’s rights.</Bullet>
        <Bullet>
          Try to break, overload, reverse-engineer or gain unauthorised access to the service.
        </Bullet>
        <Para>
          We may remove content or suspend or terminate accounts that break these rules or put the
          service or its users at risk.
        </Para>

        <Heading>Movie and TV data</Heading>
        <Para>
          This product uses the TMDB API but is not endorsed or certified by TMDB. Movie and TV
          metadata and artwork are supplied by{' '}
          <ExternalLink label="The Movie Database (TMDB)" url="https://www.themoviedb.org/" /> and are
          subject to their terms. The information shown in the app is provided for general reference
          and may not always be accurate or complete.
        </Para>

        <Heading>Your privacy</Heading>
        <Para>
          Your use of Video Club is also governed by our{' '}
          <ExternalLink label="Privacy policy" url="/privacy" />, which explains what data we collect
          and how we use it.
        </Para>

        <Heading>Ending your use</Heading>
        <Para>
          You can stop using Video Club at any time and delete your account from Settings → Account →
          Delete account, which permanently removes your content. We may also suspend or end your
          access if you break these terms or if we stop offering the service.
        </Para>

        <Heading>The service is provided “as is”</Heading>
        <Para>
          Video Club is under active development and is provided on an “as is” and “as available”
          basis, without warranties of any kind. We don’t promise the app will always be available,
          uninterrupted, or free of errors. To the fullest extent allowed by law, we are not liable
          for any indirect or consequential loss arising from your use of the app. Nothing in these
          terms limits any rights you have that cannot be excluded under applicable law, including
          consumer-protection laws.
        </Para>

        <Heading>Changes to these terms</Heading>
        <Para>
          We may update these terms from time to time. When we do, we’ll change the “Last updated”
          date above, and we’ll let you know within the app if the changes are significant. If you
          keep using Video Club after an update, you accept the revised terms.
        </Para>

        <Heading>Governing law</Heading>
        <Para>
          These terms are governed by the laws of {GOVERNING_LAW}, without regard to its conflict of
          laws rules.
        </Para>

        <Heading>Contact us</Heading>
        <Para>
          Questions about these terms? Email us at{' '}
          <ExternalLink label={CONTACT_EMAIL} url={`mailto:${CONTACT_EMAIL}`} />.
        </Para>

        <View style={styles.footerSpace} />
      </ScrollView>
    </ProfileSubpageShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing['6xl'],
    gap: spacing.sm,
    width: '100%',
    maxWidth: contentWidth.prose,
    alignSelf: 'center',
  },
  heading: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxs,
  },
  para: {
    marginBottom: spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  bulletDot: {
    lineHeight: 24,
  },
  bulletText: {
    flex: 1,
  },
  footerSpace: {
    height: spacing['3xl'],
  },
});
