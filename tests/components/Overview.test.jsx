import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Package: (props) => <span data-testid="package-icon" {...props} />,
  AlertTriangle: (props) => <span data-testid="alert-icon" {...props} />,
  Clock: (props) => <span data-testid="clock-icon" {...props} />,
}));

// Mock inventory actions
const mockGetReagents = vi.fn();
const mockGetLowStockReagents = vi.fn();
const mockGetExpiredLotsCount = vi.fn();

vi.mock('@/actions/inventory', () => ({
  getReagents: (...args) => mockGetReagents(...args),
  getLowStockReagents: (...args) => mockGetLowStockReagents(...args),
  getExpiredLotsCount: (...args) => mockGetExpiredLotsCount(...args),
}));

const { Overview } = await import('@/components/Overview');

beforeEach(() => {
  vi.clearAllMocks();
  mockGetReagents.mockResolvedValue({
    success: true,
    data: [],
    pagination: { total: 42 },
  });
  mockGetLowStockReagents.mockResolvedValue({
    success: true,
    data: [{ id: '1' }, { id: '2' }, { id: '3' }],
  });
  mockGetExpiredLotsCount.mockResolvedValue({
    success: true,
    count: 5,
  });
});

describe('Overview', () => {
  it('renders loading state initially', () => {
    // Don't resolve promises yet
    mockGetReagents.mockReturnValue(new Promise(() => {}));
    mockGetLowStockReagents.mockReturnValue(new Promise(() => {}));
    mockGetExpiredLotsCount.mockReturnValue(new Promise(() => {}));

    const { container } = render(<Overview onNavigateToInventory={vi.fn()} />);
    expect(container.querySelector('.loading')).toBeInTheDocument();
  });

  it('renders stats cards after loading', async () => {
    render(<Overview onNavigateToInventory={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders card labels', async () => {
    render(<Overview onNavigateToInventory={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Total Items')).toBeInTheDocument();
    });
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
    expect(screen.getByText('Expired Reagents')).toBeInTheDocument();
  });

  it('calls inventory actions on mount', async () => {
    render(<Overview onNavigateToInventory={vi.fn()} />);

    await waitFor(() => {
      expect(mockGetReagents).toHaveBeenCalledWith({ page: 1, limit: 1 });
      expect(mockGetLowStockReagents).toHaveBeenCalled();
      expect(mockGetExpiredLotsCount).toHaveBeenCalled();
    });
  });

  it('clicking total items card calls onNavigateToInventory with empty filter', async () => {
    const onNavigateToInventory = vi.fn();
    const user = userEvent.setup();
    render(<Overview onNavigateToInventory={onNavigateToInventory} />);

    await waitFor(() => {
      expect(screen.getByText('Total Items')).toBeInTheDocument();
    });

    // Click the Total Items card
    await user.click(screen.getByText('Total Items').closest('.card'));
    expect(onNavigateToInventory).toHaveBeenCalledWith({});
  });

  it('clicking low stock card calls onNavigateToInventory with lowStock filter', async () => {
    const onNavigateToInventory = vi.fn();
    const user = userEvent.setup();
    render(<Overview onNavigateToInventory={onNavigateToInventory} />);

    await waitFor(() => {
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Low Stock').closest('.card'));
    expect(onNavigateToInventory).toHaveBeenCalledWith({ lowStock: true });
  });

  it('clicking expired card calls onNavigateToInventory with hasExpiredLots filter', async () => {
    const onNavigateToInventory = vi.fn();
    const user = userEvent.setup();
    render(<Overview onNavigateToInventory={onNavigateToInventory} />);

    await waitFor(() => {
      expect(screen.getByText('Expired Reagents')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Expired Reagents').closest('.card'));
    expect(onNavigateToInventory).toHaveBeenCalledWith({ hasExpiredLots: true });
  });
});
