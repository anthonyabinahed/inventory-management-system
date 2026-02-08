-- Migration: Create lots table for per-lot tracking
-- Each reagent can have multiple lots with different expiry dates and quantities

CREATE TABLE public.lots (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to reagent master
  reagent_id UUID NOT NULL REFERENCES public.reagents(id) ON DELETE CASCADE,

  -- Lot identification
  lot_number TEXT NOT NULL,

  -- Quantity for this specific lot
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),

  -- Dates specific to this lot
  expiry_date DATE NOT NULL,
  date_of_reception DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Computed field for shelf life (days between reception and expiry)
  shelf_life_days INTEGER GENERATED ALWAYS AS (expiry_date - date_of_reception) STORED,

  -- Audit fields
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Soft delete (keeps lot history for audit trail)
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Unique constraint: same reagent cannot have duplicate lot numbers
  CONSTRAINT unique_reagent_lot UNIQUE (reagent_id, lot_number)
);

-- Indexes for common queries
CREATE INDEX idx_lots_reagent_id ON public.lots(reagent_id);
CREATE INDEX idx_lots_lot_number ON public.lots(lot_number);
CREATE INDEX idx_lots_expiry_date ON public.lots(expiry_date);
CREATE INDEX idx_lots_quantity ON public.lots(quantity);
CREATE INDEX idx_lots_active ON public.lots(is_active);

-- Composite index for fetching lots by reagent with expiry order
CREATE INDEX idx_lots_reagent_expiry ON public.lots(reagent_id, expiry_date ASC)
  WHERE is_active = true;

-- Composite index for FIFO queries (oldest expiry first, only lots with stock)
CREATE INDEX idx_lots_fifo ON public.lots(reagent_id, expiry_date ASC, created_at ASC)
  WHERE is_active = true AND quantity > 0;

-- Composite index for expiry alerts (lots expiring soon)
CREATE INDEX idx_lots_expiry_active ON public.lots(expiry_date, is_active)
  WHERE is_active = true AND quantity > 0;

-- Enable Row Level Security
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- All authenticated users can view lots
CREATE POLICY "Authenticated can view lots"
  ON public.lots
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert lots (stock in)
CREATE POLICY "Authenticated can insert lots"
  ON public.lots
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- All authenticated users can update lots (stock adjustments)
CREATE POLICY "Authenticated can update lots"
  ON public.lots
  FOR UPDATE
  TO authenticated
  USING (true);

-- Only admins can delete lots
CREATE POLICY "Admins can delete lots"
  ON public.lots
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger for updated_at timestamp
CREATE TRIGGER on_lot_updated
  BEFORE UPDATE ON public.lots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON public.lots TO authenticated;
