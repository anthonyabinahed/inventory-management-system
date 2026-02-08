-- Reset database by dropping and recreating public schema
-- WARNING: This will delete ALL data and tables

-- Drop all tables in public schema
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Clear migration history so migrations can run fresh
TRUNCATE supabase_migrations.schema_migrations;

-- TODO: add delete policies as well if possible
