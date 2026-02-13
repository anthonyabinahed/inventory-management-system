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

describe('ScanResult', () => {
  it('renders reagent info for existing lot', () => {
    render(
      <ScanResult
        reagent={sampleReagent}
        lot={sampleLot}
        lotNumber="LOT-001"
        expiryDate="2027-06-30"
        onStockIn={vi.fn()}
        onStockOut={vi.fn()}
        onScanAnother={vi.fn()}
      />
    );

    expect(screen.getByText('CBC Diluent')).toBeInTheDocument();
    expect(screen.getByText(/Ref: REF-001/)).toBeInTheDocument();
    expect(screen.getByText(/Lot: LOT-001/)).toBeInTheDocument();
    expect(screen.getByText(/50 vials/)).toBeInTheDocument();
    expect(screen.getByTestId('expiry-badge')).toBeInTheDocument();
  });

  it('shows lot number from lotNumber prop when lot is null (new lot)', () => {
    render(
      <ScanResult
        reagent={sampleReagent}
        lot={null}
        lotNumber="LOT-NEW-123"
        expiryDate={null}
        onStockIn={vi.fn()}
        onStockOut={vi.fn()}
        onScanAnother={vi.fn()}
      />
    );

    expect(screen.getByText(/Lot: LOT-NEW-123/)).toBeInTheDocument();
  });

  it('shows "New lot" badge when lot is null', () => {
    render(
      <ScanResult
        reagent={sampleReagent}
        lot={null}
        lotNumber="LOT-NEW"
        expiryDate={null}
        onStockIn={vi.fn()}
        onStockOut={vi.fn()}
        onScanAnother={vi.fn()}
      />
    );

    expect(screen.getByText('New lot')).toBeInTheDocument();
  });

  it('does not show stock info when lot is null', () => {
    render(
      <ScanResult
        reagent={sampleReagent}
        lot={null}
        lotNumber="LOT-NEW"
        expiryDate={null}
        onStockIn={vi.fn()}
        onStockOut={vi.fn()}
        onScanAnother={vi.fn()}
      />
    );

    expect(screen.queryByText('Current stock:')).not.toBeInTheDocument();
  });

  it('disables Stock Out button when lot is null', () => {
    render(
      <ScanResult
        reagent={sampleReagent}
        lot={null}
        lotNumber="LOT-NEW"
        expiryDate={null}
        onStockIn={vi.fn()}
        onStockOut={vi.fn()}
        onScanAnother={vi.fn()}
      />
    );

    const stockOutButton = screen.getByText('Stock Out').closest('button');
    expect(stockOutButton).toBeDisabled();
  });

  it('disables Stock Out button when lot quantity is 0', () => {
    render(
      <ScanResult
        reagent={sampleReagent}
        lot={{ ...sampleLot, quantity: 0 }}
        lotNumber="LOT-001"
        expiryDate="2027-06-30"
        onStockIn={vi.fn()}
        onStockOut={vi.fn()}
        onScanAnother={vi.fn()}
      />
    );

    const stockOutButton = screen.getByText('Stock Out').closest('button');
    expect(stockOutButton).toBeDisabled();
  });

  it('enables Stock Out button when lot has stock', () => {
    render(
      <ScanResult
        reagent={sampleReagent}
        lot={sampleLot}
        lotNumber="LOT-001"
        expiryDate="2027-06-30"
        onStockIn={vi.fn()}
        onStockOut={vi.fn()}
        onScanAnother={vi.fn()}
      />
    );

    const stockOutButton = screen.getByText('Stock Out').closest('button');
    expect(stockOutButton).not.toBeDisabled();
  });

  it('calls onStockIn when Stock In is clicked', async () => {
    const onStockIn = vi.fn();
    const user = userEvent.setup();

    render(
      <ScanResult
        reagent={sampleReagent}
        lot={sampleLot}
        lotNumber="LOT-001"
        expiryDate="2027-06-30"
        onStockIn={onStockIn}
        onStockOut={vi.fn()}
        onScanAnother={vi.fn()}
      />
    );

    await user.click(screen.getByText('Stock In'));
    expect(onStockIn).toHaveBeenCalled();
  });

  it('calls onScanAnother when Scan Another is clicked', async () => {
    const onScanAnother = vi.fn();
    const user = userEvent.setup();

    render(
      <ScanResult
        reagent={sampleReagent}
        lot={sampleLot}
        lotNumber="LOT-001"
        expiryDate="2027-06-30"
        onStockIn={vi.fn()}
        onStockOut={vi.fn()}
        onScanAnother={onScanAnother}
      />
    );

    await user.click(screen.getByText('Scan Another'));
    expect(onScanAnother).toHaveBeenCalled();
  });

  it('shows reagent details (supplier, location, temperature)', () => {
    render(
      <ScanResult
        reagent={sampleReagent}
        lot={sampleLot}
        lotNumber="LOT-001"
        expiryDate="2027-06-30"
        onStockIn={vi.fn()}
        onStockOut={vi.fn()}
        onScanAnother={vi.fn()}
      />
    );

    expect(screen.getByText('Beckman Coulter')).toBeInTheDocument();
    expect(screen.getByText('Fridge A')).toBeInTheDocument();
    expect(screen.getByText('2-8°C')).toBeInTheDocument();
  });
});
