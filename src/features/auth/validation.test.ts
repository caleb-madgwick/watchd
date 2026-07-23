import { signUpSchema, usernameSchema } from './validation';

describe('usernameSchema', () => {
  it('accepts valid usernames', () => {
    expect(usernameSchema.safeParse('ava_film').success).toBe(true);
    expect(usernameSchema.safeParse('ABC').success).toBe(true);
    expect(usernameSchema.safeParse('a1234567890123456789').success).toBe(true);
  });

  it('rejects invalid usernames', () => {
    expect(usernameSchema.safeParse('ab').success).toBe(false); // too short
    expect(usernameSchema.safeParse('a'.repeat(21)).success).toBe(false); // too long
    expect(usernameSchema.safeParse('has space').success).toBe(false);
    expect(usernameSchema.safeParse('émile').success).toBe(false);
    expect(usernameSchema.safeParse('semi;colon').success).toBe(false);
  });

  it('trims surrounding whitespace before validating', () => {
    const result = usernameSchema.safeParse('  valid_name  ');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('valid_name');
  });
});

describe('signUpSchema', () => {
  it('requires matching passwords', () => {
    const result = signUpSchema.safeParse({
      email: 'a@b.co',
      password: 'longenough',
      confirmPassword: 'different',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid signup', () => {
    expect(
      signUpSchema.safeParse({
        email: 'a@b.co',
        password: 'longenough',
        confirmPassword: 'longenough',
      }).success,
    ).toBe(true);
  });

  it('rejects short passwords and bad emails', () => {
    expect(
      signUpSchema.safeParse({ email: 'a@b.co', password: 'short', confirmPassword: 'short' })
        .success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({ email: 'not-an-email', password: 'longenough', confirmPassword: 'longenough' })
        .success,
    ).toBe(false);
  });
});
