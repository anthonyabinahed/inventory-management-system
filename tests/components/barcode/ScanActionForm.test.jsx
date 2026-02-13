import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowLeft: (props) => <span data-testid="arrow-left-icon" {...props} />,
}));

// Mock inventory actions
const mockStockIn = vi.fn();
const mockStockOut = vi.fn();
vi.mock('@/actions/inventory', () => ({
  stockIn: (...args) => mockStockIn(...args),
  stockOut: (...args) => mockStockOut(...args),
}));

// Mock react-hot-toast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    success: (...args) => mockToastSuccess(...args),
    error: (...args) => mockToastError(...args),
  },
}));

const { default: ScanActionForm } = await import('@/components/barcode/ScanActionForm');

const sampleReagent = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'CBC Diluent',
  reference: 'REF-001',
  category: 'reagent',
  unit: 'vials',
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

const defaultStockInProps = {
  mode: 'in',
  reagent: sampleReagent,
  lot: sampleLot,
  qrData: sampleQrData,
  onSuccess: vi.fn(),
  onCancel: vi.fn(),
};

const defaultStockOutProps = {
  mode: 'out',
  reagent: sampleReagent,
  lot: sampleLot,
  qrData: sampleQrData,
  onSuccess: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ScanActionForm', () => {
  describe('stock in mode - rendering', () => {
    it('shows reagent name in info bar', () => {
      render(<ScanActionForm {...defaultStockInProps} />);
      expect(screen.getByText('CBC Diluent')).toBeInTheDocument();
    });

    it('shows lot number in info bar', () => {
      render(<ScanActionForm {...defaultStockInProps} />);
      expect(screen.getByText(/LOT-001/)).toBeInTheDocument();
    });

    it('shows current quantity for existing lot', () => {
      render(<ScanActionForm {...defaultStockInProps} />);
      expect(screen.getByText(/Current: 20 vials/)).toBeInTheDocument();
    });

    it('does not show current quantity for new lot', () => {
      render(<ScanActionForm {...defaultStockInProps} lot={null} />);
      expect(screen.queryByText(/Current:/)).not.toBeInTheDocument();
    });

    it('shows "Quantity to Add" label', () => {
      render(<ScanActionForm {...defaultStockInProps} />);
      expect(screen.getByText('Quantity to Add')).toBeInTheDocument();
    });

    it('shows unit next to quantity input', () => {
      render(<ScanActionForm {...defaultStockInProps} />);
      expect(screen.getByText('vials')).toBeInTheDocument();
    });

    it('shows "Confirm Stock In" submit button', () => {
      render(<ScanActionForm {...defaultStockInProps} />);
      expect(screen.getByText('Confirm Stock In')).toBeInTheDocument();
    });

    it('shows Back button', () => {
      render(<ScanActionForm {...defaultStockInProps} />);
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('shows notes textarea', () => {
      render(<ScanActionForm {...defaultStockInProps} />);
      expect(screen.getByPlaceholderText('Optional notes...')).toBeInTheDocument();
    });

    it('defaults quantity to 1', () => {
      render(<ScanActionForm {...defaultStockInProps} />);
      const input = screen.getByRole('spinbutton');
      expect(input.value).toBe('1');
    });
  });

  describe('stock in mode - preview text', () => {
    it('shows "New total" preview for existing lot', () => {
      render(<ScanActionForm {...defaultStockInProps} />);
      // default qty 1 + current 20 = 21
      expect(screen.getByText(/New total: 21 vials/)).toBeInTheDocument();
    });

    it('shows "Creating new lot" preview for new lot', () => {
      render(<ScanActionForm {...defaultStockInProps} lot={null} />);
      expect(screen.getByText(/Creating new lot with 1 vials/)).toBeInTheDocument();
    });
  });

  describe('stock out mode - rendering', () => {
    it('shows "Quantity to Remove" label', () => {
      render(<ScanActionForm {...defaultStockOutProps} />);
      expect(screen.getByText('Quantity to Remove')).toBeInTheDocument();
    });

    it('shows "Confirm Stock Out" submit button', () => {
      render(<ScanActionForm {...defaultStockOutProps} />);
      expect(screen.getByText('Confirm Stock Out')).toBeInTheDocument();
    });

    it('shows remaining preview', () => {
      render(<ScanActionForm {...defaultStockOutProps} />);
      // default qty 1, current 20, remaining = 19
      expect(screen.getByText(/Remaining: 19 vials/)).toBeInTheDocument();
    });

    it('shows quick buttons for stock out with existing lot', () => {
      render(<ScanActionForm {...defaultStockOutProps} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('shows "All" quick button with lot quantity', () => {
      render(<ScanActionForm {...defaultStockOutProps} />);
      expect(screen.getByText('All (20)')).toBeInTheDocument();
    });

    it('does not show quick buttons for stock in mode', () => {
      render(<ScanActionForm {...defaultStockInProps} />);
      expect(screen.queryByText('All (20)')).not.toBeInTheDocument();
    });

    it('filters quick buttons to values <= lot quantity', () => {
      const smallLot = { ...sampleLot, quantity: 3 };
      render(<ScanActionForm {...defaultStockOutProps} lot={smallLot} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      // 5 and 10 should not appear since quantity is 3
      expect(screen.queryByText('5')).not.toBeInTheDocument();
      expect(screen.queryByText('10')).not.toBeInTheDocument();
    });

    it('does not show "All" button when quantity is 1', () => {
      const singleLot = { ...sampleLot, quantity: 1 };
      render(<ScanActionForm {...defaultStockOutProps} lot={singleLot} />);
      expect(screen.queryByText('All (1)')).not.toBeInTheDocument();
    });

    it('does not show quick buttons when lot quantity is 0', () => {
      const emptyLot = { ...sampleLot, quantity: 0 };
      render(<ScanActionForm {...defaultStockOutProps} lot={emptyLot} />);
      expect(screen.queryByText('All (0)')).not.toBeInTheDocument();
    });
  });

  describe('stock out mode - quick buttons', () => {
    it('sets quantity when quick button is clicked', async () => {
      const user = userEvent.setup();
      render(<ScanActionForm {...defaultStockOutProps} />);

      await user.click(screen.getByText('5'));
      expect(screen.getByRole('spinbutton').value).toBe('5');
    });

    it('sets quantity to lot total when "All" is clicked', async () => {
      const user = userEvent.setup();
      render(<ScanActionForm {...defaultStockOutProps} />);

      await user.click(screen.getByText('All (20)'));
      expect(screen.getByRole('spinbutton').value).toBe('20');
    });

    it('highlights the selected quick button', async () => {
      const user = userEvent.setup();
      render(<ScanActionForm {...defaultStockOutProps} />);

      await user.click(screen.getByText('5'));
      const btn = screen.getByText('5').closest('button');
      expect(btn.className).toContain('btn-primary');
    });
  });

  describe('stock out mode - over-stock validation', () => {
    it('shows over-stock warning when quantity exceeds lot stock', async () => {
      const user = userEvent.setup();
      render(<ScanActionForm {...defaultStockOutProps} />);

      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '25');

      await waitFor(() => {
        expect(screen.getByText(/Cannot exceed current stock \(20\)/)).toBeInTheDocument();
      });
    });

    it('disables submit when over-stock', async () => {
      const user = userEvent.setup();
      render(<ScanActionForm {...defaultStockOutProps} />);

      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '25');

      await waitFor(() => {
        expect(screen.getByText('Confirm Stock Out').closest('button')).toBeDisabled();
      });
    });

    it('shows remaining as 0 when quantity equals stock', async () => {
      const user = userEvent.setup();
      render(<ScanActionForm {...defaultStockOutProps} />);

      await user.click(screen.getByText('All (20)'));

      expect(screen.getByText(/Remaining: 0 vials/)).toBeInTheDocument();
    });
  });

  describe('stock in - form submission', () => {
    it('calls stockIn with correct data', async () => {
      mockStockIn.mockResolvedValue({ success: true });
      render(<ScanActionForm {...defaultStockInProps} />);

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockStockIn).toHaveBeenCalledWith(
          expect.objectContaining({
            reagent_id: '550e8400-e29b-41d4-a716-446655440000',
            lot_number: 'LOT-001',
            quantity: 1,
            expiry_date: '2027-06-30',
          })
        );
      });
    });

    it('calls stockIn without expiry_date when not in QR data', async () => {
      mockStockIn.mockResolvedValue({ success: true });
      const qrDataNoExpiry = { ...sampleQrData, expiry_date: null };
      render(<ScanActionForm {...defaultStockInProps} qrData={qrDataNoExpiry} />);

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockStockIn).toHaveBeenCalledWith(
          expect.objectContaining({
            expiry_date: undefined,
          })
        );
      });
    });

    it('shows success toast on successful stock in', async () => {
      mockStockIn.mockResolvedValue({ success: true });
      render(<ScanActionForm {...defaultStockInProps} />);

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Stock added');
      });
    });

    it('calls onSuccess after successful stock in', async () => {
      mockStockIn.mockResolvedValue({ success: true });
      const onSuccess = vi.fn();
      render(<ScanActionForm {...defaultStockInProps} onSuccess={onSuccess} />);

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('shows error toast when stockIn returns error', async () => {
      mockStockIn.mockResolvedValue({ success: false, errorMessage: 'Reagent not found' });
      render(<ScanActionForm {...defaultStockInProps} />);

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Reagent not found');
      });
    });

    it('does not call onSuccess when stockIn fails', async () => {
      mockStockIn.mockResolvedValue({ success: false, errorMessage: 'Error' });
      const onSuccess = vi.fn();
      render(<ScanActionForm {...defaultStockInProps} onSuccess={onSuccess} />);

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('shows generic error toast when stockIn throws', async () => {
      mockStockIn.mockRejectedValue(new Error('Network error'));
      render(<ScanActionForm {...defaultStockInProps} />);

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to add stock');
      });
    });

    it('includes notes in stockIn call', async () => {
      mockStockIn.mockResolvedValue({ success: true });
      const user = userEvent.setup();
      render(<ScanActionForm {...defaultStockInProps} />);

      await user.type(screen.getByPlaceholderText('Optional notes...'), 'Test note');

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockStockIn).toHaveBeenCalledWith(
          expect.objectContaining({ notes: 'Test note' })
        );
      });
    });
  });

  describe('stock out - form submission', () => {
    it('calls stockOut with correct args (lotId, quantity, opts)', async () => {
      mockStockOut.mockResolvedValue({ success: true });
      render(<ScanActionForm {...defaultStockOutProps} />);

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockStockOut).toHaveBeenCalledWith(
          'lot-550e8400-e29b-41d4-a716-446655440000',
          1,
          expect.any(Object)
        );
      });
    });

    it('shows success toast on successful stock out', async () => {
      mockStockOut.mockResolvedValue({ success: true });
      render(<ScanActionForm {...defaultStockOutProps} />);

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Stock removed');
      });
    });

    it('calls onSuccess after successful stock out', async () => {
      mockStockOut.mockResolvedValue({ success: true });
      const onSuccess = vi.fn();
      render(<ScanActionForm {...defaultStockOutProps} onSuccess={onSuccess} />);

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('shows toast error when quantity exceeds stock (client-side check)', async () => {
      const user = userEvent.setup();
      render(<ScanActionForm {...defaultStockOutProps} />);

      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '25');

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Cannot exceed current stock (20)');
      });
      expect(mockStockOut).not.toHaveBeenCalled();
    });

    it('shows error toast when stockOut returns error', async () => {
      mockStockOut.mockResolvedValue({ success: false, errorMessage: 'Insufficient stock' });
      render(<ScanActionForm {...defaultStockOutProps} />);

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Insufficient stock');
      });
    });

    it('shows generic error toast when stockOut throws', async () => {
      mockStockOut.mockRejectedValue(new Error('Network error'));
      render(<ScanActionForm {...defaultStockOutProps} />);

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to remove stock');
      });
    });

    it('includes notes in stockOut call', async () => {
      mockStockOut.mockResolvedValue({ success: true });
      const user = userEvent.setup();
      render(<ScanActionForm {...defaultStockOutProps} />);

      await user.type(screen.getByPlaceholderText('Optional notes...'), 'Removed for testing');

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockStockOut).toHaveBeenCalledWith(
          expect.any(String),
          1,
          { notes: 'Removed for testing' }
        );
      });
    });
  });

  describe('cancel', () => {
    it('calls onCancel when Back button is clicked in stock in mode', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup();
      render(<ScanActionForm {...defaultStockInProps} onCancel={onCancel} />);

      await user.click(screen.getByText('Back'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Back button is clicked in stock out mode', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup();
      render(<ScanActionForm {...defaultStockOutProps} onCancel={onCancel} />);

      await user.click(screen.getByText('Back'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('form validation', () => {
    it('shows error for quantity of 0', async () => {
      const user = userEvent.setup();
      render(<ScanActionForm {...defaultStockInProps} />);

      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '0');

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Quantity must be greater than 0/)).toBeInTheDocument();
      });
      expect(mockStockIn).not.toHaveBeenCalled();
    });

    it('shows error for negative quantity', async () => {
      const user = userEvent.setup();
      render(<ScanActionForm {...defaultStockOutProps} />);

      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '-5');

      const form = document.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Quantity must be greater than 0/)).toBeInTheDocument();
      });
      expect(mockStockOut).not.toHaveBeenCalled();
    });
  });

  describe('alert styling', () => {
    it('shows success alert for stock in mode', () => {
      render(<ScanActionForm {...defaultStockInProps} />);
      const alert = screen.getByText(/New total:/).closest('.alert');
      expect(alert.className).toContain('alert-success');
    });

    it('shows warning alert for stock out mode', () => {
      render(<ScanActionForm {...defaultStockOutProps} />);
      const alert = screen.getByText(/Remaining:/).closest('.alert');
      expect(alert.className).toContain('alert-warning');
    });

    it('shows error alert when stock out results in 0 remaining', async () => {
      const user = userEvent.setup();
      render(<ScanActionForm {...defaultStockOutProps} />);

      await user.click(screen.getByText('All (20)'));

      const alert = screen.getByText(/Remaining: 0 vials/).closest('.alert');
      expect(alert.className).toContain('alert-error');
    });
  });
});
