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
  Tag: (props) => <span data-testid="tag-icon" {...props} />,
  Info: (props) => <span data-testid="info-icon" {...props} />,
}));

// Mock inventory actions
const mockCheckLotExists = vi.fn();
vi.mock('@/actions/inventory', () => ({
  checkLotExists: (...args) => mockCheckLotExists(...args),
}));

const { default: AddLabelModal } = await import('@/components/barcode/AddLabelModal');

const sampleReagent = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'CBC Diluent',
  reference: 'REF-001',
  category: 'reagent',
  unit: 'vials',
  supplier: 'Beckman Coulter',
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  reagent: sampleReagent,
  onAdd: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckLotExists.mockResolvedValue({ success: true, exists: false });
});

describe('AddLabelModal', () => {
  it('renders form fields when open', () => {
    render(<AddLabelModal {...defaultProps} />);
    expect(screen.getByText('Add Label')).toBeInTheDocument();
    expect(screen.getByText('CBC Diluent')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., LOT-2024-001')).toBeInTheDocument();
    expect(screen.getByText('Expiry Date')).toBeInTheDocument();
    expect(screen.getByText('Number of Labels')).toBeInTheDocument();
  });

  it('returns null when reagent is null', () => {
    const { container } = render(<AddLabelModal {...defaultProps} reagent={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('does not render when isOpen is false', () => {
    render(<AddLabelModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Add Label')).not.toBeInTheDocument();
  });

  it('shows validation error for empty lot number on submit', async () => {
    render(<AddLabelModal {...defaultProps} />);

    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Lot number is required')).toBeInTheDocument();
    });
    expect(defaultProps.onAdd).not.toHaveBeenCalled();
  });

  it('calls onAdd with correct data on submit', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddLabelModal {...defaultProps} onAdd={onAdd} />);

    await user.type(screen.getByPlaceholderText('e.g., LOT-2024-001'), 'LOT-NEW');

    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
        reagent: sampleReagent,
        lot_number: 'LOT-NEW',
        quantity: 1,
      }));
    });
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AddLabelModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('disables expiry_date field when existing lot is found', async () => {
    mockCheckLotExists.mockResolvedValue({
      success: true,
      exists: true,
      lot: { id: 'lot-1', quantity: 20, expiry_date: '2027-06-30' },
    });

    const user = userEvent.setup();
    render(<AddLabelModal {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('e.g., LOT-2024-001'), 'EXISTING-LOT');

    await waitFor(() => {
      expect(screen.getByText('Expiry date from existing lot')).toBeInTheDocument();
    });

    // The date input should be disabled
    const dateInputs = screen.getByRole('dialog').querySelectorAll('input[type="date"]');
    expect(dateInputs[0]).toBeDisabled();
  });

  it('shows existing lot expiry date when lot exists', async () => {
    mockCheckLotExists.mockResolvedValue({
      success: true,
      exists: true,
      lot: { id: 'lot-1', quantity: 20, expiry_date: '2027-06-30' },
    });

    const user = userEvent.setup();
    render(<AddLabelModal {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('e.g., LOT-2024-001'), 'EXISTING-LOT');

    await waitFor(() => {
      const dateInput = screen.getByRole('dialog').querySelector('input[type="date"]');
      expect(dateInput.value).toBe('2027-06-30');
    });
  });

  it('re-enables expiry_date when lot is cleared', async () => {
    mockCheckLotExists
      .mockResolvedValueOnce({
        success: true,
        exists: true,
        lot: { id: 'lot-1', quantity: 20, expiry_date: '2027-06-30' },
      })
      .mockResolvedValue({ success: true, exists: false });

    const user = userEvent.setup();
    render(<AddLabelModal {...defaultProps} />);

    // Type to trigger existing lot
    await user.type(screen.getByPlaceholderText('e.g., LOT-2024-001'), 'E');

    await waitFor(() => {
      expect(screen.getByText('Expiry date from existing lot')).toBeInTheDocument();
    });

    // Clear the lot number
    await user.clear(screen.getByPlaceholderText('e.g., LOT-2024-001'));

    await waitFor(() => {
      expect(screen.queryByText('Expiry date from existing lot')).not.toBeInTheDocument();
    });
  });

  it('shows reagent info in the header', () => {
    render(<AddLabelModal {...defaultProps} />);
    expect(screen.getByText('CBC Diluent')).toBeInTheDocument();
    expect(screen.getByText(/Ref: REF-001/)).toBeInTheDocument();
    expect(screen.getByText(/Beckman Coulter/)).toBeInTheDocument();
  });
});
