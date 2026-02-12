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
  Minus: (props) => <span data-testid="minus-icon" {...props} />,
}));

// Mock inventory actions
const mockStockOut = vi.fn();
vi.mock('@/actions/inventory', () => ({
  stockOut: (...args) => mockStockOut(...args),
}));

// Mock StatusBadges (used internally)
vi.mock('@/components/inventory/StatusBadges', () => ({
  ExpiryBadge: ({ expiryDate }) => expiryDate ? <span>Exp: {expiryDate}</span> : null,
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

const { default: LotStockOutModal } = await import('@/components/inventory/LotStockOutModal');

const sampleLot = {
  id: 'lot-123',
  lot_number: 'LOT-001',
  quantity: 20,
  expiry_date: '2027-06-30',
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSaved: vi.fn(),
  lot: sampleLot,
  unit: 'vials',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LotStockOutModal', () => {
  it('renders with current lot quantity shown', () => {
    render(<LotStockOutModal {...defaultProps} />);
    // "Remove Stock" appears in both title and submit button
    expect(screen.getAllByText('Remove Stock').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('LOT-001')).toBeInTheDocument();
    expect(screen.getByText(/Current stock/)).toBeInTheDocument();
  });

  it('shows quantity input', () => {
    render(<LotStockOutModal {...defaultProps} />);
    expect(screen.getByText('Quantity to Remove')).toBeInTheDocument();
  });

  it('quick buttons set quantity correctly', async () => {
    const user = userEvent.setup();
    render(<LotStockOutModal {...defaultProps} />);

    // Click the "5" quick button
    await user.click(screen.getByText('5'));

    // Verify the input value changed
    const input = screen.getByRole('spinbutton');
    expect(input.value).toBe('5');
  });

  it('shows "All" button that sets quantity to lot total', async () => {
    const user = userEvent.setup();
    render(<LotStockOutModal {...defaultProps} />);

    await user.click(screen.getByText('All (20)'));
    const input = screen.getByRole('spinbutton');
    expect(input.value).toBe('20');
  });

  it('shows preview of remaining quantity', () => {
    render(<LotStockOutModal {...defaultProps} />);
    // Default quantity is 1, so remaining = 19
    expect(screen.getByText(/19 vials/)).toBeInTheDocument();
  });

  it('calls stockOut with correct args on submit', async () => {
    mockStockOut.mockResolvedValue({ success: true, newQuantity: 19 });
    render(<LotStockOutModal {...defaultProps} />);

    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockStockOut).toHaveBeenCalledWith('lot-123', 1, expect.any(Object));
    });
  });

  it('shows warning when quantity exceeds stock', async () => {
    const user = userEvent.setup();
    render(<LotStockOutModal {...defaultProps} />);

    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '25');

    await waitFor(() => {
      expect(screen.getByText(/Cannot exceed current stock/)).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<LotStockOutModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSaved on successful stock out', async () => {
    mockStockOut.mockResolvedValue({ success: true, newQuantity: 19 });
    const onSaved = vi.fn();
    render(<LotStockOutModal {...defaultProps} onSaved={onSaved} />);

    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith('Stock removed');
    });
  });
});
