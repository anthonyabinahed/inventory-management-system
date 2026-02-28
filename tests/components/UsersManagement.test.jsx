import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ============ Mocks ============

const mockGetCurrentUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

const mockGetAllUsers = vi.fn();
vi.mock('@/actions/users', () => ({
  getAllUsers: () => mockGetAllUsers(),
}));

const mockInviteUser = vi.fn();
const mockRevokeUser = vi.fn();
const mockReactivateUser = vi.fn();
const mockUpdateUserRole = vi.fn();
const mockUpdateEmailAlertPreference = vi.fn();
vi.mock('@/actions/admin', () => ({
  inviteUser: (...args) => mockInviteUser(...args),
  revokeUser: (...args) => mockRevokeUser(...args),
  reactivateUser: (...args) => mockReactivateUser(...args),
  updateUserRole: (...args) => mockUpdateUserRole(...args),
  updateEmailAlertPreference: (...args) => mockUpdateEmailAlertPreference(...args),
}));

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    error: (...args) => mockToastError(...args),
    success: (...args) => mockToastSuccess(...args),
  },
}));

const { default: UsersManagement } = await import('@/components/UsersManagement');

// ============ Test Data ============

const CURRENT_USER_ID = 'admin-001';

const MOCK_USERS = [
  {
    id: CURRENT_USER_ID,
    email: 'admin@example.com',
    full_name: 'Admin User',
    role: 'admin',
    created_at: '2024-01-01T00:00:00Z',
    receive_email_alerts: true,
    is_active: true,
  },
  {
    id: 'user-002',
    email: 'john@example.com',
    full_name: 'John Doe',
    role: 'user',
    created_at: '2024-02-01T00:00:00Z',
    receive_email_alerts: false,
    is_active: true,
  },
  {
    id: 'user-003',
    email: 'jane@example.com',
    full_name: 'Jane Smith',
    role: 'user',
    created_at: '2024-03-01T00:00:00Z',
    receive_email_alerts: true,
    is_active: true,
  },
  {
    id: 'user-004',
    email: 'deactivated@example.com',
    full_name: 'Deactivated User',
    role: 'user',
    created_at: '2024-04-01T00:00:00Z',
    receive_email_alerts: false,
    is_active: false,
  },
];

function setupDefaults() {
  mockGetCurrentUser.mockResolvedValue({ id: CURRENT_USER_ID });
  mockGetAllUsers.mockResolvedValue({ success: true, data: MOCK_USERS });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset confirm to always return true
  window.confirm = vi.fn(() => true);
});

// ============ Tests ============

describe('UsersManagement', () => {
  // --- Rendering ---

  it('renders user table after loading', async () => {
    setupDefaults();
    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Deactivated User')).toBeInTheDocument();
    });
  });

  it('shows loading spinner initially', () => {
    setupDefaults();
    render(<UsersManagement />);
    expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
  });

  it('shows error toast when loadData fails', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: CURRENT_USER_ID });
    mockGetAllUsers.mockResolvedValue({ success: false, errorMessage: 'DB error' });

    render(<UsersManagement />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to load users');
    });
  });

  // --- Self-protection ---

  it('shows "You" badge for current user instead of deactivate button', async () => {
    setupDefaults();
    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    // Current user's row should have "You" badge
    expect(screen.getByText('You')).toBeInTheDocument();

    // Active non-current users should have deactivate buttons (John + Jane)
    const deactivateButtons = screen.getAllByText('Deactivate');
    expect(deactivateButtons.length).toBe(4); // 2 users × 2 (desktop + mobile)
  });

  it('disables role dropdown for current user', async () => {
    setupDefaults();
    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    // Admin user's select should be disabled
    const adminRow = screen.getByText('Admin User').closest('tr');
    const adminSelect = within(adminRow).getByRole('combobox');
    expect(adminSelect).toBeDisabled();

    // Other active users' selects should be enabled
    const johnRow = screen.getByText('John Doe').closest('tr');
    const johnSelect = within(johnRow).getByRole('combobox');
    expect(johnSelect).not.toBeDisabled();
  });

  // --- Role changes ---

  it('calls updateUserRole when role dropdown changes', async () => {
    setupDefaults();
    mockUpdateUserRole.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const johnRow = screen.getByText('John Doe').closest('tr');
    const roleSelect = within(johnRow).getByRole('combobox');

    await user.selectOptions(roleSelect, 'admin');

    await waitFor(() => {
      expect(mockUpdateUserRole).toHaveBeenCalledWith('user-002', 'admin');
      expect(mockToastSuccess).toHaveBeenCalledWith('Role updated successfully');
    });
  });

  // --- Deactivate ---

  it('calls revokeUser after confirm dialog', async () => {
    setupDefaults();
    mockRevokeUser.mockResolvedValue({ success: true, errorMessage: null });
    const user = userEvent.setup();

    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const johnRow = screen.getByText('John Doe').closest('tr');
    const deactivateBtn = within(johnRow).getAllByRole('button')[0];
    await user.click(deactivateBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockRevokeUser).toHaveBeenCalledWith('user-002');
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });

  it('does not call revokeUser when confirm is cancelled', async () => {
    setupDefaults();
    window.confirm = vi.fn(() => false);
    const user = userEvent.setup();

    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const johnRow = screen.getByText('John Doe').closest('tr');
    const deactivateBtn = within(johnRow).getAllByRole('button')[0];
    await user.click(deactivateBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockRevokeUser).not.toHaveBeenCalled();
  });

  // --- Deactivated user display ---

  it('shows Deactivated badge for inactive users', async () => {
    setupDefaults();
    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Deactivated User')).toBeInTheDocument();
    });

    const deactivatedRow = screen.getByText('Deactivated User').closest('tr');
    expect(within(deactivatedRow).getByText('Deactivated')).toBeInTheDocument();
  });

  it('shows dimmed styling for deactivated users', async () => {
    setupDefaults();
    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Deactivated User')).toBeInTheDocument();
    });

    const deactivatedRow = screen.getByText('Deactivated User').closest('tr');
    const nameDiv = within(deactivatedRow).getByText('Deactivated User').closest('.font-bold');
    expect(nameDiv.className).toContain('opacity-50');
  });

  it('shows Reactivate button for deactivated users', async () => {
    setupDefaults();
    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Deactivated User')).toBeInTheDocument();
    });

    const deactivatedRow = screen.getByText('Deactivated User').closest('tr');
    expect(within(deactivatedRow).getByText('Reactivate')).toBeInTheDocument();
  });

  it('calls reactivateUser when clicking Reactivate', async () => {
    setupDefaults();
    mockReactivateUser.mockResolvedValue({ success: true, errorMessage: null });
    const user = userEvent.setup();

    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Deactivated User')).toBeInTheDocument();
    });

    const deactivatedRow = screen.getByText('Deactivated User').closest('tr');
    const reactivateBtn = within(deactivatedRow).getByText('Reactivate');
    await user.click(reactivateBtn);

    await waitFor(() => {
      expect(mockReactivateUser).toHaveBeenCalledWith('user-004');
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });

  it('disables role dropdown for deactivated users', async () => {
    setupDefaults();
    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Deactivated User')).toBeInTheDocument();
    });

    const deactivatedRow = screen.getByText('Deactivated User').closest('tr');
    const roleSelect = within(deactivatedRow).getByRole('combobox');
    expect(roleSelect).toBeDisabled();
  });

  it('disables email alerts toggle for deactivated users', async () => {
    setupDefaults();
    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Deactivated User')).toBeInTheDocument();
    });

    const deactivatedRow = screen.getByText('Deactivated User').closest('tr');
    const alertToggle = within(deactivatedRow).getByRole('checkbox');
    expect(alertToggle).toBeDisabled();
  });

  // --- Invite Modal ---

  it('opens invite modal when clicking Invite User button', async () => {
    setupDefaults();
    const user = userEvent.setup();

    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    // Click the invite button (desktop text)
    await user.click(screen.getByText('Invite User'));

    await waitFor(() => {
      expect(screen.getByText('Invite New User')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('colleague@company.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    });
  });

  it('calls inviteUser with form data on submit', async () => {
    setupDefaults();
    mockInviteUser.mockResolvedValue({ success: true, errorMessage: null });
    const user = userEvent.setup();

    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    // Open modal
    await user.click(screen.getByText('Invite User'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('colleague@company.com')).toBeInTheDocument();
    });

    // Fill form
    await user.type(screen.getByPlaceholderText('colleague@company.com'), 'new@example.com');
    await user.type(screen.getByPlaceholderText('John Doe'), 'New Person');

    // Submit
    await user.click(screen.getByText('Send Invitation'));

    await waitFor(() => {
      expect(mockInviteUser).toHaveBeenCalledWith('new@example.com', 'New Person', 'user');
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });

  it('shows error toast when inviteUser fails', async () => {
    setupDefaults();
    mockInviteUser.mockResolvedValue({ success: false, errorMessage: 'Email already exists' });
    const user = userEvent.setup();

    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Invite User'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('colleague@company.com')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('colleague@company.com'), 'existing@example.com');
    await user.type(screen.getByPlaceholderText('John Doe'), 'Existing User');
    await user.click(screen.getByText('Send Invitation'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Email already exists');
    });
  });

  it('closes modal on Cancel', async () => {
    setupDefaults();
    const user = userEvent.setup();

    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Invite User'));

    await waitFor(() => {
      expect(screen.getByText('Invite New User')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Invite New User')).not.toBeInTheDocument();
    });
  });

  // --- Email Alerts Toggle ---

  it('renders alerts toggle for each user row', async () => {
    setupDefaults();
    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    const toggles = screen.getAllByRole('checkbox');
    expect(toggles.length).toBe(4); // One per user
  });

  it('toggle is checked when receive_email_alerts is true', async () => {
    setupDefaults();
    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    const adminRow = screen.getByText('Admin User').closest('tr');
    const adminToggle = within(adminRow).getByRole('checkbox');
    expect(adminToggle).toBeChecked();

    const janeRow = screen.getByText('Jane Smith').closest('tr');
    const janeToggle = within(janeRow).getByRole('checkbox');
    expect(janeToggle).toBeChecked();
  });

  it('toggle is unchecked when receive_email_alerts is false', async () => {
    setupDefaults();
    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const johnRow = screen.getByText('John Doe').closest('tr');
    const johnToggle = within(johnRow).getByRole('checkbox');
    expect(johnToggle).not.toBeChecked();
  });

  it('calls updateEmailAlertPreference on toggle change', async () => {
    setupDefaults();
    mockUpdateEmailAlertPreference.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const johnRow = screen.getByText('John Doe').closest('tr');
    const johnToggle = within(johnRow).getByRole('checkbox');
    await user.click(johnToggle);

    await waitFor(() => {
      expect(mockUpdateEmailAlertPreference).toHaveBeenCalledWith('user-002', true);
      expect(mockToastSuccess).toHaveBeenCalledWith('Email alerts enabled');
    });
  });

  it('shows error toast on failed alert toggle', async () => {
    setupDefaults();
    mockUpdateEmailAlertPreference.mockResolvedValue({
      success: false,
      errorMessage: 'Permission denied',
    });
    const user = userEvent.setup();

    render(<UsersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const johnRow = screen.getByText('John Doe').closest('tr');
    const johnToggle = within(johnRow).getByRole('checkbox');
    await user.click(johnToggle);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Permission denied');
    });
  });
});
