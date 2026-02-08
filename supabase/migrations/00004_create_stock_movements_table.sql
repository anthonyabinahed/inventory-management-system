-- Migration: Create stock_movements table
-- Immutable audit log of all stock movements (in/out/adjustment operations)

-- =============================================================================
-- TABLE DEFINITION
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.stock_movements (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to lot (the specific lot this movement affects)
  lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL,

  -- Movement details
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'in',         -- Stock received
    'out',        -- Stock consumed/used
    'adjustment', -- Manual quantity correction
    'expired',    -- Removed due to expiration
    'damaged'     -- Removed due to damage
  )),
  
  -- Quantity tracking
  quantity INTEGER NOT NULL,          -- Amount moved (positive value)
  quantity_before INTEGER NOT NULL,   -- Lot quantity before movement
  quantity_after INTEGER NOT NULL,    -- Lot quantity after movement

  -- Additional context
  notes TEXT,

  -- Audit fields
  performed_by UUID NOT NULL REFERENCES public.profiles(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.stock_movements IS
  'Immutable audit log of all stock movements. Each movement references lot_id.
   Reagent info is accessible via lots.reagent_id join.';

COMMENT ON COLUMN public.stock_movements.lot_id IS
  'Reference to the specific lot this movement affects.';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_stock_movements_lot ON public.stock_movements(lot_id);
CREATE INDEX idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX idx_stock_movements_date ON public.stock_movements(performed_at);
CREATE INDEX idx_stock_movements_user ON public.stock_movements(performed_by);

-- Composite index for lot history (movements for a specific lot, ordered by time)
CREATE INDEX idx_stock_movements_lot_date ON public.stock_movements(lot_id, performed_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies (immutable audit log - no update/delete allowed)

-- All authenticated users can view stock movements
CREATE POLICY "Authenticated can view stock movements"
  ON public.stock_movements
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert stock movements
CREATE POLICY "Authenticated can insert stock movements"
  ON public.stock_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No UPDATE policy - movements are immutable
-- No DELETE policy - movements cannot be deleted

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Only SELECT and INSERT - movements are immutable (no UPDATE or DELETE)
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
