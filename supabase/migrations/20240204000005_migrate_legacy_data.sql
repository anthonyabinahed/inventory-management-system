-- Migration: Migrate data from reagents_legacy to new schema
-- This migrates existing reagent data to the new multi-lot structure

-- Only run if legacy table exists (fresh installs won't have it)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reagents_legacy') THEN

    -- Step 1: Create temporary mapping table for legacy to new reagent IDs
    CREATE TEMP TABLE reagent_migration_map (
      legacy_id UUID,
      new_id UUID,
      internal_barcode TEXT
    );

    -- Step 2: Insert unique reagents into new reagents table
    -- Group by internal_barcode to deduplicate (each barcode = one reagent)
    WITH unique_reagents AS (
      SELECT DISTINCT ON (internal_barcode)
        internal_barcode,
        name,
        supplier,
        storage_location,
        storage_temperature,
        sector,
        machine,
        minimum_stock,
        unit,
        created_by,
        updated_by,
        created_at,
        updated_at,
        is_active
      FROM public.reagents_legacy
      ORDER BY internal_barcode, created_at ASC
    )
    INSERT INTO public.reagents (
      name, internal_barcode, description, supplier,
      storage_location, storage_temperature, sector, machine,
      minimum_stock, unit, total_quantity,
      created_by, updated_by, created_at, updated_at, is_active
    )
    SELECT
      name,
      internal_barcode,
      NULL as description,  -- New field, no legacy data
      supplier,
      storage_location,
      storage_temperature,
      sector,
      machine,
      minimum_stock,
      unit,
      0 as total_quantity,  -- Will be recalculated by trigger when lots are inserted
      created_by,
      updated_by,
      created_at,
      updated_at,
      is_active
    FROM unique_reagents;

    -- Step 3: Build mapping from legacy IDs to new IDs
    INSERT INTO reagent_migration_map (legacy_id, new_id, internal_barcode)
    SELECT
      rl.id as legacy_id,
      r.id as new_id,
      rl.internal_barcode
    FROM public.reagents_legacy rl
    JOIN public.reagents r ON r.internal_barcode = rl.internal_barcode;

    -- Step 4: Migrate lots (each legacy row becomes a lot)
    INSERT INTO public.lots (
      reagent_id, lot_number, quantity, expiry_date, date_of_reception,
      created_by, updated_by, created_at, updated_at, is_active
    )
    SELECT
      m.new_id as reagent_id,
      rl.lot_number,
      rl.quantity,
      rl.expiry_date,
      rl.date_of_reception,
      rl.created_by,
      rl.updated_by,
      rl.created_at,
      rl.updated_at,
      rl.is_active
    FROM public.reagents_legacy rl
    JOIN reagent_migration_map m ON m.legacy_id = rl.id;

    -- Step 5: Update stock_movements with lot_id
    UPDATE public.stock_movements sm
    SET lot_id = l.id
    FROM public.lots l
    JOIN reagent_migration_map m ON m.new_id = l.reagent_id
    WHERE sm.reagent_id = m.legacy_id
      AND sm.lot_number = l.lot_number;

    -- Step 6: Update stock_movements.reagent_id to new IDs
    UPDATE public.stock_movements sm
    SET reagent_id = m.new_id
    FROM reagent_migration_map m
    WHERE sm.reagent_id = m.legacy_id;

    -- Step 7: Drop temporary mapping table
    DROP TABLE reagent_migration_map;

    -- Step 8: Log migration completion
    RAISE NOTICE 'Legacy data migration completed successfully.';
    RAISE NOTICE 'The reagents_legacy table has been preserved for verification.';
    RAISE NOTICE 'Run "DROP TABLE public.reagents_legacy;" after verifying data integrity.';

  ELSE
    RAISE NOTICE 'No reagents_legacy table found. Skipping data migration (fresh install).';
  END IF;
END $$;
