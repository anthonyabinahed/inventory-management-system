import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Download: (props) => <span data-testid="download-icon" {...props} />,
  Trash2: (props) => <span data-testid="trash-icon" {...props} />,
  X: (props) => <span data-testid="x-icon" {...props} />,
}));

// Mock qrcode.react (used by LabelPreview child)
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, ...props }) => (
    <svg data-testid="qr-code" data-value={value} {...props} />
  ),
}));

// Mock barcode lib
const mockGenerateLabelsPDF = vi.fn();
vi.mock('@/libs/barcode', () => ({
  generateLabelsPDF: (...args) => mockGenerateLabelsPDF(...args),
  encodeQRPayload: () => 'IMS:v1:mock',
}));

// Mock react-hot-toast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    success: (...args) => mockToastSuccess(...args),
    error: (...args) => mockToastError(...args),
  },
}));

const { default: LabelBatchPrintView } = await import('@/components/barcode/LabelBatchPrintView');

const makeLabel = (id, overrides = {}) => ({
  id,
  reagent: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'CBC Diluent',
    reference: 'REF-001',
    category: 'reagent',
  },
  lot_number: `LOT-${id}`,
  expiry_date: '2027-06-30',
  quantity: 1,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerateLabelsPDF.mockResolvedValue(undefined);
});

describe('LabelBatchPrintView', () => {
  describe('empty state', () => {
    it('shows empty message when labels array is empty', () => {
      render(<LabelBatchPrintView labels={[]} onRemove={vi.fn()} onClear={vi.fn()} />);
      expect(screen.getByText('No labels in batch')).toBeInTheDocument();
    });

    it('shows instruction text in empty state', () => {
      render(<LabelBatchPrintView labels={[]} onRemove={vi.fn()} onClear={vi.fn()} />);
      expect(screen.getByText(/Search for a reagent above/)).toBeInTheDocument();
    });

    it('does not show action bar in empty state', () => {
      render(<LabelBatchPrintView labels={[]} onRemove={vi.fn()} onClear={vi.fn()} />);
      expect(screen.queryByText('Clear')).not.toBeInTheDocument();
      expect(screen.queryByText('Download PDF')).not.toBeInTheDocument();
    });
  });

  describe('with labels', () => {
    it('shows item count', () => {
      const labels = [makeLabel('1'), makeLabel('2')];
      render(<LabelBatchPrintView labels={labels} onRemove={vi.fn()} onClear={vi.fn()} />);
      expect(screen.getByText(/2 items/)).toBeInTheDocument();
    });

    it('shows singular "item" for single label', () => {
      const labels = [makeLabel('1')];
      render(<LabelBatchPrintView labels={labels} onRemove={vi.fn()} onClear={vi.fn()} />);
      expect(screen.getByText(/1 item\b/)).toBeInTheDocument();
    });

    it('shows total label count', () => {
      const labels = [makeLabel('1', { quantity: 3 }), makeLabel('2', { quantity: 5 })];
      render(<LabelBatchPrintView labels={labels} onRemove={vi.fn()} onClear={vi.fn()} />);
      expect(screen.getByText(/8 labels total/)).toBeInTheDocument();
    });

    it('shows singular "label" for single label total', () => {
      const labels = [makeLabel('1', { quantity: 1 })];
      render(<LabelBatchPrintView labels={labels} onRemove={vi.fn()} onClear={vi.fn()} />);
      expect(screen.getByText(/1 label total/)).toBeInTheDocument();
    });

    it('shows page count for > 48 labels', () => {
      const labels = [makeLabel('1', { quantity: 96 })];
      render(<LabelBatchPrintView labels={labels} onRemove={vi.fn()} onClear={vi.fn()} />);
      expect(screen.getByText(/2 pages/)).toBeInTheDocument();
    });

    it('does not show page count for <= 48 labels', () => {
      const labels = [makeLabel('1', { quantity: 48 })];
      render(<LabelBatchPrintView labels={labels} onRemove={vi.fn()} onClear={vi.fn()} />);
      expect(screen.queryByText(/pages/)).not.toBeInTheDocument();
    });

    it('renders LabelPreview for each label', () => {
      const labels = [makeLabel('1'), makeLabel('2'), makeLabel('3')];
      render(<LabelBatchPrintView labels={labels} onRemove={vi.fn()} onClear={vi.fn()} />);
      expect(screen.getAllByTestId('qr-code')).toHaveLength(3);
    });
  });

  describe('384 label limit', () => {
    it('shows error when total labels exceed 384', () => {
      const labels = [makeLabel('1', { quantity: 385 })];
      render(<LabelBatchPrintView labels={labels} onRemove={vi.fn()} onClear={vi.fn()} />);
      expect(screen.getByText(/Exceeds 384 label limit/)).toBeInTheDocument();
    });

    it('disables download button when over limit', () => {
      const labels = [makeLabel('1', { quantity: 385 })];
      render(<LabelBatchPrintView labels={labels} onRemove={vi.fn()} onClear={vi.fn()} />);
      expect(screen.getByTestId('download-icon').closest('button')).toBeDisabled();
    });

    it('does not show error when exactly at 384', () => {
      const labels = [makeLabel('1', { quantity: 384 })];
      render(<LabelBatchPrintView labels={labels} onRemove={vi.fn()} onClear={vi.fn()} />);
      expect(screen.queryByText(/Exceeds 384 label limit/)).not.toBeInTheDocument();
    });
  });

  describe('Clear button', () => {
    it('calls onClear when Clear button is clicked', async () => {
      const onClear = vi.fn();
      const user = userEvent.setup();
      const labels = [makeLabel('1')];
      render(<LabelBatchPrintView labels={labels} onRemove={vi.fn()} onClear={onClear} />);

      await user.click(screen.getByText('Clear'));
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('Remove individual label', () => {
    it('calls onRemove with correct label id', async () => {
      const onRemove = vi.fn();
      const user = userEvent.setup();
      const labels = [makeLabel('abc-123')];
      render(<LabelBatchPrintView labels={labels} onRemove={onRemove} onClear={vi.fn()} />);

      await user.click(screen.getByTitle('Remove from batch'));
      expect(onRemove).toHaveBeenCalledWith('abc-123');
    });
  });

  describe('Download PDF', () => {
    it('calls generateLabelsPDF with labels on download', async () => {
      const user = userEvent.setup();
      const labels = [makeLabel('1')];
      render(<LabelBatchPrintView labels={labels} onRemove={vi.fn()} onClear={vi.fn()} />);

      await user.click(screen.getByTestId('download-icon').closest('button'));

      await waitFor(() => {
        expect(mockGenerateLabelsPDF).toHaveBeenCalledWith(labels);
      });
    });

    it('shows success toast after PDF generation', async () => {
      const user = userEvent.setup();
      const labels = [makeLabel('1')];
      render(<LabelBatchPrintView labels={labels} onRemove={vi.fn()} onClear={vi.fn()} />);

      await user.click(screen.getByTestId('download-icon').closest('button'));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('PDF downloaded successfully');
      });
    });

    it('shows error toast when PDF generation fails', async () => {
      mockGenerateLabelsPDF.mockRejectedValue(new Error('PDF error'));
      const user = userEvent.setup();
      const labels = [makeLabel('1')];
      render(<LabelBatchPrintView labels={labels} onRemove={vi.fn()} onClear={vi.fn()} />);

      await user.click(screen.getByTestId('download-icon').closest('button'));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to generate PDF');
      });
    });
  });
});
