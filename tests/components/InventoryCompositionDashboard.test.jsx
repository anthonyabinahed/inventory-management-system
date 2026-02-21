import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Package: (props) => <span data-testid="package-icon" {...props} />,
  MapPin: (props) => <span data-testid="mappin-icon" {...props} />,
  Monitor: (props) => <span data-testid="monitor-icon" {...props} />,
  Layers: (props) => <span data-testid="layers-icon" {...props} />,
}));

// Mock recharts — jsdom can't render SVG
vi.mock('recharts', () => {
  const Wrapper = ({ children }) => <div data-testid="recharts-responsive">{children}</div>;
  const ChartComponent = ({ children }) => <div data-testid="recharts-chart">{children}</div>;
  return {
    ResponsiveContainer: Wrapper,
    PieChart: ChartComponent,
    Pie: () => <div data-testid="recharts-pie" />,
    Cell: () => null,
    BarChart: ChartComponent,
    Bar: () => <div data-testid="recharts-bar" />,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

// Mock analytics action
const mockGetInventoryComposition = vi.fn();
vi.mock('@/actions/analytics', () => ({
  getInventoryComposition: (...args) => mockGetInventoryComposition(...args),
}));

const InventoryCompositionDashboard = (await import('@/components/analytics/InventoryCompositionDashboard')).default;

const defaultCompositionResponse = {
  success: true,
  data: {
    totalItems: 42,
    totalQuantity: 1250,
    belowMinimum: 5,
    outOfStock: 3,
    categoryDistribution: [
      { category: 'reagent', count: 20, totalQty: 800 },
      { category: 'control', count: 10, totalQty: 250 },
      { category: 'calibrator', count: 5, totalQty: 100 },
      { category: 'consumable', count: 4, totalQty: 60 },
      { category: 'solution', count: 3, totalQty: 40 },
    ],
    stockCoverage: {
      aboveMinimum: 34,
      belowMinimum: 5,
      outOfStock: 3,
    },
    sectorBreakdown: [
      { sector: 'Hematology', totalItems: 15, alertItems: 3, totalQty: 500 },
      { sector: 'Chemistry', totalItems: 12, alertItems: 2, totalQty: 350 },
      { sector: 'Serology', totalItems: 8, alertItems: 1, totalQty: 200 },
    ],
    storageUtilization: [
      { location: 'Fridge A', count: 18 },
      { location: 'Room B', count: 12 },
      { location: 'Shelf C', count: 8 },
    ],
    machineDependency: [
      { machine: 'Machine X', totalItems: 10, alertItems: 2 },
      { machine: 'Machine Y', totalItems: 8, alertItems: 1 },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetInventoryComposition.mockResolvedValue(defaultCompositionResponse);
});

describe('InventoryCompositionDashboard', () => {
  it('shows loading spinner before data resolves', () => {
    mockGetInventoryComposition.mockReturnValue(new Promise(() => {}));
    const { container } = render(<InventoryCompositionDashboard />);
    expect(container.querySelector('.loading')).toBeInTheDocument();
  });

  it('renders stat cards with correct values', async () => {
    render(<InventoryCompositionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
    expect(screen.getByText('1,250')).toBeInTheDocument();
    // "3" and "2" appear in multiple places (stat cards + stock coverage counts),
    // so verify they exist in the DOM via getAllByText
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('renders stat card labels', async () => {
    render(<InventoryCompositionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Total Items')).toBeInTheDocument();
    });
    expect(screen.getByText('Total Quantity')).toBeInTheDocument();
    expect(screen.getByText('Storage Locations')).toBeInTheDocument();
    expect(screen.getByText('Machines')).toBeInTheDocument();
  });

  it('shows error state with retry button', async () => {
    mockGetInventoryComposition.mockResolvedValue({
      success: false,
      errorMessage: 'Failed to load composition',
    });

    render(<InventoryCompositionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load composition')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('retry button re-fetches data', async () => {
    mockGetInventoryComposition.mockResolvedValueOnce({
      success: false,
      errorMessage: 'Temp error',
    });

    render(<InventoryCompositionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Temp error')).toBeInTheDocument();
    });

    mockGetInventoryComposition.mockResolvedValue(defaultCompositionResponse);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('Total Items')).toBeInTheDocument();
    });
    expect(mockGetInventoryComposition).toHaveBeenCalledTimes(2);
  });

  it('calls getInventoryComposition on mount', async () => {
    render(<InventoryCompositionDashboard />);

    await waitFor(() => {
      expect(mockGetInventoryComposition).toHaveBeenCalledTimes(1);
    });
  });

  it('renders stock coverage section with counts and percentages', async () => {
    render(<InventoryCompositionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Above Minimum')).toBeInTheDocument();
    });
    expect(screen.getByText('Below Minimum')).toBeInTheDocument();
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();

    // 34/42 = 81%
    expect(screen.getByText(/81%/)).toBeInTheDocument();
    // 5/42 = 12%
    expect(screen.getByText(/12%/)).toBeInTheDocument();
    // 3/42 = 7%
    expect(screen.getByText(/7%/)).toBeInTheDocument();
  });

  it('pie mode toggle switches between Items and Stock Units', async () => {
    const user = userEvent.setup();
    render(<InventoryCompositionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Number of distinct items per category')).toBeInTheDocument();
    });

    // Click "Stock Units" toggle
    await user.click(screen.getByRole('button', { name: 'Stock Units' }));

    await waitFor(() => {
      expect(screen.getByText('Total stock units per category')).toBeInTheDocument();
    });
  });

  it('breakdown toggle switches between Sector and Machine', async () => {
    const user = userEvent.setup();
    render(<InventoryCompositionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Sector Breakdown')).toBeInTheDocument();
    });

    // Click "Machine" toggle
    const machineButtons = screen.getAllByRole('button', { name: 'Machine' });
    await user.click(machineButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Machine Breakdown')).toBeInTheDocument();
    });
  });

  it('shows "No items found" when categoryDistribution is empty', async () => {
    mockGetInventoryComposition.mockResolvedValue({
      success: true,
      data: {
        ...defaultCompositionResponse.data,
        categoryDistribution: [],
      },
    });

    render(<InventoryCompositionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });
  });

  it('shows "No sector data" when sectorBreakdown is empty', async () => {
    mockGetInventoryComposition.mockResolvedValue({
      success: true,
      data: {
        ...defaultCompositionResponse.data,
        sectorBreakdown: [],
      },
    });

    render(<InventoryCompositionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No sector data')).toBeInTheDocument();
    });
  });

  it('shows "No machine data" when machineDependency is empty and machine view selected', async () => {
    mockGetInventoryComposition.mockResolvedValue({
      success: true,
      data: {
        ...defaultCompositionResponse.data,
        machineDependency: [],
      },
    });

    const user = userEvent.setup();
    render(<InventoryCompositionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Total Items')).toBeInTheDocument();
    });

    const machineButtons = screen.getAllByRole('button', { name: 'Machine' });
    await user.click(machineButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('No machine data')).toBeInTheDocument();
    });
  });

  it('does not render storage utilization section when empty', async () => {
    mockGetInventoryComposition.mockResolvedValue({
      success: true,
      data: {
        ...defaultCompositionResponse.data,
        storageUtilization: [],
      },
    });

    render(<InventoryCompositionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Total Items')).toBeInTheDocument();
    });

    expect(screen.queryByText('Storage Utilization')).not.toBeInTheDocument();
  });

  it('stock coverage percentages handle zero totalItems', async () => {
    mockGetInventoryComposition.mockResolvedValue({
      success: true,
      data: {
        ...defaultCompositionResponse.data,
        totalItems: 0,
        totalQuantity: 0,
        categoryDistribution: [],
        stockCoverage: { aboveMinimum: 0, belowMinimum: 0, outOfStock: 0 },
        sectorBreakdown: [],
        storageUtilization: [],
        machineDependency: [],
      },
    });

    render(<InventoryCompositionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Above Minimum')).toBeInTheDocument();
    });

    // With 0 total items, all percentages should be 0%
    const percentElements = screen.getAllByText(/0%/);
    expect(percentElements.length).toBe(3);
  });
});
