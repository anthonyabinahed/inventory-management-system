import { auditLogQuerySchema } from '@/libs/schemas';
import { getAuditActionBadgeClass } from '@/libs/constants';

// ============ auditLogQuerySchema ============

describe('auditLogQuerySchema', () => {
  it('accepts valid input', () => {
    const result = auditLogQuerySchema.safeParse({
      page: 2,
      limit: 50,
      search: 'reagent',
      resourceType: 'reagent',
    });
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(2);
    expect(result.data.limit).toBe(50);
    expect(result.data.search).toBe('reagent');
    expect(result.data.resourceType).toBe('reagent');
  });

  it('defaults page to 1', () => {
    const result = auditLogQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
  });

  it('defaults limit to 20', () => {
    const result = auditLogQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(20);
  });

  it('coerces string page to number', () => {
    const result = auditLogQuerySchema.safeParse({ page: '3' });
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(3);
  });

  it('coerces string limit to number', () => {
    const result = auditLogQuerySchema.safeParse({ limit: '50' });
    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(50);
  });

  it('rejects page less than 1', () => {
    const result = auditLogQuerySchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit greater than 100', () => {
    const result = auditLogQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects limit less than 1', () => {
    const result = auditLogQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('allows omitting optional fields', () => {
    const result = auditLogQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.search).toBeUndefined();
    expect(result.data.resourceType).toBeUndefined();
  });
});

// ============ getAuditActionBadgeClass ============

describe('getAuditActionBadgeClass', () => {
  it('returns badge-success for create_reagent', () => {
    expect(getAuditActionBadgeClass('create_reagent')).toBe('badge-success');
  });

  it('returns badge-success for stock_in', () => {
    expect(getAuditActionBadgeClass('stock_in')).toBe('badge-success');
  });

  it('returns badge-success for invite_user', () => {
    expect(getAuditActionBadgeClass('invite_user')).toBe('badge-success');
  });

  it('returns badge-warning for update_reagent', () => {
    expect(getAuditActionBadgeClass('update_reagent')).toBe('badge-warning');
  });

  it('returns badge-warning for update_user_role', () => {
    expect(getAuditActionBadgeClass('update_user_role')).toBe('badge-warning');
  });

  it('returns badge-info for stock_out', () => {
    expect(getAuditActionBadgeClass('stock_out')).toBe('badge-info');
  });

  it('returns badge-error for delete_reagent', () => {
    expect(getAuditActionBadgeClass('delete_reagent')).toBe('badge-error');
  });

  it('returns badge-error for delete_lot', () => {
    expect(getAuditActionBadgeClass('delete_lot')).toBe('badge-error');
  });

  it('returns badge-error for revoke_user', () => {
    expect(getAuditActionBadgeClass('revoke_user')).toBe('badge-error');
  });

  it('returns badge-success for unknown create_ action', () => {
    expect(getAuditActionBadgeClass('create_something')).toBe('badge-success');
  });

  it('returns badge-warning for unknown update_ action', () => {
    expect(getAuditActionBadgeClass('update_something')).toBe('badge-warning');
  });

  it('returns badge-error for unknown delete_ action', () => {
    expect(getAuditActionBadgeClass('delete_something')).toBe('badge-error');
  });

  it('returns badge-ghost for completely unknown action', () => {
    expect(getAuditActionBadgeClass('some_other_action')).toBe('badge-ghost');
  });
});
