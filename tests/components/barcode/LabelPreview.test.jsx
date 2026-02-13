import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: (props) => <span data-testid="x-icon" {...props} />,
}));

// Mock qrcode.react
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, ...props }) => (
    <svg data-testid="qr-code" data-value={value} {...props} />
  ),
}));

// Mock barcode lib
const mockEncodeQRPayload = vi.fn().mockReturnValue('IMS:v1:mock-payload');
vi.mock('@/libs/barcode', () => ({
  encodeQRPayload: (...args) => mockEncodeQRPayload(...args),
}));

const { default: LabelPreview } = await import('@/components/barcode/LabelPreview');

const sampleLabel = {
  id: 'label-1',
  reagent: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'CBC Diluent',
    reference: 'REF-001',
    category: 'reagent',
  },
  lot_number: 'LOT-001',
  expiry_date: '2027-06-30',
  quantity: 1,
};

describe('LabelPreview', () => {
  describe('rendering', () => {
    it('shows reagent name', () => {
      render(<LabelPreview label={sampleLabel} onRemove={vi.fn()} />);
      expect(screen.getByText('CBC Diluent')).toBeInTheDocument();
    });

    it('shows reagent reference', () => {
      render(<LabelPreview label={sampleLabel} onRemove={vi.fn()} />);
      expect(screen.getByText(/Ref: REF-001/)).toBeInTheDocument();
    });

    it('shows lot number', () => {
      render(<LabelPreview label={sampleLabel} onRemove={vi.fn()} />);
      expect(screen.getByText(/Lot: LOT-001/)).toBeInTheDocument();
    });

    it('shows formatted expiry date', () => {
      render(<LabelPreview label={sampleLabel} onRemove={vi.fn()} />);
      // formatDate outputs "30 Jun 2027" (en-GB)
      expect(screen.getByText(/Exp: 30 Jun 2027/)).toBeInTheDocument();
    });

    it('shows "No expiry" when expiry_date is null', () => {
      const noExpiry = { ...sampleLabel, expiry_date: null };
      render(<LabelPreview label={noExpiry} onRemove={vi.fn()} />);
      expect(screen.getByText('No expiry')).toBeInTheDocument();
    });

    it('shows "No expiry" when expiry_date is empty string', () => {
      const noExpiry = { ...sampleLabel, expiry_date: '' };
      render(<LabelPreview label={noExpiry} onRemove={vi.fn()} />);
      expect(screen.getByText('No expiry')).toBeInTheDocument();
    });

    it('shows category badge', () => {
      render(<LabelPreview label={sampleLabel} onRemove={vi.fn()} />);
      expect(screen.getByText('reagent')).toBeInTheDocument();
    });

    it('shows QR code', () => {
      render(<LabelPreview label={sampleLabel} onRemove={vi.fn()} />);
      expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    });

    it('calls encodeQRPayload with correct args', () => {
      render(<LabelPreview label={sampleLabel} onRemove={vi.fn()} />);
      expect(mockEncodeQRPayload).toHaveBeenCalledWith({
        reagent_id: '550e8400-e29b-41d4-a716-446655440000',
        lot_number: 'LOT-001',
        expiry_date: '2027-06-30',
      });
    });
  });

  describe('quantity badge', () => {
    it('does not show quantity badge when quantity is 1', () => {
      render(<LabelPreview label={sampleLabel} onRemove={vi.fn()} />);
      expect(screen.queryByText(/×/)).not.toBeInTheDocument();
    });

    it('shows quantity badge when quantity > 1', () => {
      const multiLabel = { ...sampleLabel, quantity: 5 };
      render(<LabelPreview label={multiLabel} onRemove={vi.fn()} />);
      expect(screen.getByText(/×5/)).toBeInTheDocument();
    });

    it('shows quantity badge for large quantities', () => {
      const manyLabel = { ...sampleLabel, quantity: 100 };
      render(<LabelPreview label={manyLabel} onRemove={vi.fn()} />);
      expect(screen.getByText(/×100/)).toBeInTheDocument();
    });
  });

  describe('remove button', () => {
    it('shows remove button when onRemove is provided', () => {
      render(<LabelPreview label={sampleLabel} onRemove={vi.fn()} />);
      expect(screen.getByTitle('Remove from batch')).toBeInTheDocument();
    });

    it('does not show remove button when onRemove is not provided', () => {
      render(<LabelPreview label={sampleLabel} />);
      expect(screen.queryByTitle('Remove from batch')).not.toBeInTheDocument();
    });

    it('calls onRemove when remove button is clicked', async () => {
      const onRemove = vi.fn();
      const user = userEvent.setup();
      render(<LabelPreview label={sampleLabel} onRemove={onRemove} />);

      await user.click(screen.getByTitle('Remove from batch'));
      expect(onRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe('different categories', () => {
    it('shows consumable category', () => {
      const label = {
        ...sampleLabel,
        reagent: { ...sampleLabel.reagent, category: 'consumable' },
      };
      render(<LabelPreview label={label} onRemove={vi.fn()} />);
      expect(screen.getByText('consumable')).toBeInTheDocument();
    });

    it('shows calibrator category', () => {
      const label = {
        ...sampleLabel,
        reagent: { ...sampleLabel.reagent, category: 'calibrator' },
      };
      render(<LabelPreview label={label} onRemove={vi.fn()} />);
      expect(screen.getByText('calibrator')).toBeInTheDocument();
    });
  });
});
