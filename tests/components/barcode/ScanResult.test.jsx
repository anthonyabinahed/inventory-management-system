import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Package: (props) => <span data-testid="package-icon" {...props} />,
  MapPin: (props) => <span data-testid="mappin-icon" {...props} />,
  Thermometer: (props) => <span data-testid="thermo-icon" {...props} />,
  Plus: (props) => <span data-testid="plus-icon" {...props} />,
  Minus: (props) => <span data-testid="minus-icon" {...props} />,
  ScanLine: (props) => <span data-testid="scanline-icon" {...props} />,
}));

// Mock StatusBadges
vi.mock('@/components/inventory/StatusBadges', () => ({
  ExpiryBadge: ({ expiryDate }) => <span data-testid="expiry-badge">{expiryDate}</span>,
}));

const { default: ScanResult } = await import('@/components/barcode/ScanResult');

const sampleReagent = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'CBC Diluent',
  reference: 'REF-001',
  category: 'reagent',
  unit: 'vials',
  supplier: 'Beckman Coulter',
  storage_location: 'Fridge A',
  storage_temperature: '2-8°C',
};

const sampleLot = {
  id: 'lot-550e8400-e29b-41d4-a716-446655440000',
  lot_number: 'LOT-001',
  quantity: 50,
  expiry_date: '2027-06-30',
};

const renderScanResult = (overrides = {}) => {
  const defaultProps = {
    reagent: sampleReagent,
    lot: sampleLot,
    lotNumber: 'LOT-001',
    expiryDate: '2027-06-30',
    onStockIn: vi.fn(),
    onStockOut: vi.fn(),
    onScanAnother: vi.fn(),
  };
  return render(<ScanResult {...defaultProps} {...overrides} />);
};

describe('ScanResult', () => {
  describe('existing lot display', () => {
    it('renders reagent name and reference', () => {
      renderScanResult();
      expect(screen.getByText('CBC Diluent')).toBeInTheDocument();
      expect(screen.getByText(/Ref: REF-001/)).toBeInTheDocument();
    });

    it('shows category', () => {
      renderScanResult();
      expect(screen.getByText(/reagent/i)).toBeInTheDocument();
    });

    it('shows lot number from lot object', () => {
      renderScanResult();
      expect(screen.getByText(/Lot: LOT-001/)).toBeInTheDocument();
    });

    it('shows current stock with unit', () => {
      renderScanResult();
      expect(screen.getByText(/50 vials/)).toBeInTheDocument();
    });

    it('shows ExpiryBadge for existing lot', () => {
      renderScanResult();
      expect(screen.getByTestId('expiry-badge')).toBeInTheDocument();
      expect(screen.getByTestId('expiry-badge')).toHaveTextContent('2027-06-30');
    });

    it('does not show "New lot" badge for existing lot', () => {
      renderScanResult();
      expect(screen.queryByText('New lot')).not.toBeInTheDocument();
    });

    it('shows zero quantity with error styling', () => {
      renderScanResult({ lot: { ...sampleLot, quantity: 0 } });
      const quantityEl = screen.getByText(/0 vials/);
      expect(quantityEl).toHaveClass('text-error');
    });
  });

  describe('new lot display', () => {
    it('shows lot number from lotNumber prop when lot is null', () => {
      renderScanResult({ lot: null, lotNumber: 'LOT-NEW-123' });
      expect(screen.getByText(/Lot: LOT-NEW-123/)).toBeInTheDocument();
    });

    it('shows "New lot" badge when lot is null', () => {
      renderScanResult({ lot: null, lotNumber: 'LOT-NEW' });
      expect(screen.getByText('New lot')).toBeInTheDocument();
    });

    it('does not show current stock info when lot is null', () => {
      renderScanResult({ lot: null, lotNumber: 'LOT-NEW' });
      expect(screen.queryByText('Current stock:')).not.toBeInTheDocument();
    });

    it('does not show ExpiryBadge when lot is null', () => {
      renderScanResult({ lot: null, lotNumber: 'LOT-NEW' });
      expect(screen.queryByTestId('expiry-badge')).not.toBeInTheDocument();
    });
  });

  describe('reagent details', () => {
    it('shows supplier', () => {
      renderScanResult();
      expect(screen.getByText('Beckman Coulter')).toBeInTheDocument();
    });

    it('shows storage location', () => {
      renderScanResult();
      expect(screen.getByText('Fridge A')).toBeInTheDocument();
    });

    it('shows storage temperature', () => {
      renderScanResult();
      expect(screen.getByText('2-8°C')).toBeInTheDocument();
    });

    it('renders icons for details', () => {
      renderScanResult();
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
      expect(screen.getByTestId('mappin-icon')).toBeInTheDocument();
      expect(screen.getByTestId('thermo-icon')).toBeInTheDocument();
    });
  });

  describe('Stock Out button state', () => {
    it('disables Stock Out when lot is null (new lot)', () => {
      renderScanResult({ lot: null, lotNumber: 'LOT-NEW' });
      expect(screen.getByText('Stock Out').closest('button')).toBeDisabled();
    });

    it('disables Stock Out when lot quantity is 0', () => {
      renderScanResult({ lot: { ...sampleLot, quantity: 0 } });
      expect(screen.getByText('Stock Out').closest('button')).toBeDisabled();
    });

    it('enables Stock Out when lot has quantity > 0', () => {
      renderScanResult();
      expect(screen.getByText('Stock Out').closest('button')).not.toBeDisabled();
    });

    it('enables Stock Out with quantity of 1', () => {
      renderScanResult({ lot: { ...sampleLot, quantity: 1 } });
      expect(screen.getByText('Stock Out').closest('button')).not.toBeDisabled();
    });
  });

  describe('Stock In button', () => {
    it('is always enabled regardless of lot state', () => {
      renderScanResult({ lot: null, lotNumber: 'LOT-NEW' });
      expect(screen.getByText('Stock In').closest('button')).not.toBeDisabled();
    });

    it('is enabled when lot quantity is 0', () => {
      renderScanResult({ lot: { ...sampleLot, quantity: 0 } });
      expect(screen.getByText('Stock In').closest('button')).not.toBeDisabled();
    });
  });

  describe('button callbacks', () => {
    it('calls onStockIn when Stock In is clicked', async () => {
      const onStockIn = vi.fn();
      const user = userEvent.setup();
      renderScanResult({ onStockIn });

      await user.click(screen.getByText('Stock In'));
      expect(onStockIn).toHaveBeenCalledTimes(1);
    });

    it('calls onStockOut when Stock Out is clicked', async () => {
      const onStockOut = vi.fn();
      const user = userEvent.setup();
      renderScanResult({ onStockOut });

      await user.click(screen.getByText('Stock Out'));
      expect(onStockOut).toHaveBeenCalledTimes(1);
    });

    it('does not call onStockOut when Stock Out is disabled', async () => {
      const onStockOut = vi.fn();
      const user = userEvent.setup();
      renderScanResult({ lot: null, lotNumber: 'LOT-NEW', onStockOut });

      await user.click(screen.getByText('Stock Out'));
      expect(onStockOut).not.toHaveBeenCalled();
    });

    it('calls onScanAnother when Scan Another is clicked', async () => {
      const onScanAnother = vi.fn();
      const user = userEvent.setup();
      renderScanResult({ onScanAnother });

      await user.click(screen.getByText('Scan Another'));
      expect(onScanAnother).toHaveBeenCalledTimes(1);
    });
  });

  describe('different categories', () => {
    it('renders consumable category', () => {
      renderScanResult({ reagent: { ...sampleReagent, category: 'consumable' } });
      expect(screen.getByText(/consumable/i)).toBeInTheDocument();
    });

    it('renders calibrator category', () => {
      renderScanResult({ reagent: { ...sampleReagent, category: 'calibrator' } });
      expect(screen.getByText(/calibrator/i)).toBeInTheDocument();
    });
  });

  describe('different units', () => {
    it('shows mL unit', () => {
      renderScanResult({ reagent: { ...sampleReagent, unit: 'mL' } });
      expect(screen.getByText(/50 mL/)).toBeInTheDocument();
    });

    it('shows pieces unit', () => {
      renderScanResult({ reagent: { ...sampleReagent, unit: 'pieces' } });
      expect(screen.getByText(/50 pieces/)).toBeInTheDocument();
    });
  });
});
