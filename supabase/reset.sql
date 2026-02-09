-- Reset database by dropping and recreating public schema
-- WARNING: This will delete ALL data and tables AND users

-- Delete all auth users (this requires service_role or postgres access)
-- Profiles will be deleted automatically due to CASCADE on foreign key
DELETE FROM auth.users;

-- Drop all tables in public schema (CASCADE drops all dependent objects including RLS policies)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Restore default grants for public schema
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Clear migration history so migrations can run fresh
TRUNCATE supabase_migrations.schema_migrations;


