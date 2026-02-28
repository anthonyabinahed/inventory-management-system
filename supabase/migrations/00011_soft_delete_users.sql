-- Migration: Add soft-delete support for user profiles
-- Instead of hard-deleting users from auth.users (which cascades to profiles
-- and breaks FK constraints), we mark profiles as inactive and ban in Auth.

-- =============================================================================
-- 1. ADD is_active COLUMN
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- =============================================================================
-- 2. SAFETY NET: ON DELETE SET NULL for nullable FK columns
-- =============================================================================

-- reagents.created_by
ALTER TABLE public.reagents
  DROP CONSTRAINT IF EXISTS reagents_created_by_fkey;
ALTER TABLE public.reagents
  ADD CONSTRAINT reagents_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- reagents.updated_by
ALTER TABLE public.reagents
  DROP CONSTRAINT IF EXISTS reagents_updated_by_fkey;
ALTER TABLE public.reagents
  ADD CONSTRAINT reagents_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- lots.created_by
ALTER TABLE public.lots
  DROP CONSTRAINT IF EXISTS lots_created_by_fkey;
ALTER TABLE public.lots
  ADD CONSTRAINT lots_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- lots.updated_by
ALTER TABLE public.lots
  DROP CONSTRAINT IF EXISTS lots_updated_by_fkey;
ALTER TABLE public.lots
  ADD CONSTRAINT lots_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- =============================================================================
-- 3. UPDATE RLS POLICIES — require is_active = true for mutating operations
-- =============================================================================

-- Admins can insert profiles (only if the admin is active)
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Admins can update any profile (only if the admin is active)
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Users can update their own profile (only if active)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id AND is_active = true)
  WITH CHECK (auth.uid() = id AND is_active = true);

-- Admins can delete profiles (only if the admin is active, cannot delete self)
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
    AND id != auth.uid()
  );