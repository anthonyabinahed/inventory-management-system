import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronLeft: (props) => <span data-testid="chevron-left" {...props} />,
  ChevronRight: (props) => <span data-testid="chevron-right" {...props} />,
}));

const { default: Pagination } = await import('@/components/inventory/Pagination');

describe('Pagination', () => {
  const defaultProps = {
    pagination: { page: 1, limit: 25, total: 100, totalPages: 4 },
    onPageChange: vi.fn(),
    onLimitChange: vi.fn(),
  };

  it('shows "No items" when total is 0', () => {
    render(
      <Pagination
        pagination={{ page: 1, limit: 25, total: 0, totalPages: 0 }}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('shows correct range text', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText('1-25 of 100')).toBeInTheDocument();
  });

  it('shows correct range text on page 2', () => {
    render(
      <Pagination
        {...defaultProps}
        pagination={{ page: 2, limit: 25, total: 100, totalPages: 4 }}
      />
    );
    expect(screen.getByText('26-50 of 100')).toBeInTheDocument();
  });

  it('calls onPageChange when next button clicked', () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);

    // Find the next button (last button with chevron)
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1];
    fireEvent.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('previous button is disabled on page 1', () => {
    render(<Pagination {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // First navigation button (after the select)
    const prevButton = buttons[0];
    expect(prevButton).toBeDisabled();
  });

  it('next button is disabled on last page', () => {
    render(
      <Pagination
        {...defaultProps}
        pagination={{ page: 4, limit: 25, total: 100, totalPages: 4 }}
      />
    );
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1];
    expect(nextButton).toBeDisabled();
  });

  it('calls onLimitChange when page size selector changed', () => {
    const onLimitChange = vi.fn();
    render(<Pagination {...defaultProps} onLimitChange={onLimitChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '50' } });
    expect(onLimitChange).toHaveBeenCalledWith(50);
  });

  it('renders page number buttons with ellipsis for many pages', () => {
    render(
      <Pagination
        {...defaultProps}
        pagination={{ page: 5, limit: 25, total: 250, totalPages: 10 }}
      />
    );
    // Should show ellipsis for pages that are far away
    const ellipses = screen.getAllByText('...');
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
  });
});
