-- Seed data for the new multi-lot reagent inventory schema
-- This creates sample reagents, their associated lots, and initial stock movement records

DO $$
DECLARE
  seed_user_id UUID;
  temp_lot_id UUID;
  -- Reagent IDs
  reagent_hem_001 UUID;
  reagent_hem_002 UUID;
  reagent_hem_003 UUID;
  reagent_hem_004 UUID;
  reagent_hem_005 UUID;
  reagent_mic_001 UUID;
  reagent_mic_002 UUID;
  reagent_mic_003 UUID;
  reagent_mic_004 UUID;
  reagent_mic_005 UUID;
  reagent_bio_001 UUID;
  reagent_bio_002 UUID;
  reagent_bio_003 UUID;
  reagent_bio_004 UUID;
  reagent_bio_005 UUID;
  reagent_imm_001 UUID;
  reagent_imm_002 UUID;
  reagent_imm_003 UUID;
  reagent_imm_004 UUID;
  reagent_imm_005 UUID;
  reagent_coa_001 UUID;
  reagent_coa_002 UUID;
  reagent_coa_003 UUID;
  reagent_coa_004 UUID;
  reagent_coa_005 UUID;
  reagent_uri_001 UUID;
  reagent_uri_002 UUID;
  reagent_uri_003 UUID;
  reagent_qc_001 UUID;
  reagent_qc_002 UUID;
  reagent_cal_001 UUID;
BEGIN
  -- Get first user from profiles for created_by/updated_by
  SELECT id INTO seed_user_id FROM public.profiles LIMIT 1;

  -- ============================================
  -- HEMATOLOGY SECTOR - Various machines
  -- ============================================

  -- CBC Diluent (multiple lots)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('CBC Diluent', 'HEM-001-2024', 'Complete blood count diluent solution', 'Beckman Coulter', 10, 'bottles', 'Fridge A - Shelf 1', '2-8°C', 'hematology', 'dxi_9000', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_hem_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_hem_001, 'LOT-2024-001', 30, '2025-06-30', '2024-01-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_hem_001, temp_lot_id, 'in', 30, 0, 30, 'LOT-2024-001', '2025-06-30', 'Initial stock from inventory setup', seed_user_id);

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_hem_001, 'LOT-2024-045', 20, '2025-09-15', '2024-03-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_hem_001, temp_lot_id, 'in', 20, 0, 20, 'LOT-2024-045', '2025-09-15', 'Initial stock from inventory setup', seed_user_id);

  -- Reticulocyte Reagent (low stock)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Reticulocyte Reagent', 'HEM-002-2024', 'For reticulocyte analysis', 'Sysmex Corporation', 10, 'vials', 'Fridge A - Shelf 2', '2-8°C', 'hematology', 'sysmex_xn', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_hem_002;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_hem_002, 'LOT-2024-002', 3, '2025-08-15', '2024-02-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_hem_002, temp_lot_id, 'in', 3, 0, 3, 'LOT-2024-002', '2025-08-15', 'Initial stock from inventory setup', seed_user_id);

  -- Hemoglobin Calibrator (expiring soon - within 7 days)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Hemoglobin Calibrator', 'HEM-003-2024', 'Calibration standard for hemoglobin', 'Bio-Rad', 5, 'kits', 'Fridge A - Shelf 3', '2-8°C', 'hematology', 'sysmex_xn', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_hem_003;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_hem_003, 'LOT-2023-089', 25, CURRENT_DATE + INTERVAL '5 days', '2023-06-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_hem_003, temp_lot_id, 'in', 25, 0, 25, 'LOT-2023-089', CURRENT_DATE + INTERVAL '5 days', 'Initial stock from inventory setup', seed_user_id);

  -- WBC Lyse Reagent (expired lot)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('WBC Lyse Reagent', 'HEM-004-2024', 'White blood cell lysing solution', 'Beckman Coulter', 5, 'bottles', 'Fridge A - Shelf 1', '2-8°C', 'hematology', 'dxi_9000', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_hem_004;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_hem_004, 'LOT-2023-045', 8, CURRENT_DATE - INTERVAL '10 days', '2023-03-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_hem_004, temp_lot_id, 'in', 8, 0, 8, 'LOT-2023-045', CURRENT_DATE - INTERVAL '10 days', 'Initial stock from inventory setup', seed_user_id);

  -- PLT Counting Reagent (out of stock)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('PLT Counting Reagent', 'HEM-005-2024', 'Platelet counting reagent', 'Sysmex Corporation', 15, 'vials', 'Fridge A - Shelf 2', '2-8°C', 'hematology', 'sysmex_xn', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_hem_005;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_hem_005, 'LOT-2024-012', 0, '2025-12-31', '2024-01-05', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_hem_005, temp_lot_id, 'in', 0, 0, 0, 'LOT-2024-012', '2025-12-31', 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- MICROBIOLOGY SECTOR
  -- ============================================

  -- VITEK 2 GP Cards (multiple lots, normal stock)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('VITEK 2 GP Cards', 'MIC-001-2024', 'Gram-positive identification cards', 'bioMérieux', 20, 'boxes', 'Room Temp Cabinet B', '15-25°C', 'microbiology', 'vitek_2', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_mic_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_mic_001, 'LOT-2024-MIC-001', 60, '2025-07-20', '2024-01-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_mic_001, temp_lot_id, 'in', 60, 0, 60, 'LOT-2024-MIC-001', '2025-07-20', 'Initial stock from inventory setup', seed_user_id);

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_mic_001, 'LOT-2024-MIC-067', 40, '2025-10-15', '2024-04-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_mic_001, temp_lot_id, 'in', 40, 0, 40, 'LOT-2024-MIC-067', '2025-10-15', 'Initial stock from inventory setup', seed_user_id);

  -- VITEK 2 GN Cards (expiring within 30 days)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('VITEK 2 GN Cards', 'MIC-002-2024', 'Gram-negative identification cards', 'bioMérieux', 15, 'boxes', 'Room Temp Cabinet B', '15-25°C', 'microbiology', 'vitek_2', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_mic_002;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_mic_002, 'LOT-2024-MIC-002', 45, CURRENT_DATE + INTERVAL '20 days', '2024-02-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_mic_002, temp_lot_id, 'in', 45, 0, 45, 'LOT-2024-MIC-002', CURRENT_DATE + INTERVAL '20 days', 'Initial stock from inventory setup', seed_user_id);

  -- Blood Culture Media (low stock and expiring soon)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Blood Culture Media', 'MIC-003-2024', 'Blood culture bottles for bacterial detection', 'BD Diagnostics', 20, 'bottles', 'Fridge B - Shelf 1', '2-8°C', 'microbiology', NULL, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_mic_003;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_mic_003, 'LOT-2023-MIC-089', 5, CURRENT_DATE + INTERVAL '15 days', '2023-08-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_mic_003, temp_lot_id, 'in', 5, 0, 5, 'LOT-2023-MIC-089', CURRENT_DATE + INTERVAL '15 days', 'Initial stock from inventory setup', seed_user_id);

  -- Gram Stain Kit (no machine)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Gram Stain Kit', 'MIC-004-2024', 'Crystal violet, iodine, decolorizer, safranin', 'Hardy Diagnostics', 10, 'kits', 'Room Temp Cabinet A', '15-25°C', 'microbiology', NULL, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_mic_004;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_mic_004, 'LOT-2024-MIC-045', 30, '2026-03-01', '2024-03-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_mic_004, temp_lot_id, 'in', 30, 0, 30, 'LOT-2024-MIC-045', '2026-03-01', 'Initial stock from inventory setup', seed_user_id);

  -- Antibiotic Susceptibility Discs
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Antibiotic Susceptibility Discs', 'MIC-005-2024', 'Disc diffusion test discs', 'Oxoid', 50, 'strips', 'Freezer C - Drawer 1', '-20°C', 'microbiology', 'other', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_mic_005;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_mic_005, 'LOT-2024-MIC-078', 200, '2025-11-30', '2024-02-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_mic_005, temp_lot_id, 'in', 200, 0, 200, 'LOT-2024-MIC-078', '2025-11-30', 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- BIOCHEMISTRY SECTOR
  -- ============================================

  -- Glucose Reagent (multiple lots)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Glucose Reagent', 'BIO-001-2024', 'Enzymatic glucose determination', 'Roche Diagnostics', 20, 'bottles', 'Fridge C - Shelf 1', '2-8°C', 'biochemistry', 'cobas_e411', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_bio_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_bio_001, 'LOT-2024-BIO-001', 50, '2025-09-30', '2024-01-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_bio_001, temp_lot_id, 'in', 50, 0, 50, 'LOT-2024-BIO-001', '2025-09-30', 'Initial stock from inventory setup', seed_user_id);

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_bio_001, 'LOT-2024-BIO-056', 25, '2025-12-15', '2024-04-05', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_bio_001, temp_lot_id, 'in', 25, 0, 25, 'LOT-2024-BIO-056', '2025-12-15', 'Initial stock from inventory setup', seed_user_id);

  -- Creatinine Reagent
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Creatinine Reagent', 'BIO-002-2024', 'Jaffe method creatinine assay', 'Beckman Coulter', 15, 'bottles', 'Fridge C - Shelf 2', '2-8°C', 'biochemistry', 'au_680', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_bio_002;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_bio_002, 'LOT-2024-BIO-002', 60, '2025-10-15', '2024-02-05', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_bio_002, temp_lot_id, 'in', 60, 0, 60, 'LOT-2024-BIO-002', '2025-10-15', 'Initial stock from inventory setup', seed_user_id);

  -- Lipid Panel Reagent
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Lipid Panel Reagent', 'BIO-003-2024', 'Total cholesterol, HDL, LDL, triglycerides', 'Abbott', 10, 'kits', 'Fridge C - Shelf 3', '2-8°C', 'biochemistry', 'architect_i2000', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_bio_003;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_bio_003, 'LOT-2024-BIO-003', 40, '2025-07-25', '2024-01-25', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_bio_003, temp_lot_id, 'in', 40, 0, 40, 'LOT-2024-BIO-003', '2025-07-25', 'Initial stock from inventory setup', seed_user_id);

  -- Liver Function Panel (low stock)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Liver Function Panel', 'BIO-004-2024', 'ALT, AST, ALP, bilirubin, albumin', 'Roche Diagnostics', 25, 'kits', 'Fridge C - Shelf 1', '2-8°C', 'biochemistry', 'cobas_e411', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_bio_004;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_bio_004, 'LOT-2024-BIO-004', 8, '2025-12-01', '2024-03-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_bio_004, temp_lot_id, 'in', 8, 0, 8, 'LOT-2024-BIO-004', '2025-12-01', 'Initial stock from inventory setup', seed_user_id);

  -- Electrolyte Calibrator
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Electrolyte Calibrator', 'BIO-005-2024', 'Na, K, Cl calibration standard', 'Beckman Coulter', 10, 'vials', 'Fridge C - Shelf 2', '2-8°C', 'biochemistry', 'au_680', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_bio_005;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_bio_005, 'LOT-2024-BIO-005', 35, '2025-08-15', '2024-02-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_bio_005, temp_lot_id, 'in', 35, 0, 35, 'LOT-2024-BIO-005', '2025-08-15', 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- IMMUNOLOGY SECTOR
  -- ============================================

  -- TSH Reagent (multiple lots)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('TSH Reagent', 'IMM-001-2024', 'Thyroid stimulating hormone assay', 'Thermo Scientific', 25, 'tests', 'Fridge D - Shelf 1', '2-8°C', 'immunology', 'kryptor', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_imm_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_imm_001, 'LOT-2024-IMM-001', 50, '2025-06-15', '2024-01-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_imm_001, temp_lot_id, 'in', 50, 0, 50, 'LOT-2024-IMM-001', '2025-06-15', 'Initial stock from inventory setup', seed_user_id);

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_imm_001, 'LOT-2024-IMM-089', 40, '2025-11-20', '2024-05-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_imm_001, temp_lot_id, 'in', 40, 0, 40, 'LOT-2024-IMM-089', '2025-11-20', 'Initial stock from inventory setup', seed_user_id);

  -- Free T4 Reagent
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Free T4 Reagent', 'IMM-002-2024', 'Free thyroxine immunoassay', 'Thermo Scientific', 20, 'tests', 'Fridge D - Shelf 1', '2-8°C', 'immunology', 'kryptor', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_imm_002;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_imm_002, 'LOT-2024-IMM-002', 85, '2025-08-01', '2024-02-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_imm_002, temp_lot_id, 'in', 85, 0, 85, 'LOT-2024-IMM-002', '2025-08-01', 'Initial stock from inventory setup', seed_user_id);

  -- Vitamin D Reagent (expiring within 30 days)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Vitamin D Reagent', 'IMM-003-2024', '25-OH Vitamin D chemiluminescent assay', 'Abbott', 15, 'tests', 'Fridge D - Shelf 2', '2-8°C', 'immunology', 'architect_i2000', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_imm_003;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_imm_003, 'LOT-2023-IMM-089', 55, CURRENT_DATE + INTERVAL '25 days', '2023-09-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_imm_003, temp_lot_id, 'in', 55, 0, 55, 'LOT-2023-IMM-089', CURRENT_DATE + INTERVAL '25 days', 'Initial stock from inventory setup', seed_user_id);

  -- Cortisol Reagent
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Cortisol Reagent', 'IMM-004-2024', 'Cortisol electrochemiluminescence assay', 'Roche Diagnostics', 20, 'tests', 'Fridge D - Shelf 3', '2-8°C', 'immunology', 'cobas_e411', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_imm_004;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_imm_004, 'LOT-2024-IMM-004', 70, '2025-11-05', '2024-03-05', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_imm_004, temp_lot_id, 'in', 70, 0, 70, 'LOT-2024-IMM-004', '2025-11-05', 'Initial stock from inventory setup', seed_user_id);

  -- Ferritin Reagent
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Ferritin Reagent', 'IMM-005-2024', 'Ferritin immunoturbidimetric assay', 'Beckman Coulter', 15, 'tests', 'Fridge D - Shelf 2', '2-8°C', 'immunology', 'dxi_9000', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_imm_005;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_imm_005, 'LOT-2024-IMM-005', 65, '2025-09-20', '2024-02-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_imm_005, temp_lot_id, 'in', 65, 0, 65, 'LOT-2024-IMM-005', '2025-09-20', 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- COAGULATION SECTOR
  -- ============================================

  -- PT Reagent
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('PT Reagent', 'COA-001-2024', 'Prothrombin time thromboplastin reagent', 'Stago', 10, 'vials', 'Fridge E - Shelf 1', '2-8°C', 'coagulation', 'bc_6800', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_coa_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_coa_001, 'LOT-2024-COA-001', 45, '2025-07-20', '2024-01-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_coa_001, temp_lot_id, 'in', 45, 0, 45, 'LOT-2024-COA-001', '2025-07-20', 'Initial stock from inventory setup', seed_user_id);

  -- aPTT Reagent
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('aPTT Reagent', 'COA-002-2024', 'Activated partial thromboplastin time reagent', 'Stago', 10, 'vials', 'Fridge E - Shelf 1', '2-8°C', 'coagulation', 'bc_6800', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_coa_002;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_coa_002, 'LOT-2024-COA-002', 40, '2025-08-10', '2024-02-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_coa_002, temp_lot_id, 'in', 40, 0, 40, 'LOT-2024-COA-002', '2025-08-10', 'Initial stock from inventory setup', seed_user_id);

  -- Fibrinogen Reagent (low stock)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Fibrinogen Reagent', 'COA-003-2024', 'Clauss fibrinogen assay reagent', 'Siemens', 15, 'vials', 'Fridge E - Shelf 2', '2-8°C', 'coagulation', 'bc_6800', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_coa_003;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_coa_003, 'LOT-2024-COA-003', 6, '2025-06-05', '2024-01-05', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_coa_003, temp_lot_id, 'in', 6, 0, 6, 'LOT-2024-COA-003', '2025-06-05', 'Initial stock from inventory setup', seed_user_id);

  -- D-Dimer Reagent
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('D-Dimer Reagent', 'COA-004-2024', 'Latex-enhanced immunoturbidimetric D-dimer', 'Stago', 15, 'tests', 'Fridge E - Shelf 2', '2-8°C', 'coagulation', 'bc_6800', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_coa_004;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_coa_004, 'LOT-2024-COA-004', 55, '2025-09-01', '2024-03-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_coa_004, temp_lot_id, 'in', 55, 0, 55, 'LOT-2024-COA-004', '2025-09-01', 'Initial stock from inventory setup', seed_user_id);

  -- Antithrombin III (expired)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Antithrombin III', 'COA-005-2024', 'Antithrombin activity chromogenic assay', 'Siemens', 5, 'kits', 'Fridge E - Shelf 3', '2-8°C', 'coagulation', NULL, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_coa_005;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_coa_005, 'LOT-2023-COA-078', 12, CURRENT_DATE - INTERVAL '5 days', '2023-05-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_coa_005, temp_lot_id, 'in', 12, 0, 12, 'LOT-2023-COA-078', CURRENT_DATE - INTERVAL '5 days', 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- URINALYSIS SECTOR
  -- ============================================

  -- Urine Dipstick Strips
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Urine Dipstick Strips', 'URI-001-2024', '10-parameter urine test strips', 'Siemens', 100, 'strips', 'Room Temp Cabinet C', '15-25°C', 'urinalysis', NULL, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_uri_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_uri_001, 'LOT-2024-URI-001', 500, '2025-08-01', '2024-02-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_uri_001, temp_lot_id, 'in', 500, 0, 500, 'LOT-2024-URI-001', '2025-08-01', 'Initial stock from inventory setup', seed_user_id);

  -- Urine Sediment Stain
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Urine Sediment Stain', 'URI-002-2024', 'Sternheimer-Malbin stain for urine sediment', 'Hardy Diagnostics', 5, 'bottles', 'Room Temp Cabinet C', '15-25°C', 'urinalysis', NULL, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_uri_002;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_uri_002, 'LOT-2024-URI-002', 25, '2026-01-15', '2024-01-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_uri_002, temp_lot_id, 'in', 25, 0, 25, 'LOT-2024-URI-002', '2026-01-15', 'Initial stock from inventory setup', seed_user_id);

  -- Urine Culture Media (low stock)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Urine Culture Media', 'URI-003-2024', 'CLED agar for urine culture', 'BD Diagnostics', 25, 'boxes', 'Fridge F - Shelf 1', '2-8°C', 'urinalysis', NULL, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_uri_003;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_uri_003, 'LOT-2024-URI-003', 10, '2025-05-20', '2024-02-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_uri_003, temp_lot_id, 'in', 10, 0, 10, 'LOT-2024-URI-003', '2025-05-20', 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- OTHER SECTOR
  -- ============================================

  -- QC Material Level 1
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Quality Control Material - Level 1', 'QC-001-2024', 'Normal level QC for chemistry', 'Bio-Rad', 10, 'vials', 'Freezer A - Drawer 1', '-20°C', 'other', NULL, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_qc_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_qc_001, 'LOT-2024-QC-001', 30, '2025-04-10', '2024-01-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_qc_001, temp_lot_id, 'in', 30, 0, 30, 'LOT-2024-QC-001', '2025-04-10', 'Initial stock from inventory setup', seed_user_id);

  -- QC Material Level 2
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Quality Control Material - Level 2', 'QC-002-2024', 'Abnormal level QC for chemistry', 'Bio-Rad', 10, 'vials', 'Freezer A - Drawer 1', '-20°C', 'other', NULL, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_qc_002;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_qc_002, 'LOT-2024-QC-002', 28, '2025-04-10', '2024-01-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_qc_002, temp_lot_id, 'in', 28, 0, 28, 'LOT-2024-QC-002', '2025-04-10', 'Initial stock from inventory setup', seed_user_id);

  -- Calibration Standard Mix (expiring within 7 days)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, created_by, updated_by)
  VALUES ('Calibration Standard Mix', 'CAL-001-2024', 'Multi-analyte calibration standard', 'Thermo Scientific', 5, 'vials', 'Fridge G - Shelf 1', '2-8°C', 'other', 'other', seed_user_id, seed_user_id)
  RETURNING id INTO reagent_cal_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_cal_001, 'LOT-2023-CAL-099', 15, CURRENT_DATE + INTERVAL '3 days', '2023-07-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (reagent_id, lot_id, movement_type, quantity, quantity_before, quantity_after, lot_number, expiry_date, notes, performed_by)
  VALUES (reagent_cal_001, temp_lot_id, 'in', 15, 0, 15, 'LOT-2023-CAL-099', CURRENT_DATE + INTERVAL '3 days', 'Initial stock from inventory setup', seed_user_id);

END $$;
