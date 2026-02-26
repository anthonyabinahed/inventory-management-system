import { updateEmailAlertSchema, validateWithSchema } from '@/libs/schemas';

// ============ updateEmailAlertSchema ============

describe('updateEmailAlertSchema', () => {
  it('accepts valid UUID + true', () => {
    const result = updateEmailAlertSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      receiveEmailAlerts: true,
    });
    expect(result.success).toBe(true);
    expect(result.data.receiveEmailAlerts).toBe(true);
  });

  it('accepts valid UUID + false', () => {
    const result = updateEmailAlertSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      receiveEmailAlerts: false,
    });
    expect(result.success).toBe(true);
    expect(result.data.receiveEmailAlerts).toBe(false);
  });

  it('rejects invalid UUID', () => {
    const result = updateEmailAlertSchema.safeParse({
      userId: 'not-a-uuid',
      receiveEmailAlerts: true,
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Invalid user ID');
  });

  it('rejects missing userId', () => {
    const result = updateEmailAlertSchema.safeParse({
      receiveEmailAlerts: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects string "true" for receiveEmailAlerts', () => {
    const result = updateEmailAlertSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      receiveEmailAlerts: 'true',
    });
    expect(result.success).toBe(false);
  });

  it('rejects number 1 for receiveEmailAlerts', () => {
    const result = updateEmailAlertSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      receiveEmailAlerts: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects null for receiveEmailAlerts', () => {
    const result = updateEmailAlertSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      receiveEmailAlerts: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing receiveEmailAlerts', () => {
    const result = updateEmailAlertSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(false);
  });
});

// ============ validateWithSchema with updateEmailAlertSchema ============

describe('validateWithSchema with updateEmailAlertSchema', () => {
  it('returns success with valid data', () => {
    const result = validateWithSchema(updateEmailAlertSchema, {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      receiveEmailAlerts: true,
    });
    expect(result.success).toBe(true);
    expect(result.data.userId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.data.receiveEmailAlerts).toBe(true);
  });

  it('returns errorMessage for invalid UUID', () => {
    const result = validateWithSchema(updateEmailAlertSchema, {
      userId: 'bad',
      receiveEmailAlerts: true,
    });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Invalid user ID');
  });
});
