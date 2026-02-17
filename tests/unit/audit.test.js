import { vi, describe, it, expect, beforeEach } from 'vitest';
import { logAuditEvent } from '@/libs/audit';

describe('logAuditEvent', () => {
  let mockSupabase;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
  });

  it('inserts correct data into audit_logs', async () => {
    await logAuditEvent(mockSupabase, 'user-123', {
      action: 'create_reagent',
      resourceType: 'reagent',
      resourceId: 'reagent-456',
      description: 'Created reagent "Test"',
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    expect(mockSupabase.from().insert).toHaveBeenCalledWith({
      action: 'create_reagent',
      resource_type: 'reagent',
      resource_id: 'reagent-456',
      description: 'Created reagent "Test"',
      user_id: 'user-123',
    });
  });

  it('handles null resourceId', async () => {
    await logAuditEvent(mockSupabase, 'user-123', {
      action: 'invite_user',
      resourceType: 'user',
      description: 'Invited user "test@test.com"',
    });

    expect(mockSupabase.from().insert).toHaveBeenCalledWith(
      expect.objectContaining({ resource_id: null })
    );
  });

  it('does not throw when insert fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
    });

    // Should not throw
    await expect(
      logAuditEvent(mockSupabase, 'user-123', {
        action: 'stock_in',
        resourceType: 'lot',
        description: 'Test',
      })
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to log audit event:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('does not throw when supabase throws', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabase.from.mockImplementation(() => {
      throw new Error('Connection lost');
    });

    await expect(
      logAuditEvent(mockSupabase, 'user-123', {
        action: 'delete_reagent',
        resourceType: 'reagent',
        description: 'Test',
      })
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
