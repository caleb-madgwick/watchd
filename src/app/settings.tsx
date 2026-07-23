import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Avatar } from '@/components/primitives/Avatar';
import { Barcode } from '@/components/Barcode';
import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { Modal } from '@/components/primitives/Modal';
import { Text } from '@/components/primitives/Text';
import { TextInput } from '@/components/primitives/TextInput';
import { FilterChip } from '@/components/primitives/FilterChip';
import { TmdbAttribution } from '@/components/TmdbAttribution';
import { config, limits } from '@/constants/config';
import { ONBOARDING_GENRES } from '@/constants/genres';
import { pickAndUploadAvatar, updateProfile } from '@/features/profile/api';
import { ProfileSubpageShell } from '@/features/profile/ProfileSubpageShell';
import { useBlockedUsers, useToggleBlock, type BlockedUser } from '@/features/social/blocks';
import { track } from '@/lib/analytics';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing, contentWidth } from '@/theme/tokens';
import type { NotificationPrefs } from '@/types/database';

const NOTIFICATION_OPTIONS: { key: keyof NotificationPrefs; label: string; caption: string }[] = [
  { key: 'new_followers', label: 'New followers', caption: 'When someone follows you' },
  { key: 'review_likes', label: 'Likes', caption: 'When someone likes your reviews, lists or diary' },
  { key: 'comments', label: 'Comments', caption: 'When someone comments or replies to you' },
  { key: 'friend_activity', label: 'Friend activity', caption: 'Friend requests and shared watchlists' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text variant="micro" color="muted" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function BlockedRow({ user }: { user: BlockedUser }) {
  const toggle = useToggleBlock(user.id);
  return (
    <View style={styles.blockedRow}>
      <Avatar url={user.avatarUrl} name={user.displayName} size={34} />
      <View style={styles.blockedText}>
        <Text variant="callout" numberOfLines={1}>
          {user.displayName}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          @{user.username}
        </Text>
      </View>
      <Button
        title="Unblock"
        variant="secondary"
        size="sm"
        loading={toggle.isPending}
        onPress={() => toggle.mutate(false)}
      />
    </View>
  );
}

function BlockedAccountsSection() {
  const blocked = useBlockedUsers();
  if (config.demoMode || !blocked.data || blocked.data.length === 0) return null;
  return (
    <Section title="Blocked accounts">
      {blocked.data.map((user) => (
        <BlockedRow key={user.id} user={user} />
      ))}
    </Section>
  );
}

export default function SettingsScreen() {
  const { session, profile, signOut, refreshProfile } = useAuth();
  const { colors } = useTheme();

  const [displayName, setDisplayName] = useState(
    profile?.displayName === profile?.username ? '' : (profile?.displayName ?? ''),
  );
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [genres, setGenres] = useState<number[]>(profile?.favouriteGenres ?? []);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(
    profile?.notificationPrefs ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (config.demoMode || !session || !profile) {
    return (
      <ProfileSubpageShell title="Settings">
        <EmptyState
          icon="settings-outline"
          title="No account settings in demo mode"
          message="Connect Supabase and sign in to manage your profile."
        />
      </ProfileSubpageShell>
    );
  }

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(session.user.id, {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        favourite_genres: genres,
      });
      await refreshProfile();
      toast.success('Profile updated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const path = await pickAndUploadAvatar(session.user.id, profile.avatarPath);
      if (path) {
        await updateProfile(session.user.id, { avatar_path: path });
        await refreshProfile();
        toast.success('Photo updated.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Avatar upload failed.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const deleteAccount = async () => {
    if (!supabase) return;
    setDeleting(true);
    const { error } = await supabase.rpc('delete_account');
    if (error) {
      setDeleting(false);
      toast.error('Could not delete the account. Try again or contact support.');
      return;
    }
    track('account_deleted');
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  const toggleGenre = (id: number) =>
    setGenres((current) =>
      current.includes(id)
        ? current.filter((g) => g !== id)
        : current.length >= 10
          ? current
          : [...current, id],
    );

  const toggleNotification = async (key: keyof NotificationPrefs, value: boolean) => {
    const previous = notificationPrefs;
    const next: NotificationPrefs = {
      new_followers: previous.new_followers ?? true,
      review_likes: previous.review_likes ?? true,
      friend_activity: previous.friend_activity ?? true,
      [key]: value,
    };
    setNotificationPrefs(next);
    try {
      await updateProfile(session.user.id, { notification_prefs: next });
    } catch (e) {
      setNotificationPrefs(previous);
      toast.error(e instanceof Error ? e.message : 'Could not save that preference.');
    }
  };

  return (
    <ProfileSubpageShell title="Settings" subtitle={`@${profile.username}`}>
      <Stack.Screen options={{ title: 'Settings — Video Club' }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Section title="Profile">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            onPress={changeAvatar}
            style={styles.avatarRow}
          >
            <Avatar url={profile.avatarUrl} name={profile.displayName} size={56} />
            <View style={styles.avatarText}>
              <Text variant="headline">Profile photo</Text>
              <Text variant="footnote" style={{ color: colors.accent }}>
                {uploadingAvatar ? 'Uploading…' : 'Change photo'}
              </Text>
            </View>
          </Pressable>
          <TextInput
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={limits.displayNameMax}
            placeholder={profile.username}
          />
          <TextInput
            label="Bio"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={limits.bioMax}
            hint={`${bio.length}/${limits.bioMax}`}
          />
        </Section>

        <Section title="Favourite genres">
          <View style={styles.chips}>
            {ONBOARDING_GENRES.map((genre) => (
              <FilterChip
                key={genre.id}
                label={genre.name}
                selected={genres.includes(genre.id)}
                onPress={() => toggleGenre(genre.id)}
              />
            ))}
          </View>
        </Section>

        <Button title="Save changes" fullWidth loading={saving} onPress={saveProfile} />

        <Section title="Notifications">
          {NOTIFICATION_OPTIONS.map((option) => (
            <View key={option.key} style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text variant="callout">{option.label}</Text>
                <Text variant="caption" color="muted">
                  {option.caption}
                </Text>
              </View>
              <Switch
                value={notificationPrefs[option.key] ?? true}
                onValueChange={(value) => toggleNotification(option.key, value)}
                trackColor={{ false: colors.surfaceHigh, true: colors.accent }}
                thumbColor="#FFFFFF"
                accessibilityLabel={`${option.label} notifications`}
              />
            </View>
          ))}
          <Text variant="footnote" color="muted">
            These control your in-app notifications. Push delivery arrives on device once enabled.
          </Text>
        </Section>

        <BlockedAccountsSection />

        <Section title="Data">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/import')}
            style={styles.linkRow}
          >
            <Text variant="callout">Import from Letterboxd</Text>
            <Text variant="caption" color="muted">
              Bring your films, ratings and diary across
            </Text>
          </Pressable>
        </Section>

        <Section title="Privacy & legal">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/privacy')}
            style={styles.linkRow}
          >
            <Text variant="callout">Privacy policy</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/terms')}
            style={styles.linkRow}
          >
            <Text variant="callout">Terms of use</Text>
          </Pressable>
          <TmdbAttribution compact />
        </Section>

        <Section title="Account">
          <Button
            title="Sign out"
            variant="secondary"
            fullWidth
            icon="log-out-outline"
            onPress={async () => {
              await signOut();
              router.replace('/(auth)/sign-in');
            }}
          />
          <Button
            title="Delete account"
            variant="outline"
            fullWidth
            icon="trash-outline"
            onPress={() => setConfirmDelete(true)}
          />
        </Section>

        <View style={styles.memberFooter}>
          <Barcode
            seed={profile.username}
            height={20}
            color={colors.textMuted}
            label="VIDEO CLUB · MEMBER SYSTEM"
          />
        </View>
      </ScrollView>

      <Modal visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete your account?">
        <View style={styles.modalBody}>
          <Text variant="callout" color="secondary">
            This permanently deletes your profile, ratings, reviews, lists and follows. There is no
            undo.
          </Text>
          <Button
            title="Delete everything"
            variant="danger"
            fullWidth
            loading={deleting}
            onPress={deleteAccount}
          />
          <Button title="Cancel" variant="ghost" fullWidth onPress={() => setConfirmDelete(false)} />
        </View>
      </Modal>
    </ProfileSubpageShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing['6xl'],
    gap: spacing.xl,
    width: '100%',
    maxWidth: contentWidth.prose,
    alignSelf: 'center',
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    marginLeft: spacing.xs,
  },
  sectionCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarText: {
    gap: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchLabel: {
    flex: 1,
    gap: 1,
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  blockedText: {
    flex: 1,
    gap: 1,
  },
  linkRow: {
    paddingVertical: spacing.xs,
  },
  modalBody: {
    gap: spacing.md,
  },
  memberFooter: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
});
