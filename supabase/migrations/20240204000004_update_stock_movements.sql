-- Migration: Update stock_movements table to reference lots
-- Add lot_id column for lot-level stock tracking

-- Add lot_id column (nullable for backward compatibility with existing data)
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL;

-- Create index for lot-based queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_lot ON public.stock_movements(lot_id);

-- Composite index for lot history (movements for a specific lot, ordered by time)
CREATE INDEX IF NOT EXISTS idx_stock_movements_lot_date ON public.stock_movements(lot_id, performed_at DESC);

-- Update comment on table
COMMENT ON TABLE public.stock_movements IS
  'Immutable audit log of all stock movements. Each movement now tracks lot_id for lot-level operations.
   reagent_id is kept for backward compatibility and denormalized queries.';

COMMENT ON COLUMN public.stock_movements.lot_id IS
  'Reference to the specific lot this movement affects. NULL for legacy data migrated before lot support.';

COMMENT ON COLUMN public.stock_movements.reagent_id IS
  'Reference to the reagent. Kept for backward compatibility and to simplify reagent-level history queries.';
