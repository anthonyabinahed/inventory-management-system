import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: (props) => <span data-testid="search-icon" {...props} />,
  X: (props) => <span data-testid="x-icon" {...props} />,
  Filter: (props) => <span data-testid="filter-icon" {...props} />,
  AlertTriangle: (props) => <span data-testid="alert-icon" {...props} />,
  Clock: (props) => <span data-testid="clock-icon" {...props} />,
}));

const { default: ReagentFilters } = await import('@/components/inventory/ReagentFilters');

const emptyFilters = {
  search: '',
  category: '',
  sector: '',
  machine: '',
  supplier: '',
  storage_location: '',
  lowStock: false,
  hasExpiredLots: false,
};

const defaultOptions = {
  suppliers: ['Beckman', 'BioMerieux'],
  locations: ['Fridge A', 'Room B'],
  sectors: ['Hematology', 'Chemistry'],
  machines: ['Sysmex XN', 'DxH 800'],
  categories: ['reagent', 'control'],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReagentFilters', () => {
  it('renders search input', () => {
    render(
      <ReagentFilters filters={emptyFilters} options={defaultOptions} onFilterChange={vi.fn()} />
    );
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders category dropdown', () => {
    render(
      <ReagentFilters filters={emptyFilters} options={defaultOptions} onFilterChange={vi.fn()} />
    );
    expect(screen.getAllByText('All Categories').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onFilterChange when search text entered', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ReagentFilters filters={emptyFilters} options={defaultOptions} onFilterChange={onFilterChange} />
    );

    // Controlled input resets between keystrokes since mock doesn't update state,
    // so type a single character and verify the callback fires with it
    await user.type(screen.getByPlaceholderText('Search...'), 't');
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ search: 't' }));
  });

  it('calls onFilterChange when low stock button clicked', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ReagentFilters filters={emptyFilters} options={defaultOptions} onFilterChange={onFilterChange} />
    );

    await user.click(screen.getByText('Low Stock'));
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ lowStock: true }));
  });

  it('shows "Clear filters" button when filters are active', () => {
    const activeFilters = { ...emptyFilters, search: 'test' };
    render(
      <ReagentFilters filters={activeFilters} options={defaultOptions} onFilterChange={vi.fn()} />
    );
    expect(screen.getByText('Clear filters')).toBeInTheDocument();
  });

  it('does not show "Clear filters" when no filters active', () => {
    render(
      <ReagentFilters filters={emptyFilters} options={defaultOptions} onFilterChange={vi.fn()} />
    );
    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
  });

  it('clears all filters when "Clear filters" clicked', async () => {
    const onFilterChange = vi.fn();
    const activeFilters = { ...emptyFilters, search: 'test', lowStock: true };
    const user = userEvent.setup();
    render(
      <ReagentFilters filters={activeFilters} options={defaultOptions} onFilterChange={onFilterChange} />
    );

    await user.click(screen.getByText('Clear filters'));
    expect(onFilterChange).toHaveBeenCalledWith(emptyFilters);
  });
});
