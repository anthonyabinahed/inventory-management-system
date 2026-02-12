import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: (props) => <span data-testid="alert-triangle-icon" {...props} />,
  Clock: (props) => <span data-testid="clock-icon" {...props} />,
  PackageX: (props) => <span data-testid="package-x-icon" {...props} />,
  TrendingDown: (props) => <span data-testid="trending-down-icon" {...props} />,
}));

const { AlertsPanel } = await import('@/components/AlertsPanel');

const mockAlerts = [
  {
    id: 'expiry-lot-1',
    type: 'expired',
    severity: 'error',
    reagentName: 'HbA1c Reagent',
    detail: 'Expired 5 days ago (Lot: LOT-001)',
    filter: { search: 'HbA1c Reagent' },
  },
  {
    id: 'stock-reagent-1',
    type: 'out',
    severity: 'error',
    reagentName: 'CBC Control Normal',
    detail: '0 / 10 vials',
    filter: { search: 'CBC Control Normal' },
  },
  {
    id: 'expiry-lot-2',
    type: 'warning',
    severity: 'warning',
    reagentName: 'Troponin Kit',
    detail: 'Expires in 22 days (Lot: LOT-015)',
    filter: { search: 'Troponin Kit' },
  },
  {
    id: 'stock-reagent-2',
    type: 'low',
    severity: 'warning',
    reagentName: 'ISE Solution',
    detail: '3 / 10 bottles',
    filter: { search: 'ISE Solution' },
  },
  {
    id: 'expiry-lot-3',
    type: 'critical',
    severity: 'error',
    reagentName: 'CRP Latex',
    detail: 'Expires in 3 days (Lot: LOT-099)',
    filter: { search: 'CRP Latex' },
  },
];

describe('AlertsPanel', () => {
  describe('empty state', () => {
    it('renders no-alerts message when alerts is empty array', () => {
      render(<AlertsPanel alerts={[]} onAlertClick={vi.fn()} />);
      expect(screen.getByText('No active alerts. All items are within normal parameters.')).toBeInTheDocument();
    });

    it('renders no-alerts message when alerts is null', () => {
      render(<AlertsPanel alerts={null} onAlertClick={vi.fn()} />);
      expect(screen.getByText('No active alerts. All items are within normal parameters.')).toBeInTheDocument();
    });

    it('renders no-alerts message when alerts is undefined', () => {
      render(<AlertsPanel onAlertClick={vi.fn()} />);
      expect(screen.getByText('No active alerts. All items are within normal parameters.')).toBeInTheDocument();
    });
  });

  describe('with alerts', () => {
    it('renders alert count in header', () => {
      render(<AlertsPanel alerts={mockAlerts} onAlertClick={vi.fn()} />);
      expect(screen.getByText(`Active Alerts (${mockAlerts.length})`)).toBeInTheDocument();
    });

    it('renders all alert cards with reagent names', () => {
      render(<AlertsPanel alerts={mockAlerts} onAlertClick={vi.fn()} />);
      expect(screen.getByText('HbA1c Reagent')).toBeInTheDocument();
      expect(screen.getByText('CBC Control Normal')).toBeInTheDocument();
      expect(screen.getByText('Troponin Kit')).toBeInTheDocument();
      expect(screen.getByText('ISE Solution')).toBeInTheDocument();
      expect(screen.getByText('CRP Latex')).toBeInTheDocument();
    });

    it('renders detail text for each alert', () => {
      render(<AlertsPanel alerts={mockAlerts} onAlertClick={vi.fn()} />);
      expect(screen.getByText('Expired 5 days ago (Lot: LOT-001)')).toBeInTheDocument();
      expect(screen.getByText('0 / 10 vials')).toBeInTheDocument();
      expect(screen.getByText('Expires in 22 days (Lot: LOT-015)')).toBeInTheDocument();
      expect(screen.getByText('3 / 10 bottles')).toBeInTheDocument();
    });

    it('renders correct labels for each alert type', () => {
      render(<AlertsPanel alerts={mockAlerts} onAlertClick={vi.fn()} />);
      expect(screen.getByText('Expired')).toBeInTheDocument();
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
      // 'Expiring Soon' appears for both critical and warning types
      expect(screen.getAllByText('Expiring Soon')).toHaveLength(2);
    });

    it('applies border-error class for error severity alerts', () => {
      render(<AlertsPanel alerts={[mockAlerts[0]]} onAlertClick={vi.fn()} />);
      const card = screen.getByRole('button');
      expect(card.className).toContain('border-error');
    });

    it('applies border-warning class for warning severity alerts', () => {
      render(<AlertsPanel alerts={[mockAlerts[2]]} onAlertClick={vi.fn()} />);
      const card = screen.getByRole('button');
      expect(card.className).toContain('border-warning');
    });

    it('calls onAlertClick with correct filter when card is clicked', async () => {
      const onAlertClick = vi.fn();
      const user = userEvent.setup();
      render(<AlertsPanel alerts={[mockAlerts[0]]} onAlertClick={onAlertClick} />);

      await user.click(screen.getByText('HbA1c Reagent'));
      expect(onAlertClick).toHaveBeenCalledWith({ search: 'HbA1c Reagent' });
    });

    it('calls onAlertClick with search filter for stock alerts', async () => {
      const onAlertClick = vi.fn();
      const user = userEvent.setup();
      render(<AlertsPanel alerts={[mockAlerts[1]]} onAlertClick={onAlertClick} />);

      await user.click(screen.getByText('CBC Control Normal'));
      expect(onAlertClick).toHaveBeenCalledWith({ search: 'CBC Control Normal' });
    });

    it('calls onAlertClick when Enter key is pressed on a card', () => {
      const onAlertClick = vi.fn();
      render(<AlertsPanel alerts={[mockAlerts[0]]} onAlertClick={onAlertClick} />);

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(onAlertClick).toHaveBeenCalledWith({ search: 'HbA1c Reagent' });
    });

    it('calls onAlertClick when Space key is pressed on a card', () => {
      const onAlertClick = vi.fn();
      render(<AlertsPanel alerts={[mockAlerts[0]]} onAlertClick={onAlertClick} />);

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: ' ' });
      expect(onAlertClick).toHaveBeenCalledWith({ search: 'HbA1c Reagent' });
    });

    it('sets title attribute on reagent name for truncated text', () => {
      render(<AlertsPanel alerts={[mockAlerts[0]]} onAlertClick={vi.fn()} />);
      const nameEl = screen.getByText('HbA1c Reagent');
      expect(nameEl).toHaveAttribute('title', 'HbA1c Reagent');
    });
  });
});
