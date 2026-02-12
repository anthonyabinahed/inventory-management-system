import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Package: (props) => <span data-testid="package-icon" {...props} />,
  AlertTriangle: (props) => <span data-testid="alert-icon" {...props} />,
  Clock: (props) => <span data-testid="clock-icon" {...props} />,
  PackageX: (props) => <span data-testid="package-x-icon" {...props} />,
  TrendingDown: (props) => <span data-testid="trending-down-icon" {...props} />,
}));

// Mock inventory actions
const mockGetReagents = vi.fn();
const mockGetLowStockReagents = vi.fn();
const mockGetExpiredLotsCount = vi.fn();
const mockGetExpiredLots = vi.fn();

vi.mock('@/actions/inventory', () => ({
  getReagents: (...args) => mockGetReagents(...args),
  getLowStockReagents: (...args) => mockGetLowStockReagents(...args),
  getExpiredLotsCount: (...args) => mockGetExpiredLotsCount(...args),
  getExpiredLots: (...args) => mockGetExpiredLots(...args),
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
    data: [
      { id: '1', name: 'Low Reagent A', total_quantity: 2, minimum_stock: 10, unit: 'vials' },
      { id: '2', name: 'Low Reagent B', total_quantity: 1, minimum_stock: 5, unit: 'kits' },
      { id: '3', name: 'Out Reagent C', total_quantity: 0, minimum_stock: 10, unit: 'mL' },
    ],
  });
  mockGetExpiredLotsCount.mockResolvedValue({
    success: true,
    count: 5,
  });
  mockGetExpiredLots.mockResolvedValue({
    success: true,
    data: [
      {
        id: 'lot-1',
        lot_number: 'LOT-001',
        expiry_date: '2020-01-01',
        quantity: 5,
        reagent_id: 'r-1',
        reagents: { id: 'r-1', name: 'Expired Reagent', reference: 'REF-001', unit: 'vials' },
      },
    ],
  });
});

describe('Overview', () => {
  it('renders loading state initially', () => {
    // Don't resolve promises yet
    mockGetReagents.mockReturnValue(new Promise(() => {}));
    mockGetLowStockReagents.mockReturnValue(new Promise(() => {}));
    mockGetExpiredLotsCount.mockReturnValue(new Promise(() => {}));
    mockGetExpiredLots.mockReturnValue(new Promise(() => {}));

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
    // "Low Stock" appears in both stat card and alert cards, use getAllByText
    const lowStockElements = screen.getAllByText('Low Stock');
    expect(lowStockElements.length).toBeGreaterThanOrEqual(1);
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
    const { container } = render(<Overview onNavigateToInventory={onNavigateToInventory} />);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    // Target the stat card in the grid (not the alert cards)
    const statCards = container.querySelectorAll('.grid > .card');
    await user.click(statCards[1]); // Low Stock is the 2nd stat card
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

  it('calls getExpiredLots on mount', async () => {
    render(<Overview onNavigateToInventory={vi.fn()} />);

    await waitFor(() => {
      expect(mockGetExpiredLots).toHaveBeenCalled();
    });
  });

  it('renders alerts section after loading', async () => {
    render(<Overview onNavigateToInventory={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Expired Reagent')).toBeInTheDocument();
    });
    // Alert header should show count
    expect(screen.getByText(/Active Alerts/)).toBeInTheDocument();
  });

  it('renders expired lot alert with detail', async () => {
    render(<Overview onNavigateToInventory={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Expired Reagent')).toBeInTheDocument();
    });
    // Detail should mention "Expired" and the lot number
    expect(screen.getByText(/Expired.*LOT-001/)).toBeInTheDocument();
  });

  it('renders low stock alerts from low stock reagents data', async () => {
    render(<Overview onNavigateToInventory={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Low Reagent A')).toBeInTheDocument();
    });
    expect(screen.getByText('2 / 10 vials')).toBeInTheDocument();
    expect(screen.getByText('Out Reagent C')).toBeInTheDocument();
    expect(screen.getByText('0 / 10 mL')).toBeInTheDocument();
  });

  it('shows no-alerts message when there are no alerts', async () => {
    mockGetExpiredLots.mockResolvedValue({ success: true, data: [] });
    mockGetLowStockReagents.mockResolvedValue({ success: true, data: [] });

    render(<Overview onNavigateToInventory={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('No active alerts. All items are within normal parameters.')).toBeInTheDocument();
    });
  });

  it('clicking an alert card navigates to inventory with correct filter', async () => {
    const onNavigateToInventory = vi.fn();
    const user = userEvent.setup();
    render(<Overview onNavigateToInventory={onNavigateToInventory} />);

    await waitFor(() => {
      expect(screen.getByText('Expired Reagent')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Expired Reagent'));
    expect(onNavigateToInventory).toHaveBeenCalledWith({ search: 'Expired Reagent' });
  });
});
