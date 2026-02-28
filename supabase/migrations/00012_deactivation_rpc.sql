-- Migration: Atomic RPC functions for user deactivation/reactivation
-- Wraps all DB operations in a single transaction to prevent partial failures.

-- =============================================================================
-- 1. DEACTIVATE USER (atomic transaction)
-- =============================================================================

CREATE OR REPLACE FUNCTION deactivate_user_tx(
  target_user_id UUID,
  admin_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark profile as inactive and disable email alerts
  UPDATE profiles
  SET is_active = false,
      receive_email_alerts = false
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', target_user_id;
  END IF;

  -- Cancel any pending/processing export jobs
  UPDATE export_jobs
  SET status = 'failed',
      error_message = 'User account deactivated'
  WHERE user_id = target_user_id
    AND status IN ('pending', 'processing');

  -- Log the deactivation in audit trail
  INSERT INTO audit_logs (action, resource_type, resource_id, description, user_id)
  VALUES (
    'deactivate_user',
    'user',
    target_user_id::text,
    'Deactivated user "' || target_user_id || '"',
    admin_user_id
  );
END;
$$;

-- =============================================================================
-- 2. REACTIVATE USER (atomic transaction)
-- =============================================================================

CREATE OR REPLACE FUNCTION reactivate_user_tx(
  target_user_id UUID,
  admin_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark profile as active (does NOT re-enable email alerts)
  UPDATE profiles
  SET is_active = true
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', target_user_id;
  END IF;

  -- Log the reactivation in audit trail
  INSERT INTO audit_logs (action, resource_type, resource_id, description, user_id)
  VALUES (
    'reactivate_user',
    'user',
    target_user_id::text,
    'Reactivated user "' || target_user_id || '"',
    admin_user_id
  );
END;
$$;

-- =============================================================================
-- 3. PERMISSIONS — service_role only
-- =============================================================================

REVOKE ALL ON FUNCTION deactivate_user_tx(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION deactivate_user_tx(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION deactivate_user_tx(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION reactivate_user_tx(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION reactivate_user_tx(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION reactivate_user_tx(UUID, UUID) TO service_role;
