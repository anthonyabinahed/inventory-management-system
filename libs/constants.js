// Inventory constants for laboratory reagent management

export const UNITS = [
  { value: 'vials', label: 'Vials' },
  { value: 'tests', label: 'Tests' },
  { value: 'mL', label: 'mL' },
  { value: 'kits', label: 'Kits' },
  { value: 'bottles', label: 'Bottles' },
  { value: 'boxes', label: 'Boxes' },
  { value: 'units', label: 'Units' },
  { value: 'strips', label: 'Strips' },
  { value: 'pieces', label: 'Pieces' },
];

export const CATEGORIES = [
  { value: 'reagent', label: 'Reagent' },
  { value: 'control', label: 'Control' },
  { value: 'calibrator', label: 'Calibrator' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'solution', label: 'Solution' },
];

export const MOVEMENT_TYPES = [
  { value: 'in', label: 'Stock In', color: 'success' },
  { value: 'out', label: 'Stock Out', color: 'error' },
  { value: 'adjustment', label: 'Adjustment', color: 'warning' },
  { value: 'expired', label: 'Expired', color: 'error' },
  { value: 'damaged', label: 'Damaged', color: 'error' },
];

export const PAGE_SIZES = [25, 50, 100];

export const EXPIRY_THRESHOLDS = {
  CRITICAL_DAYS: 7,
  WARNING_DAYS: 30,
};

// Helper functions for status calculations
export function getExpiryStatus(expiryDate) {
  if (!expiryDate) return { status: 'none', daysUntil: null, color: 'default' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const daysUntil = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return { status: 'expired', daysUntil, color: 'error' };
  if (daysUntil <= EXPIRY_THRESHOLDS.CRITICAL_DAYS) return { status: 'critical', daysUntil, color: 'error' };
  if (daysUntil <= EXPIRY_THRESHOLDS.WARNING_DAYS) return { status: 'warning', daysUntil, color: 'warning' };
  return { status: 'ok', daysUntil, color: 'default' };
}

export function getStockStatus(quantity, minimumStock) {
  if (quantity <= 0) return { status: 'out', color: 'error' };
  if (quantity <= minimumStock) return { status: 'low', color: 'warning' };
  return { status: 'ok', color: 'default' };
}
