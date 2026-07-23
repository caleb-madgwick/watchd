import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Stack } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { Text } from '@/components/primitives/Text';
import { TextInput } from '@/components/primitives/TextInput';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/validation';
import { supabase } from '@/lib/supabase/client';
import { spacing } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!supabase) return;
    setSubmitting(true);
    setFormError(null);
    // The recovery link lands on the web app, which shows the reset screen.
    const redirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, { redirectTo });
    setSubmitting(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setSent(true);
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Reset password — Watchd' }} />
      <Text variant="title2">Reset your password</Text>
      {sent ? (
        <>
          <Text variant="callout" color="secondary">
            If an account exists for that email, a reset link is on its way. Open it to choose a
            new password.
          </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Text variant="subhead" color="accent" style={styles.link} accessibilityRole="link">
              Back to sign in
            </Text>
          </Link>
        </>
      ) : (
        <>
          <Text variant="callout" color="secondary" style={styles.subtitle}>
            Enter your email and we’ll send you a reset link.
          </Text>
          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Email"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  onSubmitEditing={onSubmit}
                />
              )}
            />
            {formError ? (
              <Text variant="footnote" color="danger">
                {formError}
              </Text>
            ) : null}
            <Button title="Send reset link" fullWidth size="lg" loading={submitting} onPress={onSubmit} />
          </View>
          <Link href="/(auth)/sign-in" asChild>
            <Text variant="subhead" color="accent" style={styles.link} accessibilityRole="link">
              Back to sign in
            </Text>
          </Link>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.lg,
  },
  link: {
    marginTop: spacing.lg,
    alignSelf: 'center',
  },
});
