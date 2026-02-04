-- Fix RLS policies for profiles table
-- This migration drops old policies and creates simpler ones

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create simple SELECT policy for authenticated users
-- (Appropriate for internal tool with ~20 users)
CREATE POLICY "Authenticated can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);
