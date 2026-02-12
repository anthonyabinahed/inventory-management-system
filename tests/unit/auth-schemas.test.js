import {
  loginSchema,
  setPasswordSchema,
  passwordSchema,
  forgotPasswordSchema,
  inviteUserSchema,
  updateUserRoleSchema,
  validateWithSchema,
} from '@/libs/schemas';

// ============ loginSchema ============

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret123' });
    expect(result.success).toBe(true);
    expect(result.data.email).toBe('user@example.com');
    expect(result.data.password).toBe('secret123');
  });

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret123' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Invalid email address');
  });

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Password is required');
  });

  it('strips extra fields', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret123',
      isAdmin: true,
      role: 'admin',
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('isAdmin');
    expect(result.data).not.toHaveProperty('role');
  });
});

// ============ setPasswordSchema ============

describe('setPasswordSchema', () => {
  it('accepts matching passwords >= 8 characters', () => {
    const result = setPasswordSchema.safeParse({
      password: 'MyStr0ng!',
      confirmPassword: 'MyStr0ng!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = setPasswordSchema.safeParse({
      password: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((e) => e.message);
    expect(messages).toContain('Password must be at least 8 characters');
  });

  it('rejects mismatched passwords', () => {
    const result = setPasswordSchema.safeParse({
      password: 'Password123',
      confirmPassword: 'Different456',
    });
    expect(result.success).toBe(false);
    const confirmError = result.error.issues.find((e) => e.path.includes('confirmPassword'));
    expect(confirmError.message).toBe('Passwords do not match');
  });

  it('rejects when both too short and mismatched', () => {
    const result = setPasswordSchema.safeParse({
      password: 'short',
      confirmPassword: 'diff',
    });
    expect(result.success).toBe(false);
    // Should have errors for being too short
    const messages = result.error.issues.map((e) => e.message);
    expect(messages).toContain('Password must be at least 8 characters');
  });
});

// ============ passwordSchema (server-side) ============

describe('passwordSchema', () => {
  it('accepts 8+ character string', () => {
    const result = passwordSchema.safeParse('ValidPass1');
    expect(result.success).toBe(true);
    expect(result.data).toBe('ValidPass1');
  });

  it('rejects 7 character string', () => {
    const result = passwordSchema.safeParse('7chars!');
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
  });

  it('rejects empty string', () => {
    const result = passwordSchema.safeParse('');
    expect(result.success).toBe(false);
  });
});

// ============ forgotPasswordSchema ============

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'bad-email' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Invalid email address');
  });
});

// ============ inviteUserSchema ============

describe('inviteUserSchema', () => {
  it('accepts email + fullName, defaults role to "user"', () => {
    const result = inviteUserSchema.safeParse({
      email: 'new@company.com',
      fullName: 'Jane Doe',
    });
    expect(result.success).toBe(true);
    expect(result.data.role).toBe('user');
  });

  it('accepts explicit admin role', () => {
    const result = inviteUserSchema.safeParse({
      email: 'admin@company.com',
      fullName: 'Admin User',
      role: 'admin',
    });
    expect(result.success).toBe(true);
    expect(result.data.role).toBe('admin');
  });

  it('rejects missing fullName', () => {
    const result = inviteUserSchema.safeParse({
      email: 'new@company.com',
      fullName: '',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Full name is required');
  });

  it('rejects invalid email', () => {
    const result = inviteUserSchema.safeParse({
      email: 'not-valid',
      fullName: 'Jane Doe',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Invalid email address');
  });

  it('rejects invalid role', () => {
    const result = inviteUserSchema.safeParse({
      email: 'new@company.com',
      fullName: 'Jane Doe',
      role: 'superadmin',
    });
    expect(result.success).toBe(false);
    expect(result.success).toBe(false);
  });
});

// ============ updateUserRoleSchema ============

describe('updateUserRoleSchema', () => {
  it('accepts valid UUID + valid role', () => {
    const result = updateUserRoleSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'admin',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = updateUserRoleSchema.safeParse({
      userId: 'not-a-uuid',
      role: 'admin',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Invalid user ID');
  });

  it('rejects invalid role', () => {
    const result = updateUserRoleSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'moderator',
    });
    expect(result.success).toBe(false);
  });
});

// ============ validateWithSchema ============

describe('validateWithSchema', () => {
  it('returns success with transformed data on valid input', () => {
    const result = validateWithSchema(loginSchema, {
      email: 'user@example.com',
      password: 'test123',
    });
    expect(result.success).toBe(true);
    expect(result.data.email).toBe('user@example.com');
  });

  it('returns first error message on invalid input', () => {
    const result = validateWithSchema(loginSchema, {
      email: 'bad-email',
      password: '',
    });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Invalid email address');
  });

  it('returns first error when multiple fields invalid', () => {
    const result = validateWithSchema(loginSchema, { email: '', password: '' });
    expect(result.success).toBe(false);
    expect(typeof result.errorMessage).toBe('string');
    expect(result.errorMessage.length).toBeGreaterThan(0);
  });
});
