import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getErrorMessage } from '@/libs/utils';

// Silence console.error from getErrorMessage
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getErrorMessage', () => {
  // --- PostgreSQL error codes ---

  describe('23505 — unique_violation', () => {
    it('returns reference message when detail contains "reference"', () => {
      const error = { code: '23505', detail: 'Key (reference)=(ABC123) already exists.' };
      expect(getErrorMessage(error)).toBe('An item with this reference already exists.');
    });

    it('returns lot_number message when detail contains "lot_number"', () => {
      const error = { code: '23505', detail: 'Key (lot_number)=(LOT001) already exists.' };
      expect(getErrorMessage(error)).toBe('This lot number already exists for this reagent.');
    });

    it('returns generic unique violation message for other fields', () => {
      const error = { code: '23505', detail: 'Key (email)=(a@b.com) already exists.' };
      expect(getErrorMessage(error)).toBe('A record with this value already exists.');
    });

    it('returns generic unique violation when no detail', () => {
      const error = { code: '23505' };
      expect(getErrorMessage(error)).toBe('A record with this value already exists.');
    });
  });

  describe('23503 — foreign_key_violation', () => {
    it('returns referenced record not found', () => {
      const error = { code: '23503', detail: 'Key (reagent_id)=(xxx) is not present.' };
      expect(getErrorMessage(error)).toBe('Referenced record not found.');
    });
  });

  describe('23514 — check_violation', () => {
    it('returns negative quantity message for quantity check', () => {
      const error = { code: '23514', message: 'new row violates check constraint on quantity' };
      expect(getErrorMessage(error)).toBe('Quantity cannot be negative.');
    });

    it('returns negative quantity message for minimum_stock check', () => {
      const error = { code: '23514', detail: 'violates check constraint on minimum_stock' };
      expect(getErrorMessage(error)).toBe('Quantity cannot be negative.');
    });

    it('returns negative quantity message for total_quantity check', () => {
      const error = { code: '23514', message: 'check constraint on total_quantity violated' };
      expect(getErrorMessage(error)).toBe('Quantity cannot be negative.');
    });

    it('returns generic constraint message for other checks', () => {
      const error = { code: '23514', message: 'check constraint violated' };
      expect(getErrorMessage(error)).toBe('Value does not meet the required constraints.');
    });
  });

  describe('42P01 — undefined_table', () => {
    it('returns migration message', () => {
      const error = { code: '42P01', message: 'relation "reagents" does not exist' };
      expect(getErrorMessage(error)).toBe('Database table not found. Please run migrations.');
    });
  });

  // --- Generic error handling ---

  it('returns error.message for errors without known code', () => {
    const error = { message: 'Network timeout' };
    expect(getErrorMessage(error)).toBe('Network timeout');
  });

  it('truncates messages longer than 150 characters', () => {
    const longMessage = 'A'.repeat(200);
    const error = { message: longMessage };
    const result = getErrorMessage(error);
    expect(result).toBe('A'.repeat(150) + '...');
    expect(result.length).toBe(153);
  });

  it('does not truncate messages at exactly 150 characters', () => {
    const msg = 'B'.repeat(150);
    const error = { message: msg };
    expect(getErrorMessage(error)).toBe(msg);
  });

  it('returns default message when error has no message', () => {
    expect(getErrorMessage({})).toBe('Something went wrong');
  });

  it('returns default message for null error', () => {
    expect(getErrorMessage(null)).toBe('Something went wrong');
  });

  it('returns default message for undefined error', () => {
    expect(getErrorMessage(undefined)).toBe('Something went wrong');
  });

  it('uses custom default message when provided', () => {
    expect(getErrorMessage({}, 'Custom fallback')).toBe('Custom fallback');
  });
});
