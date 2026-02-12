import {
  reagentSchema,
  reagentUpdateSchema,
  stockInSchema,
  stockOutSchema,
  validateWithSchema,
} from '@/libs/schemas';

// Valid complete reagent data for reuse
const validReagent = {
  name: 'CBC Diluent',
  reference: 'BM0809.075',
  supplier: 'Beckman Coulter',
  category: 'reagent',
  minimum_stock: 5,
  unit: 'vials',
  storage_location: 'Fridge A',
  storage_temperature: '2-8°C',
  sector: 'Hematology',
};

// ============ reagentSchema ============

describe('reagentSchema', () => {
  it('accepts valid complete input', () => {
    const result = reagentSchema.safeParse(validReagent);
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('CBC Diluent');
    expect(result.data.reference).toBe('BM0809.075');
  });

  it('rejects empty name', () => {
    const result = reagentSchema.safeParse({ ...validReagent, name: '' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Name is required');
  });

  it('rejects empty reference', () => {
    const result = reagentSchema.safeParse({ ...validReagent, reference: '' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Reference is required');
  });

  it('rejects empty supplier', () => {
    const result = reagentSchema.safeParse({ ...validReagent, supplier: '' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Supplier is required');
  });

  it('rejects empty storage_location', () => {
    const result = reagentSchema.safeParse({ ...validReagent, storage_location: '' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Storage location is required');
  });

  it('rejects empty storage_temperature', () => {
    const result = reagentSchema.safeParse({ ...validReagent, storage_temperature: '' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Storage temperature is required');
  });

  it('rejects empty sector', () => {
    const result = reagentSchema.safeParse({ ...validReagent, sector: '' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Sector is required');
  });

  it('defaults category to "reagent" when omitted', () => {
    const { category, ...withoutCategory } = validReagent;
    const result = reagentSchema.safeParse(withoutCategory);
    expect(result.success).toBe(true);
    expect(result.data.category).toBe('reagent');
  });

  it('defaults unit to "units" when omitted', () => {
    const { unit, ...withoutUnit } = validReagent;
    const result = reagentSchema.safeParse(withoutUnit);
    expect(result.success).toBe(true);
    expect(result.data.unit).toBe('units');
  });

  it('defaults minimum_stock to 0 when omitted', () => {
    const { minimum_stock, ...withoutMinStock } = validReagent;
    const result = reagentSchema.safeParse(withoutMinStock);
    expect(result.success).toBe(true);
    expect(result.data.minimum_stock).toBe(0);
  });

  it('coerces minimum_stock from string to number', () => {
    const result = reagentSchema.safeParse({ ...validReagent, minimum_stock: '5' });
    expect(result.success).toBe(true);
    expect(result.data.minimum_stock).toBe(5);
  });

  it('rejects negative minimum_stock', () => {
    const result = reagentSchema.safeParse({ ...validReagent, minimum_stock: -1 });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Minimum stock must be 0 or greater');
  });

  it('transforms empty description to null', () => {
    const result = reagentSchema.safeParse({ ...validReagent, description: '' });
    expect(result.success).toBe(true);
    expect(result.data.description).toBeNull();
  });

  it('transforms empty machine to null', () => {
    const result = reagentSchema.safeParse({ ...validReagent, machine: '' });
    expect(result.success).toBe(true);
    expect(result.data.machine).toBeNull();
  });

  it('keeps non-empty description as-is', () => {
    const result = reagentSchema.safeParse({ ...validReagent, description: 'A diluent' });
    expect(result.success).toBe(true);
    expect(result.data.description).toBe('A diluent');
  });

  it('rejects invalid category value', () => {
    const result = reagentSchema.safeParse({ ...validReagent, category: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid category values', () => {
    for (const cat of ['reagent', 'control', 'calibrator', 'consumable', 'solution']) {
      const result = reagentSchema.safeParse({ ...validReagent, category: cat });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid unit value', () => {
    const result = reagentSchema.safeParse({ ...validReagent, unit: 'gallons' });
    expect(result.success).toBe(false);
  });

  it('strips extra fields', () => {
    const result = reagentSchema.safeParse({ ...validReagent, extraField: 'nope', is_active: true });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('extraField');
    expect(result.data).not.toHaveProperty('is_active');
  });
});

// ============ reagentUpdateSchema ============

describe('reagentUpdateSchema', () => {
  it('accepts partial input (only name)', () => {
    const result = reagentUpdateSchema.safeParse({ name: 'Updated Name' });
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('Updated Name');
  });

  it('accepts empty object (all fields optional)', () => {
    const result = reagentUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('still validates provided fields', () => {
    const result = reagentUpdateSchema.safeParse({ minimum_stock: -1 });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Minimum stock must be 0 or greater');
  });

  it('transforms provided empty description to null', () => {
    const result = reagentUpdateSchema.safeParse({ description: '' });
    expect(result.success).toBe(true);
    expect(result.data.description).toBeNull();
  });
});

// ============ stockInSchema ============

describe('stockInSchema', () => {
  const validStockIn = {
    reagent_id: '550e8400-e29b-41d4-a716-446655440000',
    lot_number: 'LOT-001',
    quantity: 10,
  };

  it('accepts valid complete input', () => {
    const result = stockInSchema.safeParse({
      ...validStockIn,
      expiry_date: '2027-06-30',
      date_of_reception: '2026-01-15',
      notes: 'Initial stock',
    });
    expect(result.success).toBe(true);
    expect(result.data.reagent_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.data.quantity).toBe(10);
  });

  it('rejects missing reagent_id', () => {
    const { reagent_id, ...withoutId } = validStockIn;
    const result = stockInSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for reagent_id', () => {
    const result = stockInSchema.safeParse({ ...validStockIn, reagent_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Invalid reagent ID');
  });

  it('rejects empty lot_number', () => {
    const result = stockInSchema.safeParse({ ...validStockIn, lot_number: '' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Lot number is required');
  });

  it('rejects zero quantity', () => {
    const result = stockInSchema.safeParse({ ...validStockIn, quantity: 0 });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Quantity must be greater than 0');
  });

  it('rejects negative quantity', () => {
    const result = stockInSchema.safeParse({ ...validStockIn, quantity: -5 });
    expect(result.success).toBe(false);
  });

  it('coerces quantity from string to number', () => {
    const result = stockInSchema.safeParse({ ...validStockIn, quantity: '10' });
    expect(result.success).toBe(true);
    expect(result.data.quantity).toBe(10);
  });

  it('accepts optional expiry_date and date_of_reception', () => {
    const result = stockInSchema.safeParse(validStockIn);
    expect(result.success).toBe(true);
    expect(result.data.expiry_date).toBeUndefined();
    expect(result.data.date_of_reception).toBeUndefined();
  });

  it('transforms empty notes to undefined', () => {
    const result = stockInSchema.safeParse({ ...validStockIn, notes: '' });
    expect(result.success).toBe(true);
    expect(result.data.notes).toBeUndefined();
  });
});

// ============ stockOutSchema ============

describe('stockOutSchema', () => {
  it('accepts valid quantity', () => {
    const result = stockOutSchema.safeParse({ quantity: 5 });
    expect(result.success).toBe(true);
    expect(result.data.quantity).toBe(5);
  });

  it('rejects zero quantity', () => {
    const result = stockOutSchema.safeParse({ quantity: 0 });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Quantity must be greater than 0');
  });

  it('rejects negative quantity', () => {
    const result = stockOutSchema.safeParse({ quantity: -3 });
    expect(result.success).toBe(false);
  });

  it('coerces quantity from string to number', () => {
    const result = stockOutSchema.safeParse({ quantity: '7' });
    expect(result.success).toBe(true);
    expect(result.data.quantity).toBe(7);
  });

  it('accepts optional notes', () => {
    const result = stockOutSchema.safeParse({ quantity: 5, notes: 'Used for testing' });
    expect(result.success).toBe(true);
    expect(result.data.notes).toBe('Used for testing');
  });

  it('transforms empty notes to undefined', () => {
    const result = stockOutSchema.safeParse({ quantity: 5, notes: '' });
    expect(result.success).toBe(true);
    expect(result.data.notes).toBeUndefined();
  });
});

// ============ validateWithSchema with inventory schemas ============

describe('validateWithSchema with inventory schemas', () => {
  it('returns success with transformed data for valid reagent input', () => {
    const result = validateWithSchema(reagentSchema, validReagent);
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('CBC Diluent');
  });

  it('returns error message for invalid reagent input', () => {
    const result = validateWithSchema(reagentSchema, { name: '' });
    expect(result.success).toBe(false);
    expect(typeof result.errorMessage).toBe('string');
    expect(result.errorMessage.length).toBeGreaterThan(0);
  });
});
