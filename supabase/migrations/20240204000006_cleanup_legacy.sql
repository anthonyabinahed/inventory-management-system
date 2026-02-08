-- Migration: Cleanup legacy schema
-- Drop reagents_legacy table and remove deprecated columns from stock_movements

-- Step 1: Drop foreign key constraint and indexes that reference reagents_legacy
-- Must happen BEFORE dropping the table

-- Remove the foreign key constraint on reagent_id
ALTER TABLE public.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_reagent_id_fkey;

-- Drop the indexes that reference these columns
DROP INDEX IF EXISTS idx_stock_movements_reagent;
DROP INDEX IF EXISTS idx_stock_movements_reagent_date;

-- Step 2: Drop reagents_legacy table if it exists
DROP TABLE IF EXISTS public.reagents_legacy;

-- Step 3: Drop deprecated columns from stock_movements
-- Since we now use lot_id, we no longer need reagent_id (can be derived from lot)
-- Also drop lot_number and expiry_date (now stored in lots table)

-- Drop the columns
ALTER TABLE public.stock_movements
  DROP COLUMN IF EXISTS reagent_id,
  DROP COLUMN IF EXISTS lot_number,
  DROP COLUMN IF EXISTS expiry_date;

-- Add comment documenting the change
COMMENT ON TABLE public.stock_movements IS
  'Immutable audit log of all stock movements. Each movement references lot_id only.
   Reagent info is accessible via lots.reagent_id join.';

-- Step 3: Make lot_id NOT NULL for new records (keep nulls for legacy)
-- Note: Not making it NOT NULL to preserve any existing records without lot_id
