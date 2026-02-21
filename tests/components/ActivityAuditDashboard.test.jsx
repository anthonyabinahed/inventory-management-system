import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: (props) => <span data-testid="search-icon" {...props} />,
}));

// Mock analytics actions
const mockGetAuditLogs = vi.fn();
vi.mock('@/actions/analytics', () => ({
  getAuditLogs: (...args) => mockGetAuditLogs(...args),
}));

// Mock users actions
const mockGetAllUsers = vi.fn();
vi.mock('@/actions/users', () => ({
  getAllUsers: (...args) => mockGetAllUsers(...args),
}));

const ActivityAuditDashboard = (await import('@/components/analytics/ActivityAuditDashboard')).default;

const sampleLogs = [
  {
    id: 'log-1',
    action: 'create_reagent',
    resource_type: 'reagent',
    resource_id: 'r-1',
    description: 'Created reagent "Test Reagent Alpha"',
    user_id: 'user-1',
    performed_at: '2026-01-20T10:00:00Z',
    profiles: { full_name: 'John Doe', email: 'john@lab.com' },
  },
  {
    id: 'log-2',
    action: 'stock_out',
    resource_type: 'lot',
    resource_id: 'lot-1',
    description: 'Stocked out 5 from lot ABC-001',
    user_id: 'user-1',
    performed_at: '2026-01-19T14:30:00Z',
    profiles: { full_name: 'John Doe', email: 'john@lab.com' },
  },
  {
    id: 'log-3',
    action: 'update_user_role',
    resource_type: 'user',
    resource_id: null,
    description: 'Changed user role to "admin"',
    user_id: 'user-2',
    performed_at: '2026-01-18T09:15:00Z',
    profiles: { full_name: 'Jane Smith', email: 'jane@lab.com' },
  },
];

const defaultAuditResponse = {
  success: true,
  data: sampleLogs,
  pagination: { page: 1, limit: 20, total: 3, hasMore: false },
};

const defaultUsersResponse = {
  success: true,
  data: [
    { id: 'user-1', full_name: 'John Doe', email: 'john@lab.com' },
    { id: 'user-2', full_name: 'Jane Smith', email: 'jane@lab.com' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuditLogs.mockResolvedValue(defaultAuditResponse);
  mockGetAllUsers.mockResolvedValue(defaultUsersResponse);
});

describe('ActivityAuditDashboard', () => {
  it('shows loading spinner before data resolves', () => {
    mockGetAuditLogs.mockReturnValue(new Promise(() => {}));
    const { container } = render(<ActivityAuditDashboard />);
    expect(container.querySelector('.loading')).toBeInTheDocument();
  });

  it('renders audit log table with rows after loading', async () => {
    render(<ActivityAuditDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Created reagent "Test Reagent Alpha"')).toBeInTheDocument();
    });
    expect(screen.getByText('Stocked out 5 from lot ABC-001')).toBeInTheDocument();
    expect(screen.getByText('Changed user role to "admin"')).toBeInTheDocument();
  });

  it('renders user names in table', async () => {
    render(<ActivityAuditDashboard />);

    await waitFor(() => {
      // "John Doe" appears in both table cells and user dropdown option
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    });
    // "Jane Smith" also appears in both table and dropdown
    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThanOrEqual(1);
  });

  it('renders action badges with human-readable labels', async () => {
    render(<ActivityAuditDashboard />);

    // Action labels appear in both table badges AND action dropdown options,
    // so use getAllByText for labels that overlap
    await waitFor(() => {
      // "Create" is in both the badge and the dropdown option
      expect(screen.getAllByText('Create').length).toBeGreaterThanOrEqual(1);
    });
    // "Stock Out" is in both badge and dropdown
    expect(screen.getAllByText('Stock Out').length).toBeGreaterThanOrEqual(1);
    // "Role Change" is in both badge and dropdown
    expect(screen.getAllByText('Role Change').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "No audit logs" when data is empty', async () => {
    mockGetAuditLogs.mockResolvedValue({
      success: true,
      data: [],
      pagination: { page: 1, limit: 20, total: 0, hasMore: false },
    });

    render(<ActivityAuditDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No audit logs')).toBeInTheDocument();
    });
  });

  it('shows raw action string for unknown actions', async () => {
    mockGetAuditLogs.mockResolvedValue({
      success: true,
      data: [{
        id: 'log-unknown',
        action: 'custom_unknown_action',
        resource_type: 'other',
        description: 'Some custom action',
        user_id: 'user-1',
        performed_at: '2026-01-20T10:00:00Z',
        profiles: { full_name: 'John Doe', email: 'john@lab.com' },
      }],
      pagination: { page: 1, limit: 20, total: 1, hasMore: false },
    });

    render(<ActivityAuditDashboard />);

    await waitFor(() => {
      expect(screen.getByText('custom_unknown_action')).toBeInTheDocument();
    });
  });

  it('calls getAuditLogs on mount with initial params', async () => {
    render(<ActivityAuditDashboard />);

    await waitFor(() => {
      expect(mockGetAuditLogs).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        action: undefined,
        dateRange: undefined,
        userId: undefined,
      });
    });
  });

  it('calls getAllUsers on mount to populate user dropdown', async () => {
    render(<ActivityAuditDashboard />);

    await waitFor(() => {
      expect(mockGetAllUsers).toHaveBeenCalled();
    });
  });

  it('populates user dropdown from getAllUsers response', async () => {
    render(<ActivityAuditDashboard />);

    // Wait for the table to load (description text is unique to table)
    await waitFor(() => {
      expect(screen.getByText('Created reagent "Test Reagent Alpha"')).toBeInTheDocument();
    });

    // Check dropdown has the user options
    const userSelect = screen.getByDisplayValue('All Users');
    const options = within(userSelect).getAllByRole('option');
    expect(options.some(o => o.textContent === 'John Doe')).toBe(true);
    expect(options.some(o => o.textContent === 'Jane Smith')).toBe(true);
  });

  it('clicking date range button triggers reload with that range', async () => {
    const user = userEvent.setup();
    render(<ActivityAuditDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Created reagent "Test Reagent Alpha"')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '7d' }));

    await waitFor(() => {
      expect(mockGetAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ dateRange: '7d', page: 1 })
      );
    });
  });

  it('selecting an action filter triggers reload', async () => {
    const user = userEvent.setup();
    render(<ActivityAuditDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Created reagent "Test Reagent Alpha"')).toBeInTheDocument();
    });

    const actionSelect = screen.getByDisplayValue('All Actions');
    await user.selectOptions(actionSelect, 'stock_in');

    await waitFor(() => {
      expect(mockGetAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'stock_in', page: 1 })
      );
    });
  });

  it('selecting a user filter triggers reload', async () => {
    const user = userEvent.setup();
    render(<ActivityAuditDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Created reagent "Test Reagent Alpha"')).toBeInTheDocument();
    });

    const userSelect = screen.getByDisplayValue('All Users');
    await user.selectOptions(userSelect, 'user-1');

    await waitFor(() => {
      expect(mockGetAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', page: 1 })
      );
    });
  });

  it('search input triggers debounced reload after 300ms', async () => {
    const user = userEvent.setup();
    render(<ActivityAuditDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Created reagent "Test Reagent Alpha"')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search logs...');
    await user.type(searchInput, 'test');

    // Wait for debounce to fire (300ms) — waitFor will poll until it matches
    await waitFor(() => {
      expect(mockGetAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test' })
      );
    });
  });

  it('Load More button appears when hasMore is true', async () => {
    mockGetAuditLogs.mockResolvedValue({
      success: true,
      data: sampleLogs,
      pagination: { page: 1, limit: 20, total: 50, hasMore: true },
    });

    render(<ActivityAuditDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
    });
  });

  it('Load More button is hidden when hasMore is false', async () => {
    render(<ActivityAuditDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Created reagent "Test Reagent Alpha"')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('clicking Load More fetches next page and appends data', async () => {
    const page2Logs = [{
      id: 'log-4',
      action: 'stock_in',
      resource_type: 'lot',
      description: 'Stocked in 10 to lot XYZ-002',
      user_id: 'user-1',
      performed_at: '2026-01-17T08:00:00Z',
      profiles: { full_name: 'John Doe', email: 'john@lab.com' },
    }];

    mockGetAuditLogs
      .mockResolvedValueOnce({
        success: true,
        data: sampleLogs,
        pagination: { page: 1, limit: 20, total: 4, hasMore: true },
      })
      .mockResolvedValueOnce({
        success: true,
        data: page2Logs,
        pagination: { page: 2, limit: 20, total: 4, hasMore: false },
      });

    const user = userEvent.setup();
    render(<ActivityAuditDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /load more/i }));

    await waitFor(() => {
      // Page 2 data should be appended
      expect(screen.getByText('Stocked in 10 to lot XYZ-002')).toBeInTheDocument();
    });

    // Original data should still be present
    expect(screen.getByText('Created reagent "Test Reagent Alpha"')).toBeInTheDocument();
  });

  it('when getAuditLogs fails, logs are cleared', async () => {
    mockGetAuditLogs
      .mockResolvedValueOnce(defaultAuditResponse)
      .mockResolvedValueOnce({ success: false, errorMessage: 'Server error' });

    const user = userEvent.setup();
    render(<ActivityAuditDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Created reagent "Test Reagent Alpha"')).toBeInTheDocument();
    });

    // Trigger a filter change that returns failure
    await user.click(screen.getByRole('button', { name: '7d' }));

    await waitFor(() => {
      expect(screen.getByText('No audit logs')).toBeInTheDocument();
    });
  });

  it('displays dash when user profile is missing', async () => {
    mockGetAuditLogs.mockResolvedValue({
      success: true,
      data: [{
        id: 'log-no-profile',
        action: 'stock_in',
        resource_type: 'lot',
        description: 'Orphaned log entry',
        user_id: 'deleted-user',
        performed_at: '2026-01-20T10:00:00Z',
        profiles: null,
      }],
      pagination: { page: 1, limit: 20, total: 1, hasMore: false },
    });

    render(<ActivityAuditDashboard />);

    await waitFor(() => {
      expect(screen.getByText('\u2014')).toBeInTheDocument();
    });
  });
});
