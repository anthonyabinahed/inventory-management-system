import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Headless UI
vi.mock('@headlessui/react', () => {
  const DialogPanel = ({ children }) => <div>{children}</div>;
  const DialogTitle = ({ children, as: Tag = 'h3', ...props }) => <Tag {...props}>{children}</Tag>;
  const Dialog = ({ children }) => <div role="dialog">{typeof children === 'function' ? children({}) : children}</div>;
  Dialog.Panel = DialogPanel;
  Dialog.Title = DialogTitle;

  const TransitionChild = ({ children }) => <>{typeof children === 'function' ? children({}) : children}</>;
  const Transition = ({ children, show }) => show ? <>{typeof children === 'function' ? children({}) : children}</> : null;
  Transition.Child = TransitionChild;

  return { Dialog, Transition };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: (props) => <span data-testid="x-icon" {...props} />,
  Plus: (props) => <span data-testid="plus-icon" {...props} />,
  Info: (props) => <span data-testid="info-icon" {...props} />,
}));

// Mock inventory actions
const mockStockIn = vi.fn();
const mockCheckLotExists = vi.fn();
vi.mock('@/actions/inventory', () => ({
  stockIn: (...args) => mockStockIn(...args),
  checkLotExists: (...args) => mockCheckLotExists(...args),
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

const { default: LotStockInModal } = await import('@/components/inventory/LotStockInModal');

const sampleReagent = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'CBC Diluent',
  reference: 'REF-001',
  total_quantity: 50,
  unit: 'vials',
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSaved: vi.fn(),
  reagent: sampleReagent,
  existingLots: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckLotExists.mockResolvedValue({ success: true, exists: false });
});

describe('LotStockInModal', () => {
  it('renders the modal when isOpen=true', () => {
    render(<LotStockInModal {...defaultProps} />);
    // "Add Stock" appears in both title and submit button
    expect(screen.getAllByText('Add Stock').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('CBC Diluent')).toBeInTheDocument();
  });

  it('shows lot number input field', () => {
    render(<LotStockInModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('e.g., LOT-2024-001')).toBeInTheDocument();
  });

  it('shows quantity input field', () => {
    render(<LotStockInModal {...defaultProps} />);
    expect(screen.getByText('Quantity to Add')).toBeInTheDocument();
  });

  it('calls stockIn action on submit with correct data', async () => {
    mockStockIn.mockResolvedValue({ success: true, action: 'created', data: { id: 'lot-1' } });
    const user = userEvent.setup();
    render(<LotStockInModal {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('e.g., LOT-2024-001'), 'LOT-NEW');

    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockStockIn).toHaveBeenCalledWith(expect.objectContaining({
        reagent_id: '550e8400-e29b-41d4-a716-446655440000',
        lot_number: 'LOT-NEW',
      }));
    });
  });

  it('shows "Adding to existing lot" info when checkLotExists returns existing lot', async () => {
    mockCheckLotExists.mockResolvedValue({
      success: true,
      exists: true,
      lot: { id: 'lot-1', quantity: 20, expiry_date: '2027-06-30' },
    });

    const user = userEvent.setup();
    render(<LotStockInModal {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('e.g., LOT-2024-001'), 'EXISTING-LOT');

    await waitFor(() => {
      expect(screen.getByText('Adding to existing lot')).toBeInTheDocument();
    });
  });

  it('shows validation error for empty lot number on submit', async () => {
    render(<LotStockInModal {...defaultProps} />);

    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Lot number is required')).toBeInTheDocument();
    });
    expect(mockStockIn).not.toHaveBeenCalled();
  });

  it('calls onSaved on successful stock in', async () => {
    mockStockIn.mockResolvedValue({ success: true, action: 'created', data: { id: 'lot-1' } });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<LotStockInModal {...defaultProps} onSaved={onSaved} />);

    await user.type(screen.getByPlaceholderText('e.g., LOT-2024-001'), 'LOT-NEW');
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });

  it('calls onClose when cancel clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<LotStockInModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
