import { z } from 'zod';

import { limits } from '@/constants/config';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

export const usernameSchema = z
  .string()
  .trim()
  .min(limits.usernameMin, `At least ${limits.usernameMin} characters`)
  .max(limits.usernameMax, `At most ${limits.usernameMax} characters`)
  .regex(/^[A-Za-z0-9_]+$/, 'Letters, numbers and underscores only');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const profileDetailsSchema = z.object({
  displayName: z.string().trim().max(limits.displayNameMax, `At most ${limits.displayNameMax} characters`),
  bio: z.string().trim().max(limits.bioMax, `At most ${limits.bioMax} characters`),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ProfileDetailsValues = z.infer<typeof profileDetailsSchema>;
