-- Seed data for the reagent inventory schema
-- This creates sample reagents, their associated lots, and initial stock movement records
-- NOTE: stock_movements table only has lot_id (not reagent_id, lot_number, expiry_date)

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
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('CBC Diluent', 'HEM-001-2024', 'Complete blood count diluent solution', 'Beckman Coulter', 10, 'bottles', 'Fridge A - Shelf 1', '2-8°C', 'Hematology', 'DXI 9000', 50, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_hem_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_hem_001, 'LOT-2024-001', 30, '2025-06-30', '2024-01-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 30, 0, 30, 'Initial stock from inventory setup', seed_user_id);

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_hem_001, 'LOT-2024-045', 20, '2025-09-15', '2024-03-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 20, 0, 20, 'Initial stock from inventory setup', seed_user_id);

  -- Reticulocyte Reagent (low stock)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Reticulocyte Reagent', 'HEM-002-2024', 'For reticulocyte analysis', 'Sysmex Corporation', 10, 'vials', 'Fridge A - Shelf 2', '2-8°C', 'Hematology', 'Sysmex XN', 3, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_hem_002;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_hem_002, 'LOT-2024-002', 3, '2025-08-15', '2024-02-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 3, 0, 3, 'Initial stock from inventory setup', seed_user_id);

  -- Hemoglobin Calibrator (expiring soon - within 7 days)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Hemoglobin Calibrator', 'HEM-003-2024', 'Calibration standard for hemoglobin', 'Bio-Rad', 5, 'kits', 'Fridge A - Shelf 3', '2-8°C', 'Hematology', 'Sysmex XN', 25, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_hem_003;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_hem_003, 'LOT-2023-089', 25, CURRENT_DATE + INTERVAL '5 days', '2023-06-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 25, 0, 25, 'Initial stock from inventory setup', seed_user_id);

  -- WBC Lyse Reagent (expired lot)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('WBC Lyse Reagent', 'HEM-004-2024', 'White blood cell lysing solution', 'Beckman Coulter', 5, 'bottles', 'Fridge A - Shelf 1', '2-8°C', 'Hematology', 'DXI 9000', 8, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_hem_004;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_hem_004, 'LOT-2023-045', 8, CURRENT_DATE - INTERVAL '10 days', '2023-03-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 8, 0, 8, 'Initial stock from inventory setup', seed_user_id);

  -- PLT Counting Reagent (out of stock)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('PLT Counting Reagent', 'HEM-005-2024', 'Platelet counting reagent', 'Sysmex Corporation', 15, 'vials', 'Fridge A - Shelf 2', '2-8°C', 'Hematology', 'Sysmex XN', 0, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_hem_005;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_hem_005, 'LOT-2024-012', 0, '2025-12-31', '2024-01-05', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 0, 0, 0, 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- MICROBIOLOGY SECTOR
  -- ============================================

  -- VITEK 2 GP Cards (multiple lots, normal stock)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('VITEK 2 GP Cards', 'MIC-001-2024', 'Gram-positive identification cards', 'bioMérieux', 20, 'boxes', 'Room Temp Cabinet B', '15-25°C', 'Microbiology', 'VITEK 2', 100, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_mic_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_mic_001, 'LOT-2024-MIC-001', 60, '2025-07-20', '2024-01-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 60, 0, 60, 'Initial stock from inventory setup', seed_user_id);

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_mic_001, 'LOT-2024-MIC-067', 40, '2025-10-15', '2024-04-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 40, 0, 40, 'Initial stock from inventory setup', seed_user_id);

  -- VITEK 2 GN Cards (expiring within 30 days)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('VITEK 2 GN Cards', 'MIC-002-2024', 'Gram-negative identification cards', 'bioMérieux', 15, 'boxes', 'Room Temp Cabinet B', '15-25°C', 'Microbiology', 'VITEK 2', 45, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_mic_002;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_mic_002, 'LOT-2024-MIC-002', 45, CURRENT_DATE + INTERVAL '20 days', '2024-02-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 45, 0, 45, 'Initial stock from inventory setup', seed_user_id);

  -- Blood Culture Media (low stock and expiring soon)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Blood Culture Media', 'MIC-003-2024', 'Blood culture bottles for bacterial detection', 'BD Diagnostics', 20, 'bottles', 'Fridge B - Shelf 1', '2-8°C', 'Microbiology', NULL, 5, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_mic_003;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_mic_003, 'LOT-2023-MIC-089', 5, CURRENT_DATE + INTERVAL '15 days', '2023-08-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 5, 0, 5, 'Initial stock from inventory setup', seed_user_id);

  -- Gram Stain Kit (no machine)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Gram Stain Kit', 'MIC-004-2024', 'Crystal violet, iodine, decolorizer, safranin', 'Hardy Diagnostics', 10, 'kits', 'Room Temp Cabinet A', '15-25°C', 'Microbiology', NULL, 30, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_mic_004;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_mic_004, 'LOT-2024-MIC-045', 30, '2026-03-01', '2024-03-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 30, 0, 30, 'Initial stock from inventory setup', seed_user_id);

  -- Antibiotic Susceptibility Discs
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Antibiotic Susceptibility Discs', 'MIC-005-2024', 'Disc diffusion test discs', 'Oxoid', 50, 'strips', 'Freezer C - Drawer 1', '-20°C', 'Microbiology', 'Other', 200, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_mic_005;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_mic_005, 'LOT-2024-MIC-078', 200, '2025-11-30', '2024-02-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 200, 0, 200, 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- BIOCHEMISTRY SECTOR
  -- ============================================

  -- Glucose Reagent (multiple lots)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Glucose Reagent', 'BIO-001-2024', 'Enzymatic glucose determination', 'Roche Diagnostics', 20, 'bottles', 'Fridge C - Shelf 1', '2-8°C', 'Biochemistry', 'Cobas e411', 75, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_bio_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_bio_001, 'LOT-2024-BIO-001', 50, '2025-09-30', '2024-01-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 50, 0, 50, 'Initial stock from inventory setup', seed_user_id);

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_bio_001, 'LOT-2024-BIO-056', 25, '2025-12-15', '2024-04-05', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 25, 0, 25, 'Initial stock from inventory setup', seed_user_id);

  -- Creatinine Reagent
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Creatinine Reagent', 'BIO-002-2024', 'Jaffe method creatinine assay', 'Beckman Coulter', 15, 'bottles', 'Fridge C - Shelf 2', '2-8°C', 'Biochemistry', 'AU 680', 60, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_bio_002;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_bio_002, 'LOT-2024-BIO-002', 60, '2025-10-15', '2024-02-05', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 60, 0, 60, 'Initial stock from inventory setup', seed_user_id);

  -- Lipid Panel Reagent
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Lipid Panel Reagent', 'BIO-003-2024', 'Total cholesterol, HDL, LDL, triglycerides', 'Abbott', 10, 'kits', 'Fridge C - Shelf 3', '2-8°C', 'Biochemistry', 'Architect i2000', 40, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_bio_003;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_bio_003, 'LOT-2024-BIO-003', 40, '2025-07-25', '2024-01-25', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 40, 0, 40, 'Initial stock from inventory setup', seed_user_id);

  -- Liver Function Panel (low stock)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Liver Function Panel', 'BIO-004-2024', 'ALT, AST, ALP, bilirubin, albumin', 'Roche Diagnostics', 25, 'kits', 'Fridge C - Shelf 1', '2-8°C', 'Biochemistry', 'Cobas e411', 8, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_bio_004;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_bio_004, 'LOT-2024-BIO-004', 8, '2025-12-01', '2024-03-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 8, 0, 8, 'Initial stock from inventory setup', seed_user_id);

  -- Electrolyte Calibrator
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Electrolyte Calibrator', 'BIO-005-2024', 'Na, K, Cl calibration standard', 'Beckman Coulter', 10, 'vials', 'Fridge C - Shelf 2', '2-8°C', 'Biochemistry', 'AU 680', 35, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_bio_005;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_bio_005, 'LOT-2024-BIO-005', 35, '2025-08-15', '2024-02-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 35, 0, 35, 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- IMMUNOLOGY SECTOR
  -- ============================================

  -- TSH Reagent (multiple lots)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('TSH Reagent', 'IMM-001-2024', 'Thyroid stimulating hormone assay', 'Thermo Scientific', 25, 'tests', 'Fridge D - Shelf 1', '2-8°C', 'Immunology', 'Kryptor', 90, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_imm_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_imm_001, 'LOT-2024-IMM-001', 50, '2025-06-15', '2024-01-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 50, 0, 50, 'Initial stock from inventory setup', seed_user_id);

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_imm_001, 'LOT-2024-IMM-089', 40, '2025-11-20', '2024-05-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 40, 0, 40, 'Initial stock from inventory setup', seed_user_id);

  -- Free T4 Reagent
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Free T4 Reagent', 'IMM-002-2024', 'Free thyroxine immunoassay', 'Thermo Scientific', 20, 'tests', 'Fridge D - Shelf 1', '2-8°C', 'Immunology', 'Kryptor', 85, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_imm_002;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_imm_002, 'LOT-2024-IMM-002', 85, '2025-08-01', '2024-02-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 85, 0, 85, 'Initial stock from inventory setup', seed_user_id);

  -- Vitamin D Reagent (expiring within 30 days)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Vitamin D Reagent', 'IMM-003-2024', '25-OH Vitamin D chemiluminescent assay', 'Abbott', 15, 'tests', 'Fridge D - Shelf 2', '2-8°C', 'Immunology', 'Architect i2000', 55, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_imm_003;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_imm_003, 'LOT-2023-IMM-089', 55, CURRENT_DATE + INTERVAL '25 days', '2023-09-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 55, 0, 55, 'Initial stock from inventory setup', seed_user_id);

  -- Cortisol Reagent
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Cortisol Reagent', 'IMM-004-2024', 'Cortisol electrochemiluminescence assay', 'Roche Diagnostics', 20, 'tests', 'Fridge D - Shelf 3', '2-8°C', 'Immunology', 'Cobas e411', 70, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_imm_004;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_imm_004, 'LOT-2024-IMM-004', 70, '2025-11-05', '2024-03-05', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 70, 0, 70, 'Initial stock from inventory setup', seed_user_id);

  -- Ferritin Reagent
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Ferritin Reagent', 'IMM-005-2024', 'Ferritin immunoturbidimetric assay', 'Beckman Coulter', 15, 'tests', 'Fridge D - Shelf 2', '2-8°C', 'Immunology', 'DXI 9000', 65, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_imm_005;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_imm_005, 'LOT-2024-IMM-005', 65, '2025-09-20', '2024-02-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 65, 0, 65, 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- COAGULATION SECTOR
  -- ============================================

  -- PT Reagent (multiple lots)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('PT Reagent', 'COA-001-2024', 'Prothrombin time reagent with ISI', 'Siemens', 20, 'bottles', 'Fridge E - Shelf 1', '2-8°C', 'Coagulation', 'BCS XP', 80, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_coa_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_coa_001, 'LOT-2024-COA-001', 50, '2025-08-10', '2024-02-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 50, 0, 50, 'Initial stock from inventory setup', seed_user_id);

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_coa_001, 'LOT-2024-COA-078', 30, '2025-12-01', '2024-05-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 30, 0, 30, 'Initial stock from inventory setup', seed_user_id);

  -- APTT Reagent
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('APTT Reagent', 'COA-002-2024', 'Activated partial thromboplastin time', 'Siemens', 15, 'bottles', 'Fridge E - Shelf 1', '2-8°C', 'Coagulation', 'BCS XP', 55, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_coa_002;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_coa_002, 'LOT-2024-COA-002', 55, '2025-09-25', '2024-03-25', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 55, 0, 55, 'Initial stock from inventory setup', seed_user_id);

  -- Fibrinogen Reagent (low stock)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Fibrinogen Reagent', 'COA-003-2024', 'Clauss method fibrinogen assay', 'Siemens', 10, 'bottles', 'Fridge E - Shelf 2', '2-8°C', 'Coagulation', 'BCS XP', 4, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_coa_003;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_coa_003, 'LOT-2024-COA-003', 4, '2025-07-15', '2024-01-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 4, 0, 4, 'Initial stock from inventory setup', seed_user_id);

  -- D-Dimer Reagent (expiring within 7 days)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('D-Dimer Reagent', 'COA-004-2024', 'D-dimer latex immunoturbidimetric', 'Stago', 10, 'kits', 'Fridge E - Shelf 3', '2-8°C', 'Coagulation', 'STA-R Max', 20, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_coa_004;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_coa_004, 'LOT-2023-COA-099', 20, CURRENT_DATE + INTERVAL '4 days', '2023-08-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 20, 0, 20, 'Initial stock from inventory setup', seed_user_id);

  -- Coagulation Control Plasma
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Coagulation Control Plasma', 'COA-005-2024', 'Normal and abnormal control plasma set', 'Stago', 15, 'vials', 'Freezer B - Drawer 1', '-20°C', 'Coagulation', NULL, 45, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_coa_005;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_coa_005, 'LOT-2024-COA-005', 45, '2025-10-30', '2024-04-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 45, 0, 45, 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- URINALYSIS SECTOR
  -- ============================================

  -- Urine Dipsticks
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Urine Dipsticks 10SG', 'URI-001-2024', '10-parameter urine test strips', 'Roche Diagnostics', 100, 'strips', 'Room Temp Cabinet C', '15-25°C', 'Urinalysis', 'Cobas u411', 500, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_uri_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_uri_001, 'LOT-2024-URI-001', 500, '2025-11-15', '2024-02-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 500, 0, 500, 'Initial stock from inventory setup', seed_user_id);

  -- Urine Sediment Stain (expired)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Urine Sediment Stain', 'URI-002-2024', 'Sternheimer-Malbin stain for sediment', 'Hardy Diagnostics', 10, 'bottles', 'Room Temp Cabinet C', '15-25°C', 'Urinalysis', NULL, 15, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_uri_002;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_uri_002, 'LOT-2023-URI-045', 15, CURRENT_DATE - INTERVAL '5 days', '2023-05-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 15, 0, 15, 'Initial stock from inventory setup', seed_user_id);

  -- Urine Control
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Urine Control Level 1&2', 'URI-003-2024', 'Bi-level urine chemistry control', 'Bio-Rad', 20, 'vials', 'Fridge F - Shelf 1', '2-8°C', 'Urinalysis', 'Cobas u411', 40, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_uri_003;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_uri_003, 'LOT-2024-URI-003', 40, '2025-06-20', '2024-01-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 40, 0, 40, 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- OTHER SECTOR (QC, Calibrators, etc.)
  -- ============================================

  -- QC Material Level 1
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Quality Control Material - Level 1', 'QC-001-2024', 'Normal level QC for chemistry', 'Bio-Rad', 10, 'vials', 'Freezer A - Drawer 1', '-20°C', 'Other', NULL, 30, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_qc_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_qc_001, 'LOT-2024-QC-001', 30, '2025-04-10', '2024-01-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 30, 0, 30, 'Initial stock from inventory setup', seed_user_id);

  -- QC Material Level 2
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Quality Control Material - Level 2', 'QC-002-2024', 'Abnormal level QC for chemistry', 'Bio-Rad', 10, 'vials', 'Freezer A - Drawer 1', '-20°C', 'Other', NULL, 28, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_qc_002;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_qc_002, 'LOT-2024-QC-002', 28, '2025-04-10', '2024-01-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 28, 0, 28, 'Initial stock from inventory setup', seed_user_id);

  -- Calibration Standard Mix (expiring within 7 days)
  INSERT INTO public.reagents (name, internal_barcode, description, supplier, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Calibration Standard Mix', 'CAL-001-2024', 'Multi-analyte calibration standard', 'Thermo Scientific', 5, 'vials', 'Fridge G - Shelf 1', '2-8°C', 'Other', 'Other', 15, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_cal_001;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_cal_001, 'LOT-2023-CAL-099', 15, CURRENT_DATE + INTERVAL '3 days', '2023-07-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 15, 0, 15, 'Initial stock from inventory setup', seed_user_id);

END $$;
