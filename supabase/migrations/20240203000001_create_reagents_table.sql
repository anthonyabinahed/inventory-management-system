-- TODO: put all migrations in Opus and let it fix them, merge migrations directly from the beginning so they're not confusing.
-- Create reagents table for laboratory inventory management
CREATE TABLE IF NOT EXISTS public.reagents (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic identification
  name TEXT NOT NULL,
  internal_barcode TEXT UNIQUE NOT NULL,
  lot_number TEXT NOT NULL,
  supplier TEXT NOT NULL,

  -- Dates and shelf life
  date_of_reception DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  shelf_life_days INTEGER GENERATED ALWAYS AS (expiry_date - date_of_reception) STORED,

  -- Quantity management
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  minimum_stock INTEGER NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  unit TEXT NOT NULL DEFAULT 'units',

  -- Location and storage
  storage_location TEXT NOT NULL,
  storage_temperature TEXT NOT NULL,

  -- Categorization
  sector TEXT NOT NULL CHECK (sector IN ('hematology', 'microbiology', 'biochemistry', 'immunology', 'coagulation', 'urinalysis', 'other')),
  machine TEXT CHECK (machine IS NULL OR machine IN ('dxi_9000', 'kryptor', 'au_680', 'sysmex_xn', 'vitek_2', 'bc_6800', 'cobas_e411', 'architect_i2000', 'other')),

  -- Audit fields
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Soft delete
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Indexes for common queries and filtering
CREATE INDEX idx_reagents_name ON public.reagents(name);
CREATE INDEX idx_reagents_barcode ON public.reagents(internal_barcode);
CREATE INDEX idx_reagents_lot ON public.reagents(lot_number);
CREATE INDEX idx_reagents_supplier ON public.reagents(supplier);
CREATE INDEX idx_reagents_sector ON public.reagents(sector);
CREATE INDEX idx_reagents_machine ON public.reagents(machine);
CREATE INDEX idx_reagents_storage_location ON public.reagents(storage_location);
CREATE INDEX idx_reagents_expiry_date ON public.reagents(expiry_date);
CREATE INDEX idx_reagents_quantity ON public.reagents(quantity);
CREATE INDEX idx_reagents_active ON public.reagents(is_active);

-- Composite index for low stock alerts
CREATE INDEX idx_reagents_low_stock ON public.reagents(quantity, minimum_stock)
  WHERE is_active = true;

-- Composite index for expiry tracking
CREATE INDEX idx_reagents_expiry_active ON public.reagents(expiry_date, is_active)
  WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.reagents ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- All authenticated users can view reagents
CREATE POLICY "Authenticated can view reagents"
  ON public.reagents
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert reagents
CREATE POLICY "Authenticated can insert reagents"
  ON public.reagents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- All authenticated users can update reagents
CREATE POLICY "Authenticated can update reagents"
  ON public.reagents
  FOR UPDATE
  TO authenticated
  USING (true);

-- Trigger for updated_at timestamp (reuse existing function from profiles)
CREATE TRIGGER on_reagent_updated
  BEFORE UPDATE ON public.reagents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON public.reagents TO authenticated;
