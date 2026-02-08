-- Create stock movements table for tracking in/out operations (audit trail)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to reagent
  -- since using soft deletes, the stock movement should never be deleted, for audit purposes
  reagent_id UUID NOT NULL REFERENCES public.reagents(id) ON DELETE RESTRICT,

  -- Movement details
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'expired', 'damaged')),
  quantity INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,

  -- Additional context
  lot_number TEXT,
  expiry_date DATE,
  notes TEXT,

  -- Audit fields
  performed_by UUID NOT NULL REFERENCES public.profiles(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_stock_movements_reagent ON public.stock_movements(reagent_id);
CREATE INDEX idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX idx_stock_movements_date ON public.stock_movements(performed_at);
CREATE INDEX idx_stock_movements_user ON public.stock_movements(performed_by);

-- Composite index for reagent history queries
CREATE INDEX idx_stock_movements_reagent_date ON public.stock_movements(reagent_id, performed_at DESC);

-- Enable Row Level Security
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

-- Grant table permissions to authenticated role
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
