import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/primitives/Avatar';
import { Text } from '@/components/primitives/Text';
import { TextInput } from '@/components/primitives/TextInput';
import { limits } from '@/constants/config';
import { OnboardingShell } from '@/features/onboarding/OnboardingShell';
import { profileDetailsSchema, type ProfileDetailsValues } from '@/features/auth/validation';
import { pickAndUploadAvatar, updateProfile } from '@/features/profile/api';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/stores/toastStore';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';

export default function ProfileStep() {
  const { session, profile, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileDetailsValues>({
    resolver: zodResolver(profileDetailsSchema),
    defaultValues: {
      displayName: profile?.displayName === profile?.username ? '' : (profile?.displayName ?? ''),
      bio: profile?.bio ?? '',
    },
  });

  const onPickAvatar = async () => {
    if (!session || uploadingAvatar) return;
    setUploadingAvatar(true);
    try {
      const path = await pickAndUploadAvatar(session.user.id, profile?.avatarPath ?? null);
      if (path) {
        await updateProfile(session.user.id, { avatar_path: path });
        await refreshProfile();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Avatar upload failed.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onContinue = handleSubmit(async (values) => {
    if (!session) return;
    setSaving(true);
    try {
      await updateProfile(session.user.id, {
        display_name: values.displayName.trim() || null,
        bio: values.bio.trim() || null,
      });
      await refreshProfile();
      router.push('/onboarding/genres');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  });

  return (
    <OnboardingShell
      step={2}
      title="Set up your profile"
      subtitle="All of this is optional — you can fill it in any time."
      actionTitle="Continue"
      onAction={onContinue}
      actionLoading={saving}
      onSkip={() => router.push('/onboarding/genres')}
    >
      <View style={styles.body}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose profile photo"
          accessibilityState={{ busy: uploadingAvatar }}
          onPress={onPickAvatar}
          style={styles.avatarRow}
        >
          <Avatar url={profile?.avatarUrl} name={profile?.displayName ?? 'You'} size={72} />
          <View style={styles.avatarText}>
            <Text variant="headline">Profile photo</Text>
            <Text variant="footnote" style={{ color: colors.accent }}>
              {uploadingAvatar ? 'Uploading…' : profile?.avatarUrl ? 'Change photo' : 'Choose photo'}
            </Text>
          </View>
        </Pressable>

        <Controller
          control={control}
          name="displayName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Display name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              maxLength={limits.displayNameMax}
              error={errors.displayName?.message}
              placeholder="How your name appears"
            />
          )}
        />
        <Controller
          control={control}
          name="bio"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Bio"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              maxLength={limits.bioMax}
              error={errors.bio?.message}
              placeholder="A line or two about your taste"
              hint={`${value.length}/${limits.bioMax}`}
            />
          )}
        />
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.xl,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatarText: {
    gap: 2,
  },
});
