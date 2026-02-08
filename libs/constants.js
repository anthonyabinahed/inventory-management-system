// Inventory constants for laboratory reagent management

// TODO: Remove these from constants
export const SECTORS = [
  { value: 'hematology', label: 'Hematology' },
  { value: 'microbiology', label: 'Microbiology' },
  { value: 'biochemistry', label: 'Biochemistry' },
  { value: 'immunology', label: 'Immunology' },
  { value: 'coagulation', label: 'Coagulation' },
  { value: 'urinalysis', label: 'Urinalysis' },
  { value: 'other', label: 'Other' },
];

// TODO: Remove these from constants
export const MACHINES = [
  { value: 'dxi_9000', label: 'DXI 9000' },
  { value: 'kryptor', label: 'Kryptor' },
  { value: 'au_680', label: 'AU 680' },
  { value: 'sysmex_xn', label: 'Sysmex XN' },
  { value: 'vitek_2', label: 'Vitek 2' },
  { value: 'bc_6800', label: 'BC 6800' },
  { value: 'cobas_e411', label: 'Cobas E411' },
  { value: 'architect_i2000', label: 'Architect i2000' },
  { value: 'other', label: 'Other' },
];

export const UNITS = [
  { value: 'vials', label: 'Vials' },
  { value: 'tests', label: 'Tests' },
  { value: 'mL', label: 'mL' },
  { value: 'kits', label: 'Kits' },
  { value: 'bottles', label: 'Bottles' },
  { value: 'boxes', label: 'Boxes' },
  { value: 'units', label: 'Units' },
  { value: 'strips', label: 'Strips' },
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

// Get label for a value from a constants array
// TODO: Remove since we are not using the constants of Sectors and machines
export function getLabel(constants, value) {
  const item = constants.find(c => c.value === value);
  return item ? item.label : value;
}
