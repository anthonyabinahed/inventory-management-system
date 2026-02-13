import { vi } from 'vitest';
import { encodeQRPayload, decodeQRPayload, generateLabelsPDF } from '@/libs/barcode';

// ============ encodeQRPayload ============

describe('encodeQRPayload', () => {
  it('encodes lot metadata into QR payload string', () => {
    const result = encodeQRPayload({
      reagent_id: '550e8400-e29b-41d4-a716-446655440000',
      lot_number: 'LOT-001',
      expiry_date: '2027-06-30',
    });
    expect(result).toBe('IMS:v1:{"r":"550e8400-e29b-41d4-a716-446655440000","l":"LOT-001","e":"2027-06-30"}');
  });

  it('encodes null expiry_date as null', () => {
    const result = encodeQRPayload({
      reagent_id: '550e8400-e29b-41d4-a716-446655440000',
      lot_number: 'LOT-002',
      expiry_date: null,
    });
    expect(result).toContain('"e":null');
  });

  it('treats empty string expiry_date as null', () => {
    const result = encodeQRPayload({
      reagent_id: '550e8400-e29b-41d4-a716-446655440000',
      lot_number: 'LOT-003',
      expiry_date: '',
    });
    expect(result).toContain('"e":null');
  });
});

// ============ decodeQRPayload ============

describe('decodeQRPayload', () => {
  it('decodes valid payload', () => {
    const encoded = encodeQRPayload({
      reagent_id: '550e8400-e29b-41d4-a716-446655440000',
      lot_number: 'LOT-001',
      expiry_date: '2027-06-30',
    });
    const result = decodeQRPayload(encoded);
    expect(result.valid).toBe(true);
    expect(result.data).toEqual({
      reagent_id: '550e8400-e29b-41d4-a716-446655440000',
      lot_number: 'LOT-001',
      expiry_date: '2027-06-30',
    });
  });

  it('decodes payload with null expiry', () => {
    const encoded = encodeQRPayload({
      reagent_id: '550e8400-e29b-41d4-a716-446655440000',
      lot_number: 'LOT-002',
      expiry_date: null,
    });
    const result = decodeQRPayload(encoded);
    expect(result.valid).toBe(true);
    expect(result.data.expiry_date).toBeNull();
  });

  it('rejects string without IMS prefix', () => {
    const result = decodeQRPayload('NOT-A-QR-CODE');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Not a valid inventory QR code');
  });

  it('rejects empty string', () => {
    const result = decodeQRPayload('');
    expect(result.valid).toBe(false);
  });

  it('rejects null input', () => {
    const result = decodeQRPayload(null);
    expect(result.valid).toBe(false);
  });

  it('rejects malformed JSON after prefix', () => {
    const result = decodeQRPayload('IMS:v1:{not valid json}');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Corrupted QR code data');
  });

  it('rejects payload missing reagent_id (r)', () => {
    const result = decodeQRPayload('IMS:v1:{"l":"LOT-001","e":null}');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Incomplete QR code data');
  });

  it('rejects payload missing lot_number (l)', () => {
    const result = decodeQRPayload('IMS:v1:{"r":"550e8400-e29b-41d4-a716-446655440000","e":null}');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Incomplete QR code data');
  });
});

// ============ generateLabelsPDF ============

// Mock jspdf
const mockSave = vi.fn();
const mockAddPage = vi.fn();
const mockAddImage = vi.fn();
const mockSetFont = vi.fn();
const mockSetFontSize = vi.fn();
const mockText = vi.fn();
const mockGetTextWidth = vi.fn(() => 0); // always fits → no truncation

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(function () {
    this.save = mockSave;
    this.addPage = mockAddPage;
    this.addImage = mockAddImage;
    this.setFont = mockSetFont;
    this.setFontSize = mockSetFontSize;
    this.text = mockText;
    this.getTextWidth = mockGetTextWidth;
  }),
}));

// Mock qrcode
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,FAKE')),
  },
}));

const makeLabel = (overrides = {}) => ({
  reagent: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Reagent',
    reference: 'REF-001',
    category: 'reagent',
  },
  lot_number: 'LOT-001',
  expiry_date: '2027-06-30',
  quantity: 1,
  ...overrides,
});

describe('generateLabelsPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing for empty array', async () => {
    await generateLabelsPDF([]);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('does nothing for null input', async () => {
    await generateLabelsPDF(null);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('generates a PDF and saves it', async () => {
    await generateLabelsPDF([makeLabel()]);
    expect(mockSave).toHaveBeenCalledWith('inventory-labels.pdf');
  });

  it('renders QR code and text for each label', async () => {
    await generateLabelsPDF([makeLabel()]);

    expect(mockAddImage).toHaveBeenCalledTimes(1);
    // Name, Ref, Lot, Exp — 4 text calls per label
    expect(mockText).toHaveBeenCalledTimes(4);

    const textCalls = mockText.mock.calls.map((c) => c[0]);
    expect(textCalls).toContain('Test Reagent');
    expect(textCalls).toContain('Ref: REF-001');
    expect(textCalls).toContain('Lot: LOT-001');
    expect(textCalls[3]).toMatch(/^Exp: /);
  });

  it('shows "No expiry" when expiry_date is null', async () => {
    await generateLabelsPDF([makeLabel({ expiry_date: null })]);

    const textCalls = mockText.mock.calls.map((c) => c[0]);
    expect(textCalls).toContain('No expiry');
  });

  it('expands labels by quantity', async () => {
    await generateLabelsPDF([makeLabel({ quantity: 3 })]);

    // 3 copies → 3 QR codes, 3×4 = 12 text calls
    expect(mockAddImage).toHaveBeenCalledTimes(3);
    expect(mockText).toHaveBeenCalledTimes(12);
  });

  it('defaults quantity to 1 when not set', async () => {
    const label = makeLabel();
    delete label.quantity;
    await generateLabelsPDF([label]);

    expect(mockAddImage).toHaveBeenCalledTimes(1);
  });

  it('adds a new page after 48 labels', async () => {
    const labels = [makeLabel({ quantity: 49 })];
    await generateLabelsPDF(labels);

    expect(mockAddPage).toHaveBeenCalledTimes(1);
    expect(mockAddImage).toHaveBeenCalledTimes(49);
  });

  it('does not add a page for exactly 48 labels', async () => {
    const labels = [makeLabel({ quantity: 48 })];
    await generateLabelsPDF(labels);

    expect(mockAddPage).not.toHaveBeenCalled();
    expect(mockAddImage).toHaveBeenCalledTimes(48);
  });
});
