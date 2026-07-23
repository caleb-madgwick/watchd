import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router, Stack } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives/Button';
import { Text } from '@/components/primitives/Text';
import { TextInput } from '@/components/primitives/TextInput';
import { config } from '@/constants/config';
import { signInSchema, type SignInValues } from '@/features/auth/validation';
import { supabase } from '@/lib/supabase/client';
import { spacing } from '@/theme/tokens';

export default function SignInScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!supabase) return;
    setSubmitting(true);
    setFormError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setSubmitting(false);
    if (error) {
      setFormError(
        error.message === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : error.message,
      );
      return;
    }
    router.replace('/');
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Sign in — Video Club' }} />
      <Text variant="title2">Welcome back</Text>
      <Text variant="callout" color="secondary" style={styles.subtitle}>
        Track what you watch. Share what you love.
      </Text>

      {config.demoMode ? (
        <View style={styles.demoNotice}>
          <Text variant="subhead" color="secondary">
            No backend configured — accounts are disabled. Copy .env.example to .env with your
            Supabase keys, or browse in demo mode.
          </Text>
          <Button
            title="Browse in demo mode"
            variant="secondary"
            fullWidth
            onPress={() => router.replace('/(tabs)/home')}
          />
        </View>
      ) : (
        <>
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
                  autoComplete="current-password"
                  textContentType="password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  onSubmitEditing={onSubmit}
                />
              )}
            />
            {formError ? (
              <Text variant="footnote" color="danger" accessibilityLiveRegion="polite">
                {formError}
              </Text>
            ) : null}
            <Button title="Sign in" fullWidth size="lg" loading={submitting} onPress={onSubmit} />
          </View>

          <Link href="/(auth)/forgot-password" asChild>
            <Text variant="subhead" color="accent" style={styles.link} accessibilityRole="link">
              Forgot your password?
            </Text>
          </Link>
          <View style={styles.footer}>
            <Text variant="subhead" color="secondary">
              New to Video Club?{' '}
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Text variant="subhead" color="accent" accessibilityRole="link">
                Create an account
              </Text>
            </Link>
          </View>
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
  demoNotice: {
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  link: {
    marginTop: spacing.md,
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing['2xl'],
  },
});
