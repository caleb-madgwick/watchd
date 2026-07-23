import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { Screen } from '@/components/primitives/Screen';
import { Text } from '@/components/primitives/Text';
import { TextInput } from '@/components/primitives/TextInput';
import { Wordmark } from '@/components/Wordmark';
import { resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/validation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme/tokens';

/**
 * Destination of the password-recovery email link (web). Supabase establishes
 * a recovery session from the URL; from there the user sets a new password.
 */
export default function ResetPasswordScreen() {
  const { session, initializing } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!supabase) return;
    setSubmitting(true);
    setFormError(null);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setSubmitting(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setDone(true);
  });

  return (
    <Screen padTop padBottom>
      <Stack.Screen options={{ title: 'Choose a new password — Watchd' }} />
      <View style={styles.container}>
        <View style={styles.brand}>
          <Wordmark size={36} />
        </View>
        {done ? (
          <>
            <Text variant="title2">Password updated</Text>
            <Text variant="callout" color="secondary">
              You’re all set. Continue to Watchd.
            </Text>
            <Button title="Continue" fullWidth size="lg" onPress={() => router.replace('/')} />
          </>
        ) : !initializing && !session ? (
          <>
            <Text variant="title2">Link expired</Text>
            <Text variant="callout" color="secondary">
              This reset link is invalid or has expired. Request a new one from the sign-in screen.
            </Text>
            <Button
              title="Back to sign in"
              fullWidth
              onPress={() => router.replace('/(auth)/forgot-password')}
            />
          </>
        ) : (
          <>
            <Text variant="title2">Choose a new password</Text>
            <View style={styles.form}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="New password"
                    secureTextEntry
                    autoComplete="new-password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    hint="At least 8 characters"
                  />
                )}
              />
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Confirm password"
                    secureTextEntry
                    autoComplete="new-password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.confirmPassword?.message}
                    onSubmitEditing={onSubmit}
                  />
                )}
              />
              {formError ? (
                <Text variant="footnote" color="danger">
                  {formError}
                </Text>
              ) : null}
              <Button
                title="Update password"
                fullWidth
                size="lg"
                loading={submitting}
                onPress={onSubmit}
              />
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.lg,
  },
});
