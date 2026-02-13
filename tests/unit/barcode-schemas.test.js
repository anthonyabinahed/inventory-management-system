import { addLabelSchema, qrPayloadSchema } from '@/libs/schemas';

// ============ addLabelSchema ============

describe('addLabelSchema', () => {
  it('accepts valid input', () => {
    const result = addLabelSchema.safeParse({
      lot_number: 'LOT-001',
      expiry_date: '2027-06-30',
      quantity: 5,
    });
    expect(result.success).toBe(true);
    expect(result.data.lot_number).toBe('LOT-001');
    expect(result.data.quantity).toBe(5);
  });

  it('defaults quantity to 1', () => {
    const result = addLabelSchema.safeParse({
      lot_number: 'LOT-001',
    });
    expect(result.success).toBe(true);
    expect(result.data.quantity).toBe(1);
  });

  it('rejects empty lot_number', () => {
    const result = addLabelSchema.safeParse({
      lot_number: '',
      quantity: 1,
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Lot number is required');
  });

  it('rejects quantity less than 1', () => {
    const result = addLabelSchema.safeParse({
      lot_number: 'LOT-001',
      quantity: 0,
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('At least 1 label required');
  });

  it('rejects quantity greater than 384', () => {
    const result = addLabelSchema.safeParse({
      lot_number: 'LOT-001',
      quantity: 385,
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Maximum 384 labels per entry');
  });

  it('accepts quantity of exactly 384', () => {
    const result = addLabelSchema.safeParse({
      lot_number: 'LOT-001',
      quantity: 384,
    });
    expect(result.success).toBe(true);
    expect(result.data.quantity).toBe(384);
  });

  it('coerces quantity from string to number', () => {
    const result = addLabelSchema.safeParse({
      lot_number: 'LOT-001',
      quantity: '10',
    });
    expect(result.success).toBe(true);
    expect(result.data.quantity).toBe(10);
  });

  it('accepts optional expiry_date', () => {
    const result = addLabelSchema.safeParse({
      lot_number: 'LOT-001',
      quantity: 1,
    });
    expect(result.success).toBe(true);
    expect(result.data.expiry_date).toBeUndefined();
  });
});

// ============ qrPayloadSchema ============

describe('qrPayloadSchema', () => {
  it('accepts valid payload', () => {
    const result = qrPayloadSchema.safeParse({
      reagent_id: '550e8400-e29b-41d4-a716-446655440000',
      lot_number: 'LOT-001',
      expiry_date: '2027-06-30',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null expiry_date', () => {
    const result = qrPayloadSchema.safeParse({
      reagent_id: '550e8400-e29b-41d4-a716-446655440000',
      lot_number: 'LOT-001',
      expiry_date: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for reagent_id', () => {
    const result = qrPayloadSchema.safeParse({
      reagent_id: 'not-a-uuid',
      lot_number: 'LOT-001',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Invalid reagent ID in QR code');
  });

  it('rejects empty lot_number', () => {
    const result = qrPayloadSchema.safeParse({
      reagent_id: '550e8400-e29b-41d4-a716-446655440000',
      lot_number: '',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Lot number is required');
  });
});
