import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  TrendingUp: (props) => <span data-testid="trending-up-icon" {...props} />,
  TrendingDown: (props) => <span data-testid="trending-down-icon" {...props} />,
  ArrowUpDown: (props) => <span data-testid="arrow-updown-icon" {...props} />,
}));

// Mock recharts — jsdom can't render SVG
vi.mock('recharts', () => {
  const Wrapper = ({ children, ...props }) => <div data-testid="recharts-responsive" {...props}>{children}</div>;
  const Chart = ({ children, data, ...props }) => <div data-testid="recharts-bar-chart" data-count={data?.length}>{children}</div>;
  const Noop = ({ children }) => <>{children}</>;
  return {
    ResponsiveContainer: Wrapper,
    BarChart: Chart,
    Bar: () => <div data-testid="recharts-bar" />,
    Cell: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

// Mock analytics actions
const mockGetMovementTrends = vi.fn();
const mockGetTopConsumedItems = vi.fn();
const mockGetSectorConsumption = vi.fn();
const mockGetMachineConsumption = vi.fn();

vi.mock('@/actions/analytics', () => ({
  getMovementTrends: (...args) => mockGetMovementTrends(...args),
  getTopConsumedItems: (...args) => mockGetTopConsumedItems(...args),
  getSectorConsumption: (...args) => mockGetSectorConsumption(...args),
  getMachineConsumption: (...args) => mockGetMachineConsumption(...args),
}));

// Mock inventory filter options
const mockGetFilterOptions = vi.fn();
vi.mock('@/actions/inventory', () => ({
  getFilterOptions: (...args) => mockGetFilterOptions(...args),
}));

const ConsumptionDashboard = (await import('@/components/analytics/ConsumptionDashboard')).default;

const defaultTrendsResponse = {
  success: true,
  data: {
    trends: [
      { key: '2026-01-15', label: 'Jan 15', in: 50, out: 20 },
      { key: '2026-01-16', label: 'Jan 16', in: 30, out: 15 },
    ],
    totalIn: 80,
    totalOut: 35,
  },
};

const defaultTopConsumedResponse = {
  success: true,
  data: [
    { id: 'r1', name: 'Reagent Alpha', category: 'reagent', unit: 'vials', totalOut: 50 },
    { id: 'r2', name: 'Control Beta', category: 'control', unit: 'kits', totalOut: 30 },
  ],
};

const defaultSectorResponse = {
  success: true,
  data: [
    { sector: 'Hematology', totalOut: 100 },
    { sector: 'Chemistry', totalOut: 60 },
  ],
};

const defaultMachineResponse = {
  success: true,
  data: [
    { machine: 'Machine X', totalOut: 80 },
    { machine: 'Machine Y', totalOut: 45 },
  ],
};

const defaultFilterOptions = {
  success: true,
  data: {
    sectors: ['Hematology', 'Chemistry'],
    machines: ['Machine X', 'Machine Y'],
    suppliers: [],
    locations: [],
    categories: [],
  },
};

function mockAllDefaults() {
  mockGetMovementTrends.mockResolvedValue(defaultTrendsResponse);
  mockGetTopConsumedItems.mockResolvedValue(defaultTopConsumedResponse);
  mockGetSectorConsumption.mockResolvedValue(defaultSectorResponse);
  mockGetMachineConsumption.mockResolvedValue(defaultMachineResponse);
  mockGetFilterOptions.mockResolvedValue(defaultFilterOptions);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAllDefaults();
});

describe('ConsumptionDashboard', () => {
  it('shows loading spinner before data resolves', () => {
    mockGetMovementTrends.mockReturnValue(new Promise(() => {}));
    mockGetTopConsumedItems.mockReturnValue(new Promise(() => {}));
    mockGetSectorConsumption.mockReturnValue(new Promise(() => {}));
    mockGetMachineConsumption.mockReturnValue(new Promise(() => {}));

    const { container } = render(<ConsumptionDashboard />);
    expect(container.querySelector('.loading')).toBeInTheDocument();
  });

  it('renders stat cards with correct values after loading', async () => {
    render(<ConsumptionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('80')).toBeInTheDocument();
    });
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('+45')).toBeInTheDocument(); // net change: 80-35=45
  });

  it('renders stat card labels', async () => {
    render(<ConsumptionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Stock In')).toBeInTheDocument();
    });
    expect(screen.getByText('Stock Out')).toBeInTheDocument();
    expect(screen.getByText('Net Change')).toBeInTheDocument();
  });

  it('shows negative net change without + prefix', async () => {
    mockGetMovementTrends.mockResolvedValue({
      success: true,
      data: { trends: [], totalIn: 10, totalOut: 25 },
    });

    render(<ConsumptionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('-15')).toBeInTheDocument();
    });
  });

  it('shows error state with retry button when action fails', async () => {
    mockGetMovementTrends.mockResolvedValue({
      success: false,
      errorMessage: 'Database connection failed',
    });

    render(<ConsumptionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('retry button re-fetches data', async () => {
    mockGetMovementTrends.mockResolvedValueOnce({
      success: false,
      errorMessage: 'Temporary failure',
    });

    render(<ConsumptionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Temporary failure')).toBeInTheDocument();
    });

    // Now set up success response
    mockAllDefaults();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('Stock In')).toBeInTheDocument();
    });
  });

  it('shows "No movements in this period" when trend data is empty', async () => {
    mockGetMovementTrends.mockResolvedValue({
      success: true,
      data: { trends: [], totalIn: 0, totalOut: 0 },
    });

    render(<ConsumptionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No movements in this period')).toBeInTheDocument();
    });
  });

  it('shows "No consumption data" when topConsumed is empty', async () => {
    mockGetTopConsumedItems.mockResolvedValue({ success: true, data: [] });

    render(<ConsumptionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No consumption data')).toBeInTheDocument();
    });
  });

  it('shows "No sector data" when sectorData is empty', async () => {
    mockGetSectorConsumption.mockResolvedValue({ success: true, data: [] });

    render(<ConsumptionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No sector data')).toBeInTheDocument();
    });
  });

  it('calls all 4 analytics actions and getFilterOptions on mount', async () => {
    render(<ConsumptionDashboard />);

    await waitFor(() => {
      expect(mockGetMovementTrends).toHaveBeenCalledTimes(1);
    });
    expect(mockGetTopConsumedItems).toHaveBeenCalledTimes(1);
    expect(mockGetSectorConsumption).toHaveBeenCalledTimes(1);
    expect(mockGetMachineConsumption).toHaveBeenCalledTimes(1);
    expect(mockGetFilterOptions).toHaveBeenCalledTimes(1);
  });

  it('getMovementTrends called with default 30d, null sector, null machine', async () => {
    render(<ConsumptionDashboard />);

    await waitFor(() => {
      expect(mockGetMovementTrends).toHaveBeenCalledWith('30d', null, null);
    });
  });

  it('changing date range triggers data reload', async () => {
    const user = userEvent.setup();
    render(<ConsumptionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Stock In')).toBeInTheDocument();
    });

    // Click the 7d button
    await user.click(screen.getByRole('button', { name: '7d' }));

    await waitFor(() => {
      // Second call should be with '7d'
      expect(mockGetMovementTrends).toHaveBeenCalledWith('7d', null, null);
    });
  });

  it('selecting a sector calls getMovementTrends with that sector', async () => {
    const user = userEvent.setup();
    render(<ConsumptionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Stock In')).toBeInTheDocument();
    });

    // Select Hematology sector
    const sectorSelect = screen.getByDisplayValue('All Sectors');
    await user.selectOptions(sectorSelect, 'Hematology');

    await waitFor(() => {
      expect(mockGetMovementTrends).toHaveBeenCalledWith('30d', 'Hematology', null);
    });
  });

  it('selecting a machine calls getMovementTrends with that machine', async () => {
    const user = userEvent.setup();
    render(<ConsumptionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Stock In')).toBeInTheDocument();
    });

    const machineSelect = screen.getByDisplayValue('All Machines');
    await user.selectOptions(machineSelect, 'Machine X');

    await waitFor(() => {
      expect(mockGetMovementTrends).toHaveBeenCalledWith('30d', null, 'Machine X');
    });
  });

  it('clicking Machine toggle shows machine chart section', async () => {
    const user = userEvent.setup();
    render(<ConsumptionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Consumption by Sector')).toBeInTheDocument();
    });

    // Click Machine toggle
    await user.click(screen.getByRole('button', { name: 'Machine' }));

    await waitFor(() => {
      expect(screen.getByText('Consumption by Machine')).toBeInTheDocument();
    });
  });

  it('shows "No machine data" when machineData is empty and machine view selected', async () => {
    mockGetMachineConsumption.mockResolvedValue({ success: true, data: [] });
    const user = userEvent.setup();
    render(<ConsumptionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Stock In')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Machine' }));

    await waitFor(() => {
      expect(screen.getByText('No machine data')).toBeInTheDocument();
    });
  });
});
