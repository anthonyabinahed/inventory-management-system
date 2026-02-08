

-- Migration: Create reagents table
-- Master table for reagent/inventory items (without lot-specific data)

-- =============================================================================
-- TABLE DEFINITION
-- =============================================================================

CREATE TABLE public.reagents (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic identification
  name TEXT NOT NULL,
  internal_barcode TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Supplier info
  supplier TEXT NOT NULL,

  -- Location and storage
  storage_location TEXT NOT NULL,
  storage_temperature TEXT NOT NULL,

  -- Categorization (free text fields)
  sector TEXT NOT NULL,
  machine TEXT,

  -- Stock management
  -- total_quantity is aggregated from lots via trigger
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

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_reagents_name ON public.reagents(name);
CREATE INDEX idx_reagents_barcode ON public.reagents(internal_barcode);
CREATE INDEX idx_reagents_supplier ON public.reagents(supplier);
CREATE INDEX idx_reagents_sector ON public.reagents(sector);
CREATE INDEX idx_reagents_machine ON public.reagents(machine);
CREATE INDEX idx_reagents_storage_location ON public.reagents(storage_location);
CREATE INDEX idx_reagents_total_quantity ON public.reagents(total_quantity);
CREATE INDEX idx_reagents_active ON public.reagents(is_active);

-- Composite index for low stock alerts
CREATE INDEX idx_reagents_low_stock ON public.reagents(total_quantity, minimum_stock)
  WHERE is_active = true;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.reagents ENABLE ROW LEVEL SECURITY;

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

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger for updated_at timestamp (uses function from profiles migration)
CREATE TRIGGER on_reagent_updated
  BEFORE UPDATE ON public.reagents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE ON public.reagents TO authenticated;


