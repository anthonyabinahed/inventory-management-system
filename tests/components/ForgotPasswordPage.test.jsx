import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock auth actions
const mockRequestPasswordReset = vi.fn();
vi.mock('@/actions/auth', () => ({
  requestPasswordReset: (...args) => mockRequestPasswordReset(...args),
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

vi.mock('@/config', () => ({
  default: {
    routes: { login: '/login', forgotPassword: '/forgot-password' },
    colors: { theme: 'light' },
  },
}));

const { default: ForgotPassword } = await import('@/app/forgot-password/page');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Forgot Password Page', () => {
  it('renders the forgot password form', () => {
    render(<ForgotPassword />);
    expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<ForgotPassword />);

    const input = screen.getByPlaceholderText('you@company.com');
    await user.type(input, 'not-an-email');
    // Use fireEvent.submit to bypass native HTML5 email validation in jsdom
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });

  it('calls requestPasswordReset and shows success state', async () => {
    mockRequestPasswordReset.mockResolvedValue({ success: true, errorMessage: null });
    const user = userEvent.setup();
    render(<ForgotPassword />);

    await user.type(screen.getByPlaceholderText('you@company.com'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith('user@example.com');
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });
  });

  it('shows try again button after success', async () => {
    mockRequestPasswordReset.mockResolvedValue({ success: true, errorMessage: null });
    const user = userEvent.setup();
    render(<ForgotPassword />);

    await user.type(screen.getByPlaceholderText('you@company.com'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    // Click try again to go back to form
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
  });

  it('shows error toast when action returns error', async () => {
    mockRequestPasswordReset.mockResolvedValue({ errorMessage: 'Something went wrong' });
    const user = userEvent.setup();
    render(<ForgotPassword />);

    await user.type(screen.getByPlaceholderText('you@company.com'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
    // Should stay on form, not switch to success state
    expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
  });
});
