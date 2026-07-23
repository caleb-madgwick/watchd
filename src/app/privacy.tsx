import { Stack } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { contentWidth, spacing } from '@/theme/tokens';

/**
 * Public privacy policy. Reachable in-app from Settings and, on the static web
 * build, at /privacy — the stable URL App Store Connect and Google Play require
 * for the store listings.
 *
 * Keep this in sync with what the app actually does: if you add a third-party
 * SDK, analytics provider, ads, or start collecting a new field, update this.
 */

// The public contact address for privacy requests. Replace with an address you
// own and monitor before submitting to the app stores.
const CONTACT_EMAIL = 'privacy@videoclub.app';
const EFFECTIVE_DATE = '23 July 2026';

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

export default function PrivacyPolicyScreen() {
  return (
    <ProfileSubpageShell title="Privacy policy">
      <Stack.Screen options={{ title: 'Privacy policy — Video Club' }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text variant="caption" color="muted">
          Last updated {EFFECTIVE_DATE}
        </Text>

        <Para>
          Video Club is a social tracker for movies and TV. This policy explains what information we
          collect when you use the app on iOS, Android or the web, why we collect it, who we share it
          with, and the choices you have. We only collect what the app needs to work — we don’t sell
          your data and we don’t run ads.
        </Para>

        <Heading>Who we are</Heading>
        <Para>
          Video Club (“Video Club”, “we”, “us”) provides this app. If you have any questions about
          this policy or your data, contact us at{' '}
          <ExternalLink label={CONTACT_EMAIL} url={`mailto:${CONTACT_EMAIL}`} />.
        </Para>

        <Heading>Information you give us</Heading>
        <Para>When you create an account and use Video Club, we store:</Para>
        <Bullet>
          <Text variant="body" color="primary">
            Account details:
          </Text>{' '}
          your email address and password (handled by our authentication provider), and your chosen
          username.
        </Bullet>
        <Bullet>
          <Text variant="body" color="primary">
            Profile:
          </Text>{' '}
          your display name, bio, profile photo and favourite genres — whatever you choose to add.
        </Bullet>
        <Bullet>
          <Text variant="body" color="primary">
            Your activity:
          </Text>{' '}
          the movies and shows you mark as watched or add to your watchlist, your ratings, reviews,
          TV progress, the lists you build, and your notification preferences.
        </Bullet>
        <Bullet>
          <Text variant="body" color="primary">
            Your connections:
          </Text>{' '}
          who you follow, your friends and friend requests, and the shared watchlists you create or
          are invited to.
        </Bullet>

        <Heading>Information collected automatically</Heading>
        <Para>
          To run and secure the service, our hosting provider processes basic technical data such as
          your IP address, device or browser type, and the time of your requests. We use this to
          operate the app, keep it secure, and diagnose problems. We do not use it for advertising or
          to track you across other apps and websites.
        </Para>
        <Para>
          During development the app logs anonymous, in-app usage events (for example, “a review was
          submitted”) to help us understand which features are used. These events are limited to
          identifiers and coarse metadata — the text of your reviews and other content is never
          included — and are not shared with third-party analytics or advertising networks.
        </Para>

        <Heading>How we use your information</Heading>
        <Bullet>To create and manage your account and let you sign in.</Bullet>
        <Bullet>
          To provide the core features: tracking what you watch, rating and reviewing, building
          lists, following people, and sharing watchlists.
        </Bullet>
        <Bullet>To show your profile, reviews and lists to others according to your settings.</Bullet>
        <Bullet>To keep the service secure, prevent abuse, and fix problems.</Bullet>
        <Bullet>To respond to you when you contact us.</Bullet>

        <Heading>What other people can see</Heading>
        <Para>
          Video Club is social by design. Your profile, your reviews and ratings, and any lists you
          mark as public can be seen by other people using the app. Lists you mark as private, and
          the members of a shared watchlist, are limited to the people you choose. You control what
          you post, and you can edit or delete your content, or delete your whole account, at any
          time from Settings.
        </Para>

        <Heading>Who we share data with</Heading>
        <Para>
          We do not sell your personal information. We share it only with the service providers we
          rely on to run the app:
        </Para>
        <Bullet>
          <Text variant="body" color="primary">
            Supabase
          </Text>{' '}
          hosts our database, authentication and file storage. Your account and activity data are
          stored there on our behalf.
        </Bullet>
        <Bullet>
          <Text variant="body" color="primary">
            The Movie Database (TMDB)
          </Text>{' '}
          supplies the movie and TV information, artwork and search results shown in the app. Where
          possible these requests are routed through our own server so your device does not contact
          TMDB directly.
        </Bullet>
        <Para>
          We may also disclose information if required by law, or to protect the rights, safety and
          security of our users and the service.
        </Para>

        <Heading>Movie and TV data</Heading>
        <Para>
          This product uses the TMDB API but is not endorsed or certified by TMDB. Movie and TV
          metadata and artwork are supplied by{' '}
          <ExternalLink label="The Movie Database (TMDB)" url="https://www.themoviedb.org/" />.
        </Para>

        <Heading>Where your data is stored</Heading>
        <Para>
          Your data is stored by Supabase on servers located in Japan. If you use Video Club from
          another country, your information will be transferred to and processed there. We take
          reasonable steps to ensure it remains protected wherever it is handled.
        </Para>

        <Heading>Keeping and deleting your data</Heading>
        <Para>
          We keep your information for as long as your account is active. You can delete your account
          at any time from Settings → Account → Delete account. Deleting your account permanently
          removes your profile, ratings, reviews, lists and follows — there is no undo. Some limited
          records may be retained where we are required to keep them by law or to resolve disputes.
        </Para>

        <Heading>Your rights and choices</Heading>
        <Para>
          You can access and update your profile, and delete your content or account, directly in the
          app. Depending on where you live, you may also have the right to request a copy of your
          data, ask us to correct or delete it, or object to certain processing — for example under
          the EU/UK GDPR, the California Consumer Privacy Act, or the Australian Privacy Principles.
          To make a request, contact us at{' '}
          <ExternalLink label={CONTACT_EMAIL} url={`mailto:${CONTACT_EMAIL}`} />. We will not
          discriminate against you for exercising these rights.
        </Para>

        <Heading>Security</Heading>
        <Para>
          We protect your data with measures including encrypted connections, hashed passwords, and
          row-level access rules so that people can only reach the data they are allowed to see. No
          system is perfectly secure, but we work to keep your information safe.
        </Para>

        <Heading>Children</Heading>
        <Para>
          Video Club is not intended for children under 13 (or the minimum age required in your
          country). We do not knowingly collect personal information from children. If you believe a
          child has provided us with personal information, please contact us and we will delete it.
        </Para>

        <Heading>Changes to this policy</Heading>
        <Para>
          We may update this policy from time to time. When we do, we will change the “Last updated”
          date above, and we will let you know within the app if the changes are significant.
        </Para>

        <Heading>Contact us</Heading>
        <Para>
          Questions or requests about your privacy? Email us at{' '}
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
