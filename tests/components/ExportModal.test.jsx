import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('lucide-react', () => ({
  FileSpreadsheet: (props) => <span data-testid="file-spreadsheet-icon" {...props} />,
  X: (props) => <span data-testid="x-icon" {...props} />,
  Download: (props) => <span data-testid="download-icon" {...props} />,
}));

const mockToastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: { error: (...args) => mockToastError(...args) },
}));

const { default: ExportModal } = await import('@/components/inventory/ExportModal');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockOnClose = vi.fn();
const mockOnExportStarted = vi.fn();

function renderModal(overrides = {}) {
  return render(
    <ExportModal
      onClose={mockOnClose}
      onExportStarted={mockOnExportStarted}
      {...overrides}
    />
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ jobId: 'job-uuid-001' }),
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ExportModal', () => {
  describe('render', () => {
    it('shows "Export to Excel" heading', () => {
      renderModal();
      expect(screen.getByText('Export to Excel')).toBeInTheDocument();
    });

    it('renders both toggles checked by default', () => {
      renderModal();
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
      expect(checkboxes[0]).toBeChecked(); // include out-of-stock lots
      expect(checkboxes[1]).toBeChecked(); // include expired lots
    });

    it('renders Cancel and Export buttons', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('Export button is enabled initially', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /export/i })).not.toBeDisabled();
    });

    it('shows description text about Items and Lots sheets', () => {
      renderModal();
      // The description paragraph has mixed content (text + <strong> tags),
      // so check for a unique substring that lives entirely in one text node.
      expect(screen.getByText(/Choose which lots to include/i)).toBeInTheDocument();
    });

    it('renders toggle labels', () => {
      renderModal();
      expect(screen.getByText('Include out-of-stock lots')).toBeInTheDocument();
      expect(screen.getByText('Include expired lots')).toBeInTheDocument();
    });
  });

  describe('toggles', () => {
    it('unchecking the first toggle reflects in the checkbox state', async () => {
      const user = userEvent.setup();
      renderModal();
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      expect(checkboxes[0]).not.toBeChecked();
    });

    it('unchecking the second toggle reflects in the checkbox state', async () => {
      const user = userEvent.setup();
      renderModal();
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      expect(checkboxes[1]).not.toBeChecked();
    });

    it('re-checking a toggle restores it to checked', async () => {
      const user = userEvent.setup();
      renderModal();
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // uncheck
      await user.click(checkboxes[0]); // re-check
      expect(checkboxes[0]).toBeChecked();
    });
  });

  describe('Cancel / close', () => {
    it('calls onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockOnClose).toHaveBeenCalledOnce();
    });

    it('calls onClose when X icon button is clicked', async () => {
      const user = userEvent.setup();
      renderModal();
      // The X button wraps the x-icon span
      const xButton = screen.getByTestId('x-icon').closest('button');
      await user.click(xButton);
      expect(mockOnClose).toHaveBeenCalledOnce();
    });
  });

  describe('successful export flow', () => {
    it('POSTs to /api/export/request', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /export/i }));
      await waitFor(() => {
        expect(vi.mocked(fetch)).toHaveBeenCalledWith(
          '/api/export/request',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('sends include_empty_lots:true and include_expired_lots:true by default', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /export/i }));
      await waitFor(() => {
        expect(vi.mocked(fetch)).toHaveBeenCalledWith(
          '/api/export/request',
          expect.objectContaining({
            body: JSON.stringify({ include_empty_lots: true, include_expired_lots: true }),
          })
        );
      });
    });

    it('sends false values when both toggles are unchecked', async () => {
      const user = userEvent.setup();
      renderModal();
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);
      await user.click(screen.getByRole('button', { name: /export/i }));
      await waitFor(() => {
        expect(vi.mocked(fetch)).toHaveBeenCalledWith(
          '/api/export/request',
          expect.objectContaining({
            body: JSON.stringify({ include_empty_lots: false, include_expired_lots: false }),
          })
        );
      });
    });

    it('calls onExportStarted with jobId from response', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /export/i }));
      await waitFor(() => {
        expect(mockOnExportStarted).toHaveBeenCalledWith('job-uuid-001');
      });
    });

    it('calls onClose after successful response', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /export/i }));
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledOnce();
      });
    });

    it('does not call toast.error on success', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /export/i }));
      await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
      expect(mockToastError).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('disables Export button while fetch is in-flight', async () => {
      let resolveFetch;
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(
        new Promise((res) => { resolveFetch = res; })
      ));
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /export/i }));
      expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
      // Resolve to clean up
      resolveFetch({ ok: true, json: () => Promise.resolve({ jobId: 'job-uuid-001' }) });
    });

    it('re-enables Export button after fetch resolves', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /export/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).not.toBeDisabled();
      });
    });
  });

  describe('error handling', () => {
    it('calls toast.error with body.error when res.ok is false', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Export quota exceeded' }),
      }));
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /export/i }));
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Export quota exceeded');
      });
    });

    it('calls toast.error with fallback message when res.ok is false and body has no error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({}),
      }));
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /export/i }));
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to start export');
      });
    });

    it('calls toast.error with catch message when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /export/i }));
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to start export. Please try again.');
      });
    });

    it('does not call onExportStarted or onClose on failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Server error' }),
      }));
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /export/i }));
      await waitFor(() => expect(mockToastError).toHaveBeenCalled());
      expect(mockOnExportStarted).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('re-enables Export button after a failed request', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /export/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).not.toBeDisabled();
      });
    });
  });
});
