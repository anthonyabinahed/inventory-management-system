-- Fix: grant authenticated role access to export_jobs table
-- Missing from 00007_create_export_jobs.sql
GRANT SELECT, INSERT ON public.export_jobs TO authenticated;
