import { exportOptionsSchema, validateWithSchema } from '@/libs/schemas';

// ============ exportOptionsSchema ============

describe('exportOptionsSchema', () => {
  it('accepts both booleans true', () => {
    const result = exportOptionsSchema.safeParse({
      include_empty_lots: true,
      include_expired_lots: true,
    });
    expect(result.success).toBe(true);
    expect(result.data.include_empty_lots).toBe(true);
    expect(result.data.include_expired_lots).toBe(true);
  });

  it('accepts both booleans false', () => {
    const result = exportOptionsSchema.safeParse({
      include_empty_lots: false,
      include_expired_lots: false,
    });
    expect(result.success).toBe(true);
    expect(result.data.include_empty_lots).toBe(false);
    expect(result.data.include_expired_lots).toBe(false);
  });

  it('defaults include_empty_lots to true when omitted', () => {
    const result = exportOptionsSchema.safeParse({ include_expired_lots: false });
    expect(result.success).toBe(true);
    expect(result.data.include_empty_lots).toBe(true);
  });

  it('defaults include_expired_lots to true when omitted', () => {
    const result = exportOptionsSchema.safeParse({ include_empty_lots: false });
    expect(result.success).toBe(true);
    expect(result.data.include_expired_lots).toBe(true);
  });

  it('defaults both fields to true when empty object supplied', () => {
    const result = exportOptionsSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.include_empty_lots).toBe(true);
    expect(result.data.include_expired_lots).toBe(true);
  });

  it('accepts mixed — empty:false, expired:true', () => {
    const result = exportOptionsSchema.safeParse({
      include_empty_lots: false,
      include_expired_lots: true,
    });
    expect(result.success).toBe(true);
    expect(result.data.include_empty_lots).toBe(false);
    expect(result.data.include_expired_lots).toBe(true);
  });

  it('accepts mixed — empty:true, expired:false', () => {
    const result = exportOptionsSchema.safeParse({
      include_empty_lots: true,
      include_expired_lots: false,
    });
    expect(result.success).toBe(true);
    expect(result.data.include_empty_lots).toBe(true);
    expect(result.data.include_expired_lots).toBe(false);
  });

  it('rejects string "true" for include_empty_lots', () => {
    const result = exportOptionsSchema.safeParse({
      include_empty_lots: 'true',
      include_expired_lots: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects number 1 for include_empty_lots', () => {
    const result = exportOptionsSchema.safeParse({
      include_empty_lots: 1,
      include_expired_lots: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects null for include_expired_lots', () => {
    const result = exportOptionsSchema.safeParse({
      include_empty_lots: true,
      include_expired_lots: null,
    });
    expect(result.success).toBe(false);
  });

  it('strips unknown fields', () => {
    const result = exportOptionsSchema.safeParse({
      include_empty_lots: true,
      include_expired_lots: false,
      format: 'xlsx',
      userId: '123',
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('format');
    expect(result.data).not.toHaveProperty('userId');
  });
});

// ============ validateWithSchema with exportOptionsSchema ============

describe('validateWithSchema with exportOptionsSchema', () => {
  it('returns success with defaulted data for empty object', () => {
    const result = validateWithSchema(exportOptionsSchema, {});
    expect(result.success).toBe(true);
    expect(result.data.include_empty_lots).toBe(true);
    expect(result.data.include_expired_lots).toBe(true);
  });

  it('returns success for explicit false values', () => {
    const result = validateWithSchema(exportOptionsSchema, {
      include_empty_lots: false,
      include_expired_lots: false,
    });
    expect(result.success).toBe(true);
    expect(result.data.include_empty_lots).toBe(false);
    expect(result.data.include_expired_lots).toBe(false);
  });

  it('returns errorMessage string for invalid type', () => {
    const result = validateWithSchema(exportOptionsSchema, {
      include_empty_lots: 'yes',
      include_expired_lots: true,
    });
    expect(result.success).toBe(false);
    expect(typeof result.errorMessage).toBe('string');
    expect(result.errorMessage.length).toBeGreaterThan(0);
  });
});
