import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ScanLine: (props) => <span data-testid="scanline-icon" {...props} />,
  AlertTriangle: (props) => <span data-testid="alert-icon" {...props} />,
  Camera: (props) => <span data-testid="camera-icon" {...props} />,
  XCircle: (props) => <span data-testid="xcircle-icon" {...props} />,
  Package: (props) => <span data-testid="package-icon" {...props} />,
  MapPin: (props) => <span data-testid="mappin-icon" {...props} />,
  Thermometer: (props) => <span data-testid="thermo-icon" {...props} />,
  Plus: (props) => <span data-testid="plus-icon" {...props} />,
  Minus: (props) => <span data-testid="minus-icon" {...props} />,
  ArrowLeft: (props) => <span data-testid="arrow-left-icon" {...props} />,
}));

// Mock StatusBadges
vi.mock('@/components/inventory/StatusBadges', () => ({
  ExpiryBadge: ({ expiryDate }) => <span data-testid="expiry-badge">{expiryDate}</span>,
}));

// Mock next/dynamic to render ScannerCamera synchronously
let mockScannerOnScan;
let mockScannerOnError;
let mockScannerOnCancel;
vi.mock('next/dynamic', () => ({
  default: () => {
    const MockScannerCamera = (props) => {
      mockScannerOnScan = props.onScan;
      mockScannerOnError = props.onError;
      mockScannerOnCancel = props.onCancel;
      return (
        <div data-testid="scanner-camera">
          <button onClick={() => props.onCancel()}>Cancel Scanning</button>
        </div>
      );
    };
    return MockScannerCamera;
  },
}));

// Mock barcode lib
const mockDecodeQRPayload = vi.fn();
vi.mock('@/libs/barcode', () => ({
  decodeQRPayload: (...args) => mockDecodeQRPayload(...args),
}));

// Mock schemas — need real Zod-like objects for zodResolver in ScanActionForm
const mockSafeParse = vi.fn();
vi.mock('@/libs/schemas', async () => {
  const { z } = await import('zod');
  return {
    qrPayloadSchema: {
      safeParse: (...args) => mockSafeParse(...args),
    },
    stockInSchema: z.object({
      reagent_id: z.string().optional(),
      lot_number: z.string().optional(),
      quantity: z.coerce.number().int().positive(),
      expiry_date: z.string().optional(),
      notes: z.string().optional(),
    }),
    stockOutSchema: z.object({
      quantity: z.coerce.number().int().positive(),
      notes: z.string().optional(),
    }),
  };
});

// Mock inventory actions
const mockGetLotWithReagent = vi.fn();
const mockStockIn = vi.fn();
const mockStockOut = vi.fn();
vi.mock('@/actions/inventory', () => ({
  getLotWithReagent: (...args) => mockGetLotWithReagent(...args),
  stockIn: (...args) => mockStockIn(...args),
  stockOut: (...args) => mockStockOut(...args),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { Scanner } = await import('@/components/Scanner');

const sampleReagent = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'CBC Diluent',
  reference: 'REF-001',
  category: 'reagent',
  unit: 'vials',
  supplier: 'Beckman Coulter',
  storage_location: 'Fridge A',
  storage_temperature: '2-8°C',
};

const sampleLot = {
  id: 'lot-550e8400-e29b-41d4-a716-446655440000',
  lot_number: 'LOT-001',
  quantity: 20,
  expiry_date: '2027-06-30',
};

const sampleQrData = {
  reagent_id: '550e8400-e29b-41d4-a716-446655440000',
  lot_number: 'LOT-001',
  expiry_date: '2027-06-30',
};

// Helper to set up mocks for a successful scan flow
const setupSuccessfulScanMocks = () => {
  mockDecodeQRPayload.mockReturnValue({ valid: true, data: sampleQrData });
  mockSafeParse.mockReturnValue({ success: true, data: sampleQrData });
  mockGetLotWithReagent.mockResolvedValue({
    success: true,
    data: { reagent: sampleReagent, lot: sampleLot },
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  mockScannerOnScan = null;
  mockScannerOnError = null;
  mockScannerOnCancel = null;
});

describe('Scanner', () => {
  describe('IDLE state', () => {
    it('shows "Scan QR Code" heading', () => {
      render(<Scanner />);
      expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
    });

    it('shows instruction text', () => {
      render(<Scanner />);
      expect(screen.getByText(/Scan an inventory QR code label/)).toBeInTheDocument();
    });

    it('shows "Start Scanning" button', () => {
      render(<Scanner />);
      expect(screen.getByText('Start Scanning')).toBeInTheDocument();
    });
  });

  describe('IDLE -> SCANNING transition', () => {
    it('shows scanner camera after clicking Start Scanning', async () => {
      const user = userEvent.setup();
      render(<Scanner />);

      await user.click(screen.getByText('Start Scanning'));

      expect(screen.getByTestId('scanner-camera')).toBeInTheDocument();
      expect(screen.queryByText('Start Scanning')).not.toBeInTheDocument();
    });
  });

  describe('SCANNING -> ERROR (camera error)', () => {
    it('shows error when camera reports an error', async () => {
      const user = userEvent.setup();
      render(<Scanner />);
      await user.click(screen.getByText('Start Scanning'));

      act(() => {
        mockScannerOnError('Camera access denied.');
      });

      await waitFor(() => {
        expect(screen.getByText('Scan Error')).toBeInTheDocument();
        expect(screen.getByText('Camera access denied.')).toBeInTheDocument();
      });
    });

    it('shows "Try Again" button on error', async () => {
      const user = userEvent.setup();
      render(<Scanner />);
      await user.click(screen.getByText('Start Scanning'));

      act(() => {
        mockScannerOnError('Some error');
      });

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('returns to IDLE when "Try Again" is clicked', async () => {
      const user = userEvent.setup();
      render(<Scanner />);
      await user.click(screen.getByText('Start Scanning'));

      act(() => {
        mockScannerOnError('Some error');
      });

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Try Again'));

      expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
      expect(screen.getByText('Start Scanning')).toBeInTheDocument();
    });
  });

  describe('SCANNING -> cancel', () => {
    it('returns to IDLE when cancel is triggered from scanner', async () => {
      const user = userEvent.setup();
      render(<Scanner />);
      await user.click(screen.getByText('Start Scanning'));

      act(() => {
        mockScannerOnCancel();
      });

      await waitFor(() => {
        expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
      });
    });
  });

  describe('SCANNING -> ERROR (invalid QR)', () => {
    it('shows error for invalid QR code (not IMS format)', async () => {
      const user = userEvent.setup();
      render(<Scanner />);
      await user.click(screen.getByText('Start Scanning'));

      mockDecodeQRPayload.mockReturnValue({ valid: false, error: 'Not a valid inventory QR code' });

      await act(async () => {
        await mockScannerOnScan('random-text');
      });

      await waitFor(() => {
        expect(screen.getByText('Scan Error')).toBeInTheDocument();
        expect(screen.getByText('Not a valid inventory QR code')).toBeInTheDocument();
      });
    });

    it('shows error for corrupted QR data', async () => {
      const user = userEvent.setup();
      render(<Scanner />);
      await user.click(screen.getByText('Start Scanning'));

      mockDecodeQRPayload.mockReturnValue({ valid: false, error: 'Corrupted QR code data' });

      await act(async () => {
        await mockScannerOnScan('IMS:v1:{broken');
      });

      await waitFor(() => {
        expect(screen.getByText('Corrupted QR code data')).toBeInTheDocument();
      });
    });
  });

  describe('SCANNING -> ERROR (schema validation fails)', () => {
    it('shows error when QR data fails schema validation', async () => {
      const user = userEvent.setup();
      render(<Scanner />);
      await user.click(screen.getByText('Start Scanning'));

      mockDecodeQRPayload.mockReturnValue({
        valid: true,
        data: { reagent_id: 'not-a-uuid', lot_number: 'LOT-001', expiry_date: null },
      });
      mockSafeParse.mockReturnValue({
        success: false,
        error: { issues: [{ message: 'Invalid reagent ID in QR code' }] },
      });

      await act(async () => {
        await mockScannerOnScan('IMS:v1:{"r":"not-a-uuid","l":"LOT-001","e":null}');
      });

      await waitFor(() => {
        expect(screen.getByText('Invalid reagent ID in QR code')).toBeInTheDocument();
      });
    });
  });

  describe('SCANNING -> PROCESSING -> RESULT (successful scan)', () => {
    it('shows result after successful scan and API lookup', async () => {
      const user = userEvent.setup();
      render(<Scanner />);
      await user.click(screen.getByText('Start Scanning'));

      setupSuccessfulScanMocks();

      await act(async () => {
        await mockScannerOnScan('IMS:v1:valid');
      });

      // Should show result
      await waitFor(() => {
        expect(screen.getByText('CBC Diluent')).toBeInTheDocument();
        expect(screen.getByText(/Lot: LOT-001/)).toBeInTheDocument();
        expect(screen.getByText('Stock In')).toBeInTheDocument();
        expect(screen.getByText('Stock Out')).toBeInTheDocument();
      });
    });
  });

  describe('SCANNING -> PROCESSING -> ERROR (API failure)', () => {
    it('shows error when getLotWithReagent fails', async () => {
      const user = userEvent.setup();
      render(<Scanner />);
      await user.click(screen.getByText('Start Scanning'));

      mockDecodeQRPayload.mockReturnValue({ valid: true, data: sampleQrData });
      mockSafeParse.mockReturnValue({ success: true, data: sampleQrData });
      mockGetLotWithReagent.mockResolvedValue({
        success: false,
        errorMessage: 'Failed to look up inventory data',
      });

      await act(async () => {
        await mockScannerOnScan('IMS:v1:valid');
      });

      await waitFor(() => {
        expect(screen.getByText('Scan Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to look up inventory data')).toBeInTheDocument();
      });
    });
  });

  describe('RESULT -> new lot (lot is null)', () => {
    it('shows result with new lot badge and disabled stock out', async () => {
      const user = userEvent.setup();
      render(<Scanner />);
      await user.click(screen.getByText('Start Scanning'));

      mockDecodeQRPayload.mockReturnValue({ valid: true, data: sampleQrData });
      mockSafeParse.mockReturnValue({ success: true, data: sampleQrData });
      mockGetLotWithReagent.mockResolvedValue({
        success: true,
        data: { reagent: sampleReagent, lot: null },
      });

      await act(async () => {
        await mockScannerOnScan('IMS:v1:valid');
      });

      await waitFor(() => {
        expect(screen.getByText('New lot')).toBeInTheDocument();
        expect(screen.getByText('Stock Out').closest('button')).toBeDisabled();
        expect(screen.getByText('Stock In').closest('button')).not.toBeDisabled();
      });
    });
  });

  describe('RESULT -> Scan Another', () => {
    it('returns to IDLE when Scan Another is clicked', async () => {
      const user = userEvent.setup();
      render(<Scanner />);
      await user.click(screen.getByText('Start Scanning'));

      setupSuccessfulScanMocks();

      await act(async () => {
        await mockScannerOnScan('IMS:v1:valid');
      });

      await waitFor(() => {
        expect(screen.getByText('Scan Another')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Scan Another'));

      expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
      expect(screen.getByText('Start Scanning')).toBeInTheDocument();
    });
  });

  describe('full flow: scan -> result -> stock in action', () => {
    it('enters stock in action form', async () => {
      const user = userEvent.setup();
      render(<Scanner />);

      // Step 1: Start scanning
      await user.click(screen.getByText('Start Scanning'));

      // Step 2: Scan a QR code
      setupSuccessfulScanMocks();

      await act(async () => {
        await mockScannerOnScan('IMS:v1:valid');
      });

      // Step 3: See result
      await waitFor(() => {
        expect(screen.getByText('CBC Diluent')).toBeInTheDocument();
      });

      // Step 4: Click Stock In -> goes to ACTION state
      await user.click(screen.getByText('Stock In'));

      await waitFor(() => {
        expect(screen.getByText('Confirm Stock In')).toBeInTheDocument();
        expect(screen.getByText('Back')).toBeInTheDocument();
      });
    });
  });

  describe('full flow: scan -> result -> stock out action', () => {
    it('enters stock out action form', async () => {
      const user = userEvent.setup();
      render(<Scanner />);

      await user.click(screen.getByText('Start Scanning'));

      setupSuccessfulScanMocks();

      await act(async () => {
        await mockScannerOnScan('IMS:v1:valid');
      });

      await waitFor(() => {
        expect(screen.getByText('Stock Out')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Stock Out'));

      await waitFor(() => {
        expect(screen.getByText('Confirm Stock Out')).toBeInTheDocument();
      });
    });
  });

  describe('ACTION -> cancel -> RESULT', () => {
    it('returns to result when Back is clicked from action form', async () => {
      const user = userEvent.setup();
      render(<Scanner />);

      await user.click(screen.getByText('Start Scanning'));

      setupSuccessfulScanMocks();

      await act(async () => {
        await mockScannerOnScan('IMS:v1:valid');
      });

      await waitFor(() => {
        expect(screen.getByText('Stock In')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Stock In'));

      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Back'));

      // Should be back at result with Stock In/Out buttons
      await waitFor(() => {
        expect(screen.getByText('Stock In')).toBeInTheDocument();
        expect(screen.getByText('Stock Out')).toBeInTheDocument();
        expect(screen.getByText('Scan Another')).toBeInTheDocument();
      });
    });
  });
});
