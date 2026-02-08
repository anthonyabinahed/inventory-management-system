-- Migration: Create trigger to sync total_quantity on reagents table
-- This trigger fires on any INSERT/UPDATE/DELETE on the lots table
-- and recalculates the total_quantity for the parent reagent

-- Function to recalculate total_quantity on reagent
CREATE OR REPLACE FUNCTION public.update_reagent_total_quantity()
RETURNS TRIGGER AS $$
DECLARE
  target_reagent_id UUID;
  new_total INTEGER;
BEGIN
  -- Determine which reagent to update based on operation type
  IF TG_OP = 'DELETE' THEN
    target_reagent_id := OLD.reagent_id;
  ELSIF TG_OP = 'UPDATE' THEN
    target_reagent_id := NEW.reagent_id;
  ELSE  -- INSERT
    target_reagent_id := NEW.reagent_id;
  END IF;

  -- Calculate new total from all active lots for this reagent
  SELECT COALESCE(SUM(quantity), 0) INTO new_total
  FROM public.lots
  WHERE reagent_id = target_reagent_id AND is_active = true;

  -- Update the reagent's total_quantity
  UPDATE public.reagents
  SET total_quantity = new_total
  WHERE id = target_reagent_id;

  -- Handle special case: UPDATE that changes reagent_id (lot moved to different reagent)
  IF TG_OP = 'UPDATE' AND OLD.reagent_id IS DISTINCT FROM NEW.reagent_id THEN
    -- Also recalculate for the old reagent
    SELECT COALESCE(SUM(quantity), 0) INTO new_total
    FROM public.lots
    WHERE reagent_id = OLD.reagent_id AND is_active = true;

    UPDATE public.reagents
    SET total_quantity = new_total
    WHERE id = OLD.reagent_id;
  END IF;

  -- Return appropriate row based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on lots table for all data modifications
CREATE TRIGGER on_lot_quantity_change
  AFTER INSERT OR UPDATE OR DELETE ON public.lots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reagent_total_quantity();

-- Add comment for documentation
COMMENT ON FUNCTION public.update_reagent_total_quantity() IS
  'Automatically updates reagents.total_quantity when lots are inserted, updated, or deleted.
   This ensures total_quantity always reflects the sum of all active lot quantities.';
