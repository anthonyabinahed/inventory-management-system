import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Headless UI — render children directly
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
  Info: (props) => <span data-testid="info-icon" {...props} />,
}));

// Mock inventory actions
const mockCreateReagent = vi.fn();
const mockUpdateReagent = vi.fn();
vi.mock('@/actions/inventory', () => ({
  createReagent: (...args) => mockCreateReagent(...args),
  updateReagent: (...args) => mockUpdateReagent(...args),
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

const { default: ReagentModal } = await import('@/components/inventory/ReagentModal');

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSaved: vi.fn(),
  reagent: null,
  viewOnly: false,
};

const sampleReagent = {
  id: 'reagent-123',
  name: 'CBC Diluent',
  reference: 'REF-001',
  description: 'A diluent',
  supplier: 'Beckman',
  category: 'reagent',
  minimum_stock: 5,
  unit: 'vials',
  storage_location: 'Fridge A',
  storage_temperature: '2-8°C',
  sector: 'Hematology',
  machine: 'Sysmex XN',
  total_quantity: 50,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReagentModal', () => {
  it('renders "Add New" title when no reagent prop', () => {
    render(<ReagentModal {...defaultProps} />);
    expect(screen.getByText('Add New')).toBeInTheDocument();
  });

  it('renders "Edit" title when reagent prop provided', () => {
    render(<ReagentModal {...defaultProps} reagent={sampleReagent} />);
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('renders "Item Details" title when viewOnly=true', () => {
    render(<ReagentModal {...defaultProps} reagent={sampleReagent} viewOnly={true} />);
    expect(screen.getByText('Item Details')).toBeInTheDocument();
  });

  it('shows stock summary in view-only mode', () => {
    render(<ReagentModal {...defaultProps} reagent={sampleReagent} viewOnly={true} />);
    expect(screen.getByText(/Total Stock/)).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it('form fields are disabled in view-only mode', () => {
    render(<ReagentModal {...defaultProps} reagent={sampleReagent} viewOnly={true} />);
    const nameInput = screen.getByPlaceholderText('e.g., CBC Diluent');
    expect(nameInput).toBeDisabled();
  });

  it('shows validation errors for empty required fields on submit', async () => {
    render(<ReagentModal {...defaultProps} />);
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
    expect(mockCreateReagent).not.toHaveBeenCalled();
  });

  it('calls createReagent on submit for new reagent', async () => {
    mockCreateReagent.mockResolvedValue({ success: true, data: { id: 'new-id' } });
    const user = userEvent.setup();
    render(<ReagentModal {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('e.g., CBC Diluent'), 'New Reagent');
    await user.type(screen.getByPlaceholderText('e.g., BM0809.075'), 'REF-NEW');
    await user.type(screen.getByPlaceholderText('e.g., Beckman Coulter'), 'Supplier');
    await user.type(screen.getByPlaceholderText('e.g., Fridge A - Shelf 2'), 'Room A');
    await user.type(screen.getByPlaceholderText('e.g., 2-8°C'), '2-8°C');
    await user.type(screen.getByPlaceholderText('e.g., Hematology'), 'Hematology');

    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateReagent).toHaveBeenCalled();
    });
  });

  it('calls updateReagent on submit for editing', async () => {
    mockUpdateReagent.mockResolvedValue({ success: true, data: sampleReagent });
    render(<ReagentModal {...defaultProps} reagent={sampleReagent} />);

    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockUpdateReagent).toHaveBeenCalledWith('reagent-123', expect.any(Object));
    });
  });

  it('calls onSaved on success', async () => {
    mockCreateReagent.mockResolvedValue({ success: true, data: { id: 'new-id' } });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<ReagentModal {...defaultProps} onSaved={onSaved} />);

    await user.type(screen.getByPlaceholderText('e.g., CBC Diluent'), 'Test');
    await user.type(screen.getByPlaceholderText('e.g., BM0809.075'), 'REF');
    await user.type(screen.getByPlaceholderText('e.g., Beckman Coulter'), 'Sup');
    await user.type(screen.getByPlaceholderText('e.g., Fridge A - Shelf 2'), 'Loc');
    await user.type(screen.getByPlaceholderText('e.g., 2-8°C'), 'Temp');
    await user.type(screen.getByPlaceholderText('e.g., Hematology'), 'Sector');

    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });

  it('shows error toast on action failure', async () => {
    mockUpdateReagent.mockResolvedValue({ success: false, errorMessage: 'DB error' });
    render(<ReagentModal {...defaultProps} reagent={sampleReagent} />);

    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('DB error');
    });
  });

  it('calls onClose when Cancel clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ReagentModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
