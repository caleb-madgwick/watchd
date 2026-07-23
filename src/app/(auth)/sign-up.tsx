import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router, Stack } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { Text } from '@/components/primitives/Text';
import { TextInput } from '@/components/primitives/TextInput';
import { track } from '@/lib/analytics';
import { signUpSchema, type SignUpValues } from '@/features/auth/validation';
import { supabase } from '@/lib/supabase/client';
import { spacing } from '@/theme/tokens';

export default function SignUpScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!supabase) return;
    setSubmitting(true);
    setFormError(null);
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });
    setSubmitting(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    track('registration_completed');
    if (data.session) {
      // Email confirmation disabled: straight into onboarding.
      router.replace('/onboarding/username');
    } else {
      setAwaitingConfirmation(true);
    }
  });

  if (awaitingConfirmation) {
    return (
      <View style={styles.container}>
        <Text variant="title2">Check your email</Text>
        <Text variant="callout" color="secondary">
          We sent a confirmation link to your inbox. Once confirmed, sign in to finish setting up
          your profile.
        </Text>
        <Button title="Back to sign in" fullWidth onPress={() => router.replace('/(auth)/sign-in')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Create account — Video Club' }} />
      <Text variant="title2">Create your account</Text>
      <Text variant="callout" color="secondary" style={styles.subtitle}>
        A home for everything you watch.
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
              textContentType="emailAddress"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Password"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
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
          <Text variant="footnote" color="danger" accessibilityLiveRegion="polite">
            {formError}
          </Text>
        ) : null}
        <Button title="Create account" fullWidth size="lg" loading={submitting} onPress={onSubmit} />
      </View>

      <View style={styles.footer}>
        <Text variant="subhead" color="secondary">
          Already have an account?{' '}
        </Text>
        <Link href="/(auth)/sign-in" asChild>
          <Text variant="subhead" color="accent" accessibilityRole="link">
            Sign in
          </Text>
        </Link>
      </View>
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing['2xl'],
  },
});
