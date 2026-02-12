import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// No mocks needed — StatusBadges uses pure functions from constants

const { ExpiryBadge, StockBadge } = await import('@/components/inventory/StatusBadges');

// ============ ExpiryBadge ============

describe('ExpiryBadge', () => {
  it('returns null when expiryDate is null', () => {
    const { container } = render(<ExpiryBadge expiryDate={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows "Expired" badge for past date', () => {
    render(<ExpiryBadge expiryDate="2020-01-01" />);
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shows warning badge for date within 30 days', () => {
    // Create a date 15 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const dateStr = futureDate.toISOString().split('T')[0];

    render(<ExpiryBadge expiryDate={dateStr} />);
    // Should show days remaining as badge text
    const badge = screen.getByText(/\d+d/);
    expect(badge).toBeInTheDocument();
  });

  it('shows normal date text for date far in the future', () => {
    render(<ExpiryBadge expiryDate="2030-06-15" />);
    // Should show formatted date, not a badge
    expect(screen.queryByText('Expired')).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+d/)).not.toBeInTheDocument();
  });

  it('shows critical badge for date within 7 days', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const dateStr = futureDate.toISOString().split('T')[0];

    render(<ExpiryBadge expiryDate={dateStr} />);
    const badge = screen.getByText(/\d+d/);
    expect(badge.className).toContain('badge-error');
  });
});

// ============ StockBadge ============

describe('StockBadge', () => {
  it('shows "Out of stock" badge when quantity is 0', () => {
    render(<StockBadge quantity={0} minimumStock={10} />);
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });

  it('shows warning badge with quantity/minimum when low stock', () => {
    render(<StockBadge quantity={3} minimumStock={10} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  it('shows plain quantity text when stock is OK', () => {
    render(<StockBadge quantity={50} minimumStock={10} />);
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.queryByText('Out of stock')).not.toBeInTheDocument();
  });

  it('treats quantity equal to minimum_stock as low', () => {
    const { container } = render(<StockBadge quantity={10} minimumStock={10} />);
    // quantity === minimum_stock => low stock (warning badge, not plain text)
    expect(container.querySelector('.badge-warning')).toBeInTheDocument();
    expect(screen.queryByText('Out of stock')).not.toBeInTheDocument();
  });
});
