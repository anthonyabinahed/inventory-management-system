-- Migration: Create audit_logs table
-- Immutable log of all system operations for audit purposes

-- =============================================================================
-- TABLE DEFINITION
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What happened
  action TEXT NOT NULL,          -- 'create_reagent', 'stock_in', 'update_user_role', etc.
  resource_type TEXT NOT NULL,   -- 'reagent', 'lot', 'user', 'stock'
  resource_id TEXT,              -- ID of affected resource (TEXT — not all refs are UUIDs)
  description TEXT NOT NULL,     -- Human-readable: "Created reagent CBC Diluent"

  -- Who and when
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audit_logs IS
  'Immutable audit log of all system operations. No UPDATE or DELETE allowed.';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_audit_logs_performed_at ON public.audit_logs(performed_at DESC);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_date ON public.audit_logs(resource_type, performed_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view audit logs
CREATE POLICY "Authenticated can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert audit logs
CREATE POLICY "Authenticated can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No UPDATE policy — audit logs are immutable
-- No DELETE policy — audit logs cannot be deleted

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Only SELECT and INSERT — audit logs are immutable (no UPDATE or DELETE)
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
