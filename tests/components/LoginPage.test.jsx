import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}));

// Mock auth actions
const mockLogin = vi.fn();
const mockGetCurrentUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  login: (...args) => mockLogin(...args),
  getCurrentUser: () => mockGetCurrentUser(),
}));

// Mock react-hot-toast
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    error: (...args) => mockToastError(...args),
    success: (...args) => mockToastSuccess(...args),
  },
}));

// Mock config
vi.mock('@/config', () => ({
  default: {
    routes: {
      home: '/',
      login: '/login',
      forgotPassword: '/forgot-password',
      admin: { dashboard: '/admin/dashboard' },
    },
    colors: { theme: 'light' },
  },
}));

const { default: LogIn } = await import('@/app/login/page');

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(null);
});

describe('Login Page', () => {
  it('renders the login form when not authenticated', async () => {
    render(<LogIn />);
    // Wait for auth check to complete
    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('redirects to home if already authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-123' });
    render(<LogIn />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('shows validation error for empty email on submit', async () => {
    const user = userEvent.setup();
    render(<LogIn />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    });

    // Submit with empty fields
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows validation error for empty password on submit', async () => {
    const user = userEvent.setup();
    render(<LogIn />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('you@company.com'), 'valid@email.com');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login and redirects home for regular user', async () => {
    mockLogin.mockResolvedValue({ success: true, isAdmin: false });
    const user = userEvent.setup();
    render(<LogIn />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('you@company.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('redirects to admin dashboard for admin user', async () => {
    mockLogin.mockResolvedValue({ success: true, isAdmin: true });
    const user = userEvent.setup();
    render(<LogIn />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('you@company.com'), 'admin@example.com');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('shows error toast on login failure', async () => {
    mockLogin.mockResolvedValue({ errorMessage: 'Invalid login credentials' });
    const user = userEvent.setup();
    render(<LogIn />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('you@company.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Invalid login credentials');
    });
    // Should NOT redirect
    expect(mockReplace).not.toHaveBeenCalledWith('/');
  });

  it('has a forgot password link', async () => {
    render(<LogIn />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    });
    expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
  });
});
