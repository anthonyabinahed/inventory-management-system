-- Migration: Schema adjustments for production data
-- 1. Rename internal_barcode → reference on reagents
-- 2. Add category column to reagents
-- 3. Make expiry_date nullable on lots (for consumables)

-- =============================================================================
-- 1. RENAME internal_barcode → reference
-- =============================================================================

ALTER TABLE public.reagents RENAME COLUMN internal_barcode TO reference;
ALTER INDEX idx_reagents_barcode RENAME TO idx_reagents_reference;

-- =============================================================================
-- 2. ADD category COLUMN TO reagents
-- =============================================================================

ALTER TABLE public.reagents
  ADD COLUMN category TEXT NOT NULL DEFAULT 'reagent'
  CHECK (category IN ('reagent', 'control', 'calibrator', 'consumable', 'solution'));

CREATE INDEX idx_reagents_category ON public.reagents(category);

-- =============================================================================
-- 3. MAKE expiry_date NULLABLE ON lots
-- =============================================================================

ALTER TABLE public.lots ALTER COLUMN expiry_date DROP NOT NULL;

-- Recreate the shelf_life_days computed column to handle NULL expiry_date
ALTER TABLE public.lots DROP COLUMN shelf_life_days;
ALTER TABLE public.lots
  ADD COLUMN shelf_life_days INTEGER GENERATED ALWAYS AS (
    CASE WHEN expiry_date IS NOT NULL THEN expiry_date - date_of_reception ELSE NULL END
  ) STORED;
