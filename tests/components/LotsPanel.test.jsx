import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="plus-icon" />,
  Package: () => <span data-testid="package-icon" />,
  EyeOff: () => <span data-testid="eye-off-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  ChevronLeft: () => <span data-testid="chevron-left" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
}));

const mockGetLotsForReagent = vi.fn();
vi.mock('@/actions/inventory', () => ({
  getLotsForReagent: (...args) => mockGetLotsForReagent(...args),
}));

const mockToastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: { error: (...args) => mockToastError(...args) },
}));

// Mock sub-components — each has its own dedicated test file
vi.mock('@/components/inventory/LotRow', () => ({
  default: ({ lot, onStockIn, onStockOut }) => (
    <tr data-testid={`lot-row-${lot.id}`}>
      <td>{lot.lot_number}</td>
      <td><button onClick={onStockIn}>StockIn</button></td>
      <td><button onClick={onStockOut}>StockOut</button></td>
    </tr>
  ),
}));

vi.mock('@/components/inventory/LotStockInModal', () => ({
  default: ({ isOpen, onClose, onSaved }) => isOpen
    ? (
      <div data-testid="stock-in-modal">
        <button onClick={onSaved}>SaveStockIn</button>
        <button onClick={onClose}>CloseStockIn</button>
      </div>
    )
    : null,
}));

vi.mock('@/components/inventory/LotStockOutModal', () => ({
  default: ({ isOpen, onClose, onSaved }) => isOpen
    ? (
      <div data-testid="stock-out-modal">
        <button onClick={onSaved}>SaveStockOut</button>
        <button onClick={onClose}>CloseStockOut</button>
      </div>
    )
    : null,
}));

const { default: LotsPanel } = await import('@/components/inventory/LotsPanel');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const sampleReagent = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'CBC Diluent',
  unit: 'vials',
  total_quantity: 30,
};

function makeLots(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `lot-${i + 1}`,
    lot_number: `LOT-00${i + 1}`,
    quantity: 10,
    expiry_date: '2027-12-31',
  }));
}

function makeResult(lots, paginationOverrides = {}) {
  return {
    success: true,
    data: lots,
    pagination: {
      page: 1,
      limit: 7,
      total: lots.length,
      totalPages: 1,
      ...paginationOverrides,
    },
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLotsForReagent.mockResolvedValue(makeResult(makeLots(3)));
});

// Wait helper — resolves once the loading spinner is gone
async function waitForLoad() {
  await waitFor(() =>
    expect(document.querySelector('.loading-spinner')).not.toBeInTheDocument()
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LotsPanel', () => {
  describe('initial load', () => {
    it('calls getLotsForReagent with reagent.id and default options on mount', async () => {
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitFor(() => {
        expect(mockGetLotsForReagent).toHaveBeenCalledWith(
          sampleReagent.id,
          { hideOutOfStock: false, hideExpired: false, page: 1, limit: 7 }
        );
      });
    });

    it('renders lot rows after successful load', async () => {
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getAllByTestId(/^lot-row-/)).toHaveLength(3);
      });
    });

    it('shows loading spinner while data is being fetched', () => {
      mockGetLotsForReagent.mockReturnValue(new Promise(() => {})); // never resolves
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
    });

    it('shows empty state when no lots and no filters active', async () => {
      mockGetLotsForReagent.mockResolvedValue(makeResult([]));
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText(/no lots yet/i)).toBeInTheDocument();
      });
    });

    it('calls toast.error when action returns success:false', async () => {
      mockGetLotsForReagent.mockResolvedValue({ success: false, errorMessage: 'Access denied' });
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Access denied');
      });
    });

    it('calls toast.error when action throws', async () => {
      mockGetLotsForReagent.mockRejectedValue(new Error('network error'));
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to load lots');
      });
    });
  });

  describe('filter toggles', () => {
    it('clicking "Out of stock" calls getLotsForReagent with hideOutOfStock:true', async () => {
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();
      await user.click(screen.getByTitle('Show in-stock lots only'));
      await waitFor(() => {
        expect(mockGetLotsForReagent).toHaveBeenCalledWith(
          sampleReagent.id,
          expect.objectContaining({ hideOutOfStock: true })
        );
      });
    });

    it('clicking "Out of stock" resets page to 1', async () => {
      // Arrange: 2 pages of lots
      mockGetLotsForReagent.mockResolvedValue(
        makeResult(makeLots(7), { total: 14, totalPages: 2 })
      );
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();

      // Navigate to page 2 — query next button via its icon's data-testid
      mockGetLotsForReagent.mockResolvedValue(
        makeResult(makeLots(7), { page: 2, total: 14, totalPages: 2 })
      );
      await user.click(screen.getByTestId('chevron-right').closest('button'));
      await waitForLoad();

      // Toggle filter — should go back to page 1
      mockGetLotsForReagent.mockResolvedValue(makeResult(makeLots(3)));
      await user.click(screen.getByTitle('Show in-stock lots only'));
      await waitFor(() => {
        expect(mockGetLotsForReagent).toHaveBeenCalledWith(
          sampleReagent.id,
          expect.objectContaining({ hideOutOfStock: true, page: 1 })
        );
      });
    });

    it('clicking "Expired" calls getLotsForReagent with hideExpired:true', async () => {
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();
      await user.click(screen.getByTitle('Show non-expired lots only'));
      await waitFor(() => {
        expect(mockGetLotsForReagent).toHaveBeenCalledWith(
          sampleReagent.id,
          expect.objectContaining({ hideExpired: true })
        );
      });
    });

    it('clicking "Expired" resets page to 1', async () => {
      mockGetLotsForReagent.mockResolvedValue(
        makeResult(makeLots(7), { total: 14, totalPages: 2 })
      );
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();

      mockGetLotsForReagent.mockResolvedValue(
        makeResult(makeLots(7), { page: 2, total: 14, totalPages: 2 })
      );
      await user.click(screen.getByTestId('chevron-right').closest('button'));
      await waitForLoad();

      mockGetLotsForReagent.mockResolvedValue(makeResult(makeLots(3)));
      await user.click(screen.getByTitle('Show non-expired lots only'));
      await waitFor(() => {
        expect(mockGetLotsForReagent).toHaveBeenCalledWith(
          sampleReagent.id,
          expect.objectContaining({ hideExpired: true, page: 1 })
        );
      });
    });

    it('toggling "Out of stock" again deactivates the filter', async () => {
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();

      await user.click(screen.getByTitle('Show in-stock lots only')); // activate
      await waitForLoad();
      await user.click(screen.getByTitle('Showing in-stock lots only')); // deactivate
      await waitFor(() => {
        expect(mockGetLotsForReagent).toHaveBeenCalledWith(
          sampleReagent.id,
          expect.objectContaining({ hideOutOfStock: false })
        );
      });
    });

    it('shows "No lots match the current filters." when filters active and no results', async () => {
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();

      mockGetLotsForReagent.mockResolvedValue(makeResult([]));
      await user.click(screen.getByTitle('Show in-stock lots only'));
      await waitFor(() => {
        expect(screen.getByText('No lots match the current filters.')).toBeInTheDocument();
      });
    });
  });

  describe('pagination', () => {
    it('does not render pagination when totalPages <= 1', async () => {
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();
      expect(screen.queryByText(/page \d+ of \d+/i)).not.toBeInTheDocument();
    });

    it('renders "Page X of Y" text when totalPages > 1', async () => {
      mockGetLotsForReagent.mockResolvedValue(
        makeResult(makeLots(7), { total: 14, totalPages: 2 })
      );
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });
    });

    it('prev button is disabled on page 1', async () => {
      mockGetLotsForReagent.mockResolvedValue(
        makeResult(makeLots(7), { total: 14, totalPages: 2 })
      );
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();
      // Pagination buttons have no title — query via icon data-testid
      const prevBtn = screen.getByTestId('chevron-left').closest('button');
      expect(prevBtn).toBeDisabled();
    });

    it('next button is disabled on last page', async () => {
      mockGetLotsForReagent.mockResolvedValue(
        makeResult(makeLots(7), { total: 14, totalPages: 2 })
      );
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();

      // Navigate to page 2 first, then next should be disabled
      mockGetLotsForReagent.mockResolvedValue(
        makeResult(makeLots(7), { page: 2, total: 14, totalPages: 2 })
      );
      await user.click(screen.getByTestId('chevron-right').closest('button'));
      await waitForLoad();

      const nextBtn = screen.getByTestId('chevron-right').closest('button');
      expect(nextBtn).toBeDisabled();
    });

    it('clicking next calls getLotsForReagent with page 2', async () => {
      mockGetLotsForReagent.mockResolvedValue(
        makeResult(makeLots(7), { total: 14, totalPages: 2 })
      );
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();
      await user.click(screen.getByTestId('chevron-right').closest('button'));
      await waitFor(() => {
        expect(mockGetLotsForReagent).toHaveBeenCalledWith(
          sampleReagent.id,
          expect.objectContaining({ page: 2 })
        );
      });
    });

    it('clicking prev on page 2 calls getLotsForReagent with page 1', async () => {
      mockGetLotsForReagent
        .mockResolvedValueOnce(makeResult(makeLots(7), { total: 14, totalPages: 2 }))
        .mockResolvedValue(makeResult(makeLots(7), { page: 2, total: 14, totalPages: 2 }));

      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();

      await user.click(screen.getByTestId('chevron-right').closest('button'));
      await waitForLoad();

      await user.click(screen.getByTestId('chevron-left').closest('button'));
      await waitFor(() => {
        expect(mockGetLotsForReagent).toHaveBeenCalledWith(
          sampleReagent.id,
          expect.objectContaining({ page: 1 })
        );
      });
    });
  });

  describe('Add Stock button', () => {
    it('LotStockInModal is not open initially', async () => {
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();
      expect(screen.queryByTestId('stock-in-modal')).not.toBeInTheDocument();
    });

    it('clicking "Add Stock" opens LotStockInModal', async () => {
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();
      await user.click(screen.getByText('Add Stock'));
      expect(screen.getByTestId('stock-in-modal')).toBeInTheDocument();
    });
  });

  describe('stock-in from lot row', () => {
    it('clicking StockIn on a row opens LotStockInModal', async () => {
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitFor(() => expect(screen.getAllByTestId(/^lot-row-/)).toHaveLength(3));
      await user.click(screen.getAllByText('StockIn')[0]);
      expect(screen.getByTestId('stock-in-modal')).toBeInTheDocument();
    });
  });

  describe('stock-out from lot row', () => {
    it('LotStockOutModal is not open initially', async () => {
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();
      expect(screen.queryByTestId('stock-out-modal')).not.toBeInTheDocument();
    });

    it('clicking StockOut on a row opens LotStockOutModal', async () => {
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitFor(() => expect(screen.getAllByTestId(/^lot-row-/)).toHaveLength(3));
      await user.click(screen.getAllByText('StockOut')[0]);
      expect(screen.getByTestId('stock-out-modal')).toBeInTheDocument();
    });
  });

  describe('handleStockInSaved', () => {
    it('closes LotStockInModal after save', async () => {
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();
      await user.click(screen.getByText('Add Stock'));
      await user.click(screen.getByText('SaveStockIn'));
      await waitFor(() => {
        expect(screen.queryByTestId('stock-in-modal')).not.toBeInTheDocument();
      });
    });

    it('reloads lots after stock-in save', async () => {
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitForLoad();
      const callsBefore = mockGetLotsForReagent.mock.calls.length;
      await user.click(screen.getByText('Add Stock'));
      await user.click(screen.getByText('SaveStockIn'));
      await waitFor(() => {
        expect(mockGetLotsForReagent.mock.calls.length).toBeGreaterThan(callsBefore);
      });
    });

    it('calls onReagentUpdated with reagent.id after stock-in save', async () => {
      const onReagentUpdated = vi.fn();
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={onReagentUpdated} />);
      await waitForLoad();
      await user.click(screen.getByText('Add Stock'));
      await user.click(screen.getByText('SaveStockIn'));
      await waitFor(() => {
        expect(onReagentUpdated).toHaveBeenCalledWith(sampleReagent.id);
      });
    });
  });

  describe('handleStockOutSaved', () => {
    it('closes LotStockOutModal after save', async () => {
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitFor(() => expect(screen.getAllByTestId(/^lot-row-/)).toHaveLength(3));
      await user.click(screen.getAllByText('StockOut')[0]);
      await user.click(screen.getByText('SaveStockOut'));
      await waitFor(() => {
        expect(screen.queryByTestId('stock-out-modal')).not.toBeInTheDocument();
      });
    });

    it('reloads lots after stock-out save', async () => {
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={vi.fn()} />);
      await waitFor(() => expect(screen.getAllByTestId(/^lot-row-/)).toHaveLength(3));
      const callsBefore = mockGetLotsForReagent.mock.calls.length;
      await user.click(screen.getAllByText('StockOut')[0]);
      await user.click(screen.getByText('SaveStockOut'));
      await waitFor(() => {
        expect(mockGetLotsForReagent.mock.calls.length).toBeGreaterThan(callsBefore);
      });
    });

    it('calls onReagentUpdated with reagent.id after stock-out save', async () => {
      const onReagentUpdated = vi.fn();
      const user = userEvent.setup();
      render(<LotsPanel reagent={sampleReagent} onReagentUpdated={onReagentUpdated} />);
      await waitFor(() => expect(screen.getAllByTestId(/^lot-row-/)).toHaveLength(3));
      await user.click(screen.getAllByText('StockOut')[0]);
      await user.click(screen.getByText('SaveStockOut'));
      await waitFor(() => {
        expect(onReagentUpdated).toHaveBeenCalledWith(sampleReagent.id);
      });
    });
  });
});
