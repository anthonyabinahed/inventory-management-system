import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock auth actions
const mockSetSessionFromTokens = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockVerifyInviteToken = vi.fn();
const mockUpdatePassword = vi.fn();
const mockSignOut = vi.fn();
vi.mock('@/actions/auth', () => ({
  setSessionFromTokens: (...args) => mockSetSessionFromTokens(...args),
  getCurrentUser: () => mockGetCurrentUser(),
  verifyInviteToken: (...args) => mockVerifyInviteToken(...args),
  updatePassword: (...args) => mockUpdatePassword(...args),
  signOut: () => mockSignOut(),
}));

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    error: (...args) => mockToastError(...args),
    success: (...args) => mockToastSuccess(...args),
  },
}));

vi.mock('@/config', () => ({
  default: {
    routes: { login: '/login', acceptInvite: '/accept-invite' },
    colors: { theme: 'light' },
  },
}));

const { default: AcceptInvitePage } = await import('@/app/accept-invite/page');

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(null);
  mockSearchParams.delete('token_hash');
  mockSearchParams.delete('type');
  Object.defineProperty(window, 'location', {
    value: { hash: '', pathname: '/accept-invite', href: 'http://localhost/accept-invite' },
    writable: true,
  });
  window.history.replaceState = vi.fn();
});

describe('Accept Invite Page', () => {
  it('shows error when no tokens and not authenticated', async () => {
    render(<AcceptInvitePage />);
    await waitFor(() => {
      expect(screen.getByText(/invalid invitation/i)).toBeInTheDocument();
    });
  });

  it('shows "Go to Login" link on error', async () => {
    render(<AcceptInvitePage />);
    await waitFor(() => {
      expect(screen.getByText(/go to login/i)).toBeInTheDocument();
    });
  });

  it('shows form when hash contains valid tokens', async () => {
    window.location.hash = '#access_token=test-access&refresh_token=test-refresh';
    mockSetSessionFromTokens.mockResolvedValue({
      user: { id: 'user-123', email: 'invited@example.com' },
      errorMessage: null,
    });

    render(<AcceptInvitePage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('At least 8 characters')).toBeInTheDocument();
      expect(screen.getByText('invited@example.com')).toBeInTheDocument();
    });
  });

  it('shows form when query params contain invite token', async () => {
    mockSearchParams.set('token_hash', 'valid-hash');
    mockSearchParams.set('type', 'invite');
    mockVerifyInviteToken.mockResolvedValue({
      user: { id: 'user-123', email: 'invited@example.com' },
      errorMessage: null,
    });

    render(<AcceptInvitePage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('At least 8 characters')).toBeInTheDocument();
    });
    expect(mockVerifyInviteToken).toHaveBeenCalledWith('valid-hash');
  });

  it('shows error when hash contains error param', async () => {
    window.location.hash = '#error=invalid_token&error_description=Invitation+has+expired';

    render(<AcceptInvitePage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /invalid invitation/i })).toBeInTheDocument();
      expect(screen.getByText('Invitation has expired')).toBeInTheDocument();
    });
  });

  it('shows form with email when already authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-123', email: 'invited@example.com' });

    render(<AcceptInvitePage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('At least 8 characters')).toBeInTheDocument();
      expect(screen.getByText('invited@example.com')).toBeInTheDocument();
    });
  });

  it('calls updatePassword, signOut, and redirects on success', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-123', email: 'invited@example.com' });
    mockUpdatePassword.mockResolvedValue({ success: true, errorMessage: null });
    mockSignOut.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<AcceptInvitePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('At least 8 characters')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'NewPass123');
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'NewPass123');
    await user.click(screen.getByRole('button', { name: /set password/i }));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith('NewPass123');
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });

  it('validates password mismatch', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-123', email: 'invited@example.com' });
    const user = userEvent.setup();
    render(<AcceptInvitePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('At least 8 characters')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'Password123');
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'Different456');
    await user.click(screen.getByRole('button', { name: /set password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });
});
