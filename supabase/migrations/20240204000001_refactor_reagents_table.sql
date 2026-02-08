-- Migration: Refactor reagents table for multi-lot support
-- This migration creates the new reagents master table structure

-- Step 1: Rename old table for migration reference
ALTER TABLE IF EXISTS public.reagents RENAME TO reagents_legacy;

-- Step 2: Drop old indexes (they reference the renamed table)
DROP INDEX IF EXISTS idx_reagents_name;
DROP INDEX IF EXISTS idx_reagents_barcode;
DROP INDEX IF EXISTS idx_reagents_lot;
DROP INDEX IF EXISTS idx_reagents_supplier;
DROP INDEX IF EXISTS idx_reagents_sector;
DROP INDEX IF EXISTS idx_reagents_machine;
DROP INDEX IF EXISTS idx_reagents_storage_location;
DROP INDEX IF EXISTS idx_reagents_expiry_date;
DROP INDEX IF EXISTS idx_reagents_quantity;
DROP INDEX IF EXISTS idx_reagents_active;
DROP INDEX IF EXISTS idx_reagents_low_stock;
DROP INDEX IF EXISTS idx_reagents_expiry_active;

-- Step 3: Create new reagents master table (without lot-specific fields)
CREATE TABLE public.reagents (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic identification
  name TEXT NOT NULL,
  internal_barcode TEXT UNIQUE NOT NULL,
  description TEXT,  -- NEW field for reagent description

  -- Supplier info
  supplier TEXT NOT NULL,

  -- Location and storage
  storage_location TEXT NOT NULL,
  storage_temperature TEXT NOT NULL,

  -- Categorization
  sector TEXT NOT NULL CHECK (sector IN ('hematology', 'microbiology', 'biochemistry', 'immunology', 'coagulation', 'urinalysis', 'other')),
  machine TEXT CHECK (machine IS NULL OR machine IN ('dxi_9000', 'kryptor', 'au_680', 'sysmex_xn', 'vitek_2', 'bc_6800', 'cobas_e411', 'architect_i2000', 'other')),

  -- Stock management (quantity aggregated from lots via trigger)
  minimum_stock INTEGER NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  unit TEXT NOT NULL DEFAULT 'units',
  total_quantity INTEGER NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),

  -- Audit fields
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Soft delete
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes for new reagents table
CREATE INDEX idx_reagents_name ON public.reagents(name);
CREATE INDEX idx_reagents_barcode ON public.reagents(internal_barcode);
CREATE INDEX idx_reagents_supplier ON public.reagents(supplier);
CREATE INDEX idx_reagents_sector ON public.reagents(sector);
CREATE INDEX idx_reagents_machine ON public.reagents(machine);
CREATE INDEX idx_reagents_storage_location ON public.reagents(storage_location);
CREATE INDEX idx_reagents_total_quantity ON public.reagents(total_quantity);
CREATE INDEX idx_reagents_active ON public.reagents(is_active);

-- Composite index for low stock alerts (uses total_quantity now)
CREATE INDEX idx_reagents_low_stock ON public.reagents(total_quantity, minimum_stock)
  WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.reagents ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same as before)
CREATE POLICY "Authenticated can view reagents"
  ON public.reagents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert reagents"
  ON public.reagents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update reagents"
  ON public.reagents
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete reagents"
  ON public.reagents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger for updated_at timestamp
CREATE TRIGGER on_reagent_updated
  BEFORE UPDATE ON public.reagents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON public.reagents TO authenticated;
