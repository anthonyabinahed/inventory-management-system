-- Seed data for the reagent inventory schema
-- Production-realistic data based on real order sheets
-- Sectors: Prenatal Screening, Immunohematology, Serology, Urinalysis, Quality Assessment

DO $$
DECLARE
  seed_user_id UUID;
  temp_lot_id UUID;
  -- Prenatal Screening - Reagents
  reagent_ps_bhcg UUID;
  reagent_ps_pappa UUID;
  reagent_ps_afp UUID;
  -- Prenatal Screening - Solutions
  reagent_ps_sol1 UUID;
  reagent_ps_sol2 UUID;
  reagent_ps_sol3 UUID;
  reagent_ps_sol4 UUID;
  reagent_ps_buffer UUID;
  -- Prenatal Screening - Controls
  reagent_ps_qc1 UUID;
  -- Prenatal Screening - Calibrators
  reagent_ps_cal_bhcg UUID;
  reagent_ps_cal_pappa UUID;
  reagent_ps_cal_afp UUID;
  -- Prenatal Screening - Consumables
  reagent_ps_tissue UUID;
  reagent_ps_lens UUID;
  reagent_ps_fluidic UUID;
  reagent_ps_reaction_plate UUID;
  reagent_ps_dilution_plate UUID;
  reagent_ps_forceps UUID;
  reagent_ps_container UUID;
  reagent_ps_sticker UUID;
  -- Immunohematology - Reagents
  reagent_ih_abod UUID;
  reagent_ih_rhk UUID;
  reagent_ih_abd_conf UUID;
  reagent_ih_nacl UUID;
  reagent_ih_liss UUID;
  reagent_ih_diluent UUID;
  -- Immunohematology - Consumables
  reagent_ih_tips UUID;
  reagent_ih_labels UUID;
  -- Serology - Reagents (ELISA kits)
  reagent_se_vzv_igg UUID;
  reagent_se_vzv_igm UUID;
  reagent_se_measles_igg UUID;
  reagent_se_measles_igm UUID;
  reagent_se_parvo_igg UUID;
  reagent_se_parvo_igm UUID;
  reagent_se_hpylori UUID;
  reagent_se_chlam_igg UUID;
  reagent_se_chlam_iga UUID;
  -- Serology - Consumables
  reagent_se_tips_03 UUID;
  reagent_se_tips_11 UUID;
  reagent_se_tray UUID;
  -- Serology - Solutions
  reagent_se_setup UUID;
  reagent_se_adjust UUID;
  -- Serology - Controls
  reagent_se_virotrol_mumz UUID;
  reagent_se_virotrol_i UUID;
  reagent_se_viroclear UUID;
  reagent_se_virotrol_torch UUID;
  reagent_se_virotrol_syph UUID;
  -- Urinalysis - Controls
  reagent_ur_quantify UUID;
  -- Quality Assessment
  reagent_qa_eqas UUID;
BEGIN
  -- Create a seed admin user if none exists yet
  -- (the handle_new_user trigger will auto-create the matching profile)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  SELECT
    '00000000-0000-0000-0000-000000000001'::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID,
    'authenticated', 'authenticated',
    'admin@lab.local',
    crypt('12345678', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"admin","full_name":"Seed Admin"}'::jsonb,
    NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM auth.users LIMIT 1);

  -- Get first user from profiles for created_by/updated_by
  SELECT id INTO seed_user_id FROM public.profiles LIMIT 1;

  -- ============================================
  -- PRENATAL SCREENING SECTOR (Kryptor machine)
  -- Supplier: Thermo Scientific
  -- ============================================

  -- Free βhCG Kryptor (reagent)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Free βhCG Kryptor', 'BM0809.075', 'Free beta-hCG for prenatal screening', 'Thermo Scientific', 'reagent', 25, 'tests', 'Fridge A - Shelf 1', '2-8°C', 'Prenatal Screening', 'Kryptor', 150, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_bhcg;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_bhcg, '809A24-01', 75, '2026-09-30', '2025-06-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 75, 0, 75, 'Initial stock from inventory setup', seed_user_id);

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_bhcg, '809A24-02', 75, '2026-12-15', '2025-09-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 75, 0, 75, 'Initial stock from inventory setup', seed_user_id);

  -- PAPP-A Kryptor (reagent)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('PAPP-A Kryptor', 'BM0866.075', 'Pregnancy-associated plasma protein A', 'Thermo Scientific', 'reagent', 25, 'tests', 'Fridge A - Shelf 1', '2-8°C', 'Prenatal Screening', 'Kryptor', 75, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_pappa;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_pappa, '866B24-01', 75, '2026-08-20', '2025-05-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 75, 0, 75, 'Initial stock from inventory setup', seed_user_id);

  -- AFP Kryptor (reagent)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('AFP Kryptor', 'BM0816.075', 'Alpha-fetoprotein for prenatal screening', 'Thermo Scientific', 'reagent', 25, 'tests', 'Fridge A - Shelf 1', '2-8°C', 'Prenatal Screening', 'Kryptor', 20, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_afp;

  -- AFP lot expiring soon (warning)
  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_afp, '816C23-01', 20, CURRENT_DATE + INTERVAL '18 days', '2024-11-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 20, 0, 20, 'Initial stock from inventory setup', seed_user_id);

  -- Solution 1 (solution)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Solution 1', '89991', 'Kryptor system solution 1', 'Thermo Scientific', 'solution', 2, 'bottles', 'Room Temp Cabinet A', '15-25°C', 'Prenatal Screening', 'Kryptor', 4, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_sol1;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_sol1, 'SOL1-24-001', 4, '2027-03-15', '2025-04-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 4, 0, 4, 'Initial stock from inventory setup', seed_user_id);

  -- Solution 2 (solution)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Solution 2', '89992', 'Kryptor system solution 2', 'Thermo Scientific', 'solution', 2, 'bottles', 'Room Temp Cabinet A', '15-25°C', 'Prenatal Screening', 'Kryptor', 4, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_sol2;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_sol2, 'SOL2-24-001', 4, '2027-03-15', '2025-04-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 4, 0, 4, 'Initial stock from inventory setup', seed_user_id);

  -- Solution 3 (solution)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Solution 3', '89993', 'Kryptor system solution 3', 'Thermo Scientific', 'solution', 2, 'bottles', 'Room Temp Cabinet A', '15-25°C', 'Prenatal Screening', 'Kryptor', 3, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_sol3;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_sol3, 'SOL3-24-001', 3, '2027-01-20', '2025-04-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 3, 0, 3, 'Initial stock from inventory setup', seed_user_id);

  -- Solution 4 (solution, low stock)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Solution 4', '89994', 'Kryptor system solution 4', 'Thermo Scientific', 'solution', 2, 'bottles', 'Room Temp Cabinet A', '15-25°C', 'Prenatal Screening', 'Kryptor', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_sol4;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_sol4, 'SOL4-24-001', 1, '2026-11-10', '2025-04-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- Buffer Kryptor (solution)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Poudre Buffer Kryptor', '89970', 'Buffer powder for Kryptor system', 'Thermo Scientific', 'solution', 3, 'units', 'Room Temp Cabinet A', '15-25°C', 'Prenatal Screening', 'Kryptor', 5, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_buffer;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_buffer, 'BUF-24-001', 5, '2027-06-30', '2025-03-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 5, 0, 5, 'Initial stock from inventory setup', seed_user_id);

  -- GM K-QC 1 (control)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('GM K-QC 1', 'BM00088192', 'Quality control material for Kryptor', 'Thermo Scientific', 'control', 2, 'kits', 'Fridge A - Shelf 2', '2-8°C', 'Prenatal Screening', 'Kryptor', 3, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_qc1;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_qc1, 'QC1-24-088', 3, '2026-06-15', '2025-07-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 3, 0, 3, 'Initial stock from inventory setup', seed_user_id);

  -- Free βhCG Calibrator (calibrator)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Free βhCG Calibrator', '80991', 'Calibrator for Free βhCG assay', 'Thermo Scientific', 'calibrator', 1, 'kits', 'Fridge A - Shelf 2', '2-8°C', 'Prenatal Screening', 'Kryptor', 2, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_cal_bhcg;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_cal_bhcg, 'CAL-809-24', 2, '2026-05-01', '2025-06-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 2, 0, 2, 'Initial stock from inventory setup', seed_user_id);

  -- PAPP-A Calibrator (calibrator)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('PAPP-A Calibrator', '86691', 'Calibrator for PAPP-A assay', 'Thermo Scientific', 'calibrator', 1, 'kits', 'Fridge A - Shelf 2', '2-8°C', 'Prenatal Screening', 'Kryptor', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_cal_pappa;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_cal_pappa, 'CAL-866-24', 1, '2026-04-15', '2025-05-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- AFP Calibrator (calibrator, expired)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('AFP Calibrator', '81691', 'Calibrator for AFP assay', 'Thermo Scientific', 'calibrator', 1, 'kits', 'Fridge A - Shelf 2', '2-8°C', 'Prenatal Screening', 'Kryptor', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_cal_afp;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_cal_afp, 'CAL-816-23', 1, CURRENT_DATE - INTERVAL '8 days', '2024-03-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- Cleaning Tissue EWI (consumable, no expiry)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Cleaning Tissue EWI', 'EWI100', 'Lint-free cleaning tissues', 'Thermo Scientific', 'consumable', 5, 'boxes', 'Room Temp Cabinet A', '15-25°C', 'Prenatal Screening', 'Kryptor', 10, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_tissue;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_tissue, 'EWI-24-001', 10, NULL, '2025-03-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 10, 0, 10, 'Initial stock from inventory setup', seed_user_id);

  -- Silica Lens (consumable, no expiry)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Silica Lens', 'BMKOPT000', 'Replacement silica lens for Kryptor optics', 'Thermo Scientific', 'consumable', 1, 'pieces', 'Room Temp Cabinet A', '15-25°C', 'Prenatal Screening', 'Kryptor', 3, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_lens;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_lens, 'OPT-24-001', 3, NULL, '2025-05-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 3, 0, 3, 'Initial stock from inventory setup', seed_user_id);

  -- Fluidic Tube Box (consumable, no expiry)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Fluidic Tube Box', 'BMKTUB0054', 'Decontamination fluidic tube box', 'Thermo Scientific', 'consumable', 2, 'boxes', 'Room Temp Cabinet A', '15-25°C', 'Prenatal Screening', 'Kryptor', 4, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_fluidic;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_fluidic, 'TUB54-24-001', 4, NULL, '2025-04-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 4, 0, 4, 'Initial stock from inventory setup', seed_user_id);

  -- Reaction Plate (consumable)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Reaction Plate', '89996', 'Reaction plate for Kryptor', 'Thermo Scientific', 'consumable', 10, 'pieces', 'Room Temp Cabinet A', '15-25°C', 'Prenatal Screening', 'Kryptor', 50, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_reaction_plate;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_reaction_plate, 'RP-24-001', 50, NULL, '2025-06-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 50, 0, 50, 'Initial stock from inventory setup', seed_user_id);

  -- Dilution Plate (consumable)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Dilution Plate', '89995', 'Dilution plate for Kryptor', 'Thermo Scientific', 'consumable', 10, 'pieces', 'Room Temp Cabinet A', '15-25°C', 'Prenatal Screening', 'Kryptor', 45, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_dilution_plate;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_dilution_plate, 'DP-24-001', 45, NULL, '2025-06-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 45, 0, 45, 'Initial stock from inventory setup', seed_user_id);

  -- Metal Forceps (consumable, no expiry)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Metal Forceps', 'BMKSHT0043', 'Metal forceps for Kryptor', 'Thermo Scientific', 'consumable', 1, 'pieces', 'Room Temp Cabinet A', '15-25°C', 'Prenatal Screening', 'Kryptor', 2, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_forceps;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_forceps, 'SHT43-24-001', 2, NULL, '2025-02-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 2, 0, 2, 'Initial stock from inventory setup', seed_user_id);

  -- 5L Container (consumable, no expiry)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('5L Container', 'BMKTUB0046', '5L waste container for Kryptor', 'Thermo Scientific', 'consumable', 2, 'pieces', 'Room Temp Cabinet A', '15-25°C', 'Prenatal Screening', 'Kryptor', 6, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_container;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_container, 'TUB46-24-001', 6, NULL, '2025-03-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 6, 0, 6, 'Initial stock from inventory setup', seed_user_id);

  -- 5L Sticker Set (consumable, no expiry)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('5L Container Sticker Set', 'BMKLBL0003', 'Adhesive labels for 5L waste containers', 'Thermo Scientific', 'consumable', 2, 'units', 'Room Temp Cabinet A', '15-25°C', 'Prenatal Screening', 'Kryptor', 6, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ps_sticker;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ps_sticker, 'LBL03-24-001', 6, NULL, '2025-03-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 6, 0, 6, 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- IMMUNOHEMATOLOGY SECTOR
  -- Supplier: Bio-Rad
  -- ============================================

  -- Diaclon ABO/D (reagent)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Diaclon ABO/D', '001324', 'ABO and RhD blood group typing', 'Bio-Rad', 'reagent', 2, 'kits', 'Fridge B - Shelf 1', '2-8°C', 'Immunohematology', NULL, 3, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ih_abod;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ih_abod, '01324-2501', 3, '2026-07-15', '2025-08-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 3, 0, 3, 'Initial stock from inventory setup', seed_user_id);

  -- Diaclon Rh-Subgroup+K (reagent)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Diaclon Rh-Subgroup+K', '002124', 'Rh subgroup and Kell typing', 'Bio-Rad', 'reagent', 3, 'kits', 'Fridge B - Shelf 1', '2-8°C', 'Immunohematology', NULL, 6, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ih_rhk;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ih_rhk, '02124-2501', 3, '2026-05-20', '2025-06-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 3, 0, 3, 'Initial stock from inventory setup', seed_user_id);

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ih_rhk, '02124-2502', 3, '2026-09-10', '2025-10-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 3, 0, 3, 'Initial stock from inventory setup', seed_user_id);

  -- Diaclon AB/D Confirmation (reagent)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Diaclon AB/D Confirmation', '001254', 'AB/D confirmation typing', 'Bio-Rad', 'reagent', 1, 'kits', 'Fridge B - Shelf 1', '2-8°C', 'Immunohematology', NULL, 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ih_abd_conf;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ih_abd_conf, '01254-2501', 1, '2026-08-30', '2025-09-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- NaCl Enzyme Test / Simonin (reagent)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('NaCl Enzyme Test (Simonin)', '005014', 'NaCl enzyme test for antibody screening', 'Bio-Rad', 'reagent', 1, 'kits', 'Fridge B - Shelf 2', '2-8°C', 'Immunohematology', NULL, 2, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ih_nacl;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ih_nacl, '05014-2501', 2, '2026-06-10', '2025-07-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 2, 0, 2, 'Initial stock from inventory setup', seed_user_id);

  -- LISS/Coombs (reagent)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('LISS/Coombs', '004014', 'Low ionic strength solution / Coombs reagent', 'Bio-Rad', 'reagent', 2, 'kits', 'Fridge B - Shelf 2', '2-8°C', 'Immunohematology', NULL, 4, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ih_liss;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ih_liss, '04014-2501', 2, CURRENT_DATE + INTERVAL '5 days', '2025-01-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 2, 0, 2, 'Initial stock from inventory setup', seed_user_id);

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ih_liss, '04014-2502', 2, '2026-10-20', '2025-11-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 2, 0, 2, 'Initial stock from inventory setup', seed_user_id);

  -- ID-Diluent 2 (solution)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('ID-Diluent 2', '009260', 'Diluent for gel card testing', 'Bio-Rad', 'solution', 1, 'bottles', 'Fridge B - Shelf 2', '2-8°C', 'Immunohematology', NULL, 2, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ih_diluent;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ih_diluent, '09260-2501', 2, '2026-11-30', '2025-12-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 2, 0, 2, 'Initial stock from inventory setup', seed_user_id);

  -- Bio-Rad Tips (consumable, no expiry)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Bio-Rad Tips (1x1000)', '009622', 'Pipette tips for gel card system', 'Bio-Rad', 'consumable', 3, 'boxes', 'Room Temp Cabinet B', '15-25°C', 'Immunohematology', NULL, 6, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ih_tips;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ih_tips, '09622-24-001', 6, NULL, '2025-05-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 6, 0, 6, 'Initial stock from inventory setup', seed_user_id);

  -- Labels (consumable, no expiry)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Labels', 'E009006', 'Adhesive labels for sample identification', 'Bio-Rad', 'consumable', 2, 'boxes', 'Room Temp Cabinet B', '15-25°C', 'Immunohematology', NULL, 3, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ih_labels;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ih_labels, 'E009006-24-001', 3, NULL, '2025-04-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 3, 0, 3, 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- SEROLOGY / INFECTIOUS DISEASE SECTOR
  -- Supplier: EUROIMMUN / Revvity
  -- Machine: Analyzer I
  -- ============================================

  -- Anti-VZV IgG ELISA
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Anti-VZV ELISA (IgG)', 'EI 2650-9601', 'Varicella-zoster virus IgG antibody ELISA kit', 'EUROIMMUN', 'reagent', 1, 'kits', 'Fridge C - Shelf 1', '2-8°C', 'Serology', 'Analyzer I', 2, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_vzv_igg;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_vzv_igg, 'E2650-2501', 2, '2026-10-31', '2025-07-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 2, 0, 2, 'Initial stock from inventory setup', seed_user_id);

  -- Anti-VZV IgM ELISA
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Anti-VZV Glycoprotein ELISA (IgM)', 'EI 2650-9601-2', 'Varicella-zoster virus IgM antibody ELISA kit', 'EUROIMMUN', 'reagent', 1, 'kits', 'Fridge C - Shelf 1', '2-8°C', 'Serology', 'Analyzer I', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_vzv_igm;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_vzv_igm, 'E2650M-2501', 1, '2026-09-15', '2025-07-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- Anti-Measles IgG ELISA
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Anti-Measles Virus ELISA 2.0 (IgG)', 'EI 2610-9601-2', 'Measles virus IgG antibody ELISA kit', 'EUROIMMUN', 'reagent', 1, 'kits', 'Fridge C - Shelf 1', '2-8°C', 'Serology', 'Analyzer I', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_measles_igg;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_measles_igg, 'E2610G-2501', 1, '2026-08-20', '2025-06-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- Anti-Measles IgM ELISA
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Anti-Measles Virus NP ELISA (IgM)', 'EI 2610-9601-4', 'Measles virus IgM antibody ELISA kit', 'EUROIMMUN', 'reagent', 1, 'kits', 'Fridge C - Shelf 1', '2-8°C', 'Serology', 'Analyzer I', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_measles_igm;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_measles_igm, 'E2610M-2501', 1, '2026-08-20', '2025-06-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- Anti-Parvovirus B19 IgG ELISA
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Anti-Parvovirus B19 ELISA (IgG)', 'EI 2580-9601', 'Parvovirus B19 IgG antibody ELISA kit', 'EUROIMMUN', 'reagent', 1, 'kits', 'Fridge C - Shelf 2', '2-8°C', 'Serology', 'Analyzer I', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_parvo_igg;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_parvo_igg, 'E2580G-2501', 1, '2026-07-30', '2025-05-10', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- Anti-Parvovirus B19 IgM ELISA (out of stock)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Anti-Parvovirus B19 ELISA (IgM)', 'EI 2580-9601-M', 'Parvovirus B19 IgM antibody ELISA kit', 'EUROIMMUN', 'reagent', 1, 'kits', 'Fridge C - Shelf 2', '2-8°C', 'Serology', 'Analyzer I', 0, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_parvo_igm;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_parvo_igm, 'E2580M-2401', 0, CURRENT_DATE - INTERVAL '15 days', '2024-09-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 0, 0, 0, 'Initial stock from inventory setup', seed_user_id);

  -- Anti-Helicobacter pylori IgG ELISA
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Anti-Helicobacter pylori ELISA (IgG)', 'EI 2080-9601', 'H. pylori IgG antibody ELISA kit', 'EUROIMMUN', 'reagent', 1, 'kits', 'Fridge C - Shelf 2', '2-8°C', 'Serology', 'Analyzer I', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_hpylori;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_hpylori, 'E2080-2501', 1, '2026-11-15', '2025-08-20', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- Anti-Chlamydia trachomatis IgG ELISA
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Anti-Chlamydia trachomatis ELISA (IgG)', 'EI 2191-9601', 'Chlamydia trachomatis IgG ELISA kit', 'EUROIMMUN', 'reagent', 1, 'kits', 'Fridge C - Shelf 3', '2-8°C', 'Serology', 'Analyzer I', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_chlam_igg;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_chlam_igg, 'E2191G-2501', 1, '2026-12-01', '2025-09-05', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- Anti-Chlamydia trachomatis IgA ELISA
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Anti-Chlamydia trachomatis ELISA (IgA)', 'EI 2191-9601-A', 'Chlamydia trachomatis IgA ELISA kit', 'EUROIMMUN', 'reagent', 1, 'kits', 'Fridge C - Shelf 3', '2-8°C', 'Serology', 'Analyzer I', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_chlam_iga;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_chlam_iga, 'E2191A-2501', 1, '2026-12-01', '2025-09-05', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- Conductive Tips 0.3mL (consumable, no expiry)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Conductive Tips 0.3mL', 'ZG 0201-0118', 'Conductive tips 0.3mL for Analyzer I (17280 pcs)', 'EUROIMMUN', 'consumable', 1, 'boxes', 'Room Temp Cabinet C', '15-25°C', 'Serology', 'Analyzer I', 2, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_tips_03;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_tips_03, 'ZG0201-24-001', 2, NULL, '2025-04-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 2, 0, 2, 'Initial stock from inventory setup', seed_user_id);

  -- Conductive Tips 1.1mL (consumable, no expiry)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Conductive Tips 1.1mL', 'ZG 0202-0110', 'Conductive tips 1.1mL for Analyzer I (9600 pcs)', 'EUROIMMUN', 'consumable', 1, 'boxes', 'Room Temp Cabinet C', '15-25°C', 'Serology', 'Analyzer I', 2, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_tips_11;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_tips_11, 'ZG0202-24-001', 2, NULL, '2025-04-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 2, 0, 2, 'Initial stock from inventory setup', seed_user_id);

  -- Deep Well Dilution Tray (consumable, no expiry)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Deep Well Dilution Tray 96 Wells', 'ZG 9923-0150', 'Deep well dilution tray for Analyzer I (50 pcs)', 'EUROIMMUN', 'consumable', 1, 'boxes', 'Room Temp Cabinet C', '15-25°C', 'Serology', 'Analyzer I', 2, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_tray;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_tray, 'ZG9923-24-001', 2, NULL, '2025-04-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 2, 0, 2, 'Initial stock from inventory setup', seed_user_id);

  -- Setup Clean (solution)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Setup Clean', 'ZG 0009-0505', 'Cleaning solution for Analyzer I setup', 'EUROIMMUN', 'solution', 1, 'bottles', 'Room Temp Cabinet C', '15-25°C', 'Serology', 'Analyzer I', 2, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_setup;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_setup, 'ZG0009-24-001', 2, '2027-01-31', '2025-05-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 2, 0, 2, 'Initial stock from inventory setup', seed_user_id);

  -- Adjustment Solution (solution)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Adjustment Solution', 'ZE 1120-1850-7', 'Analyzer I adjustment/calibration solution', 'EUROIMMUN', 'solution', 1, 'kits', 'Fridge C - Shelf 3', '2-8°C', 'Serology', 'Analyzer I', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_adjust;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_adjust, 'ZE1120-24-001', 1, '2026-06-30', '2025-05-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- Virotrol MuMZ (control)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('Virotrol MuMZ', '00119', 'Control serum for Mumps/Measles/VZV', 'Bio-Rad', 'control', 1, 'kits', 'Freezer A - Drawer 1', '-20°C', 'Serology', 'Analyzer I', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_virotrol_mumz;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_virotrol_mumz, 'VT-MZ-2501', 1, '2026-04-30', '2025-06-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- VIROTROL I (control)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('VIROTROL I', '00100A', 'General virology control serum', 'Bio-Rad', 'control', 1, 'kits', 'Freezer A - Drawer 1', '-20°C', 'Serology', 'Analyzer I', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_virotrol_i;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_virotrol_i, 'VT-I-2501', 1, '2026-05-15', '2025-06-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- VIROCLEAR (control)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('VIROCLEAR', '00106', 'Negative control serum for virology', 'Bio-Rad', 'control', 1, 'kits', 'Freezer A - Drawer 1', '-20°C', 'Serology', 'Analyzer I', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_viroclear;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_viroclear, 'VC-2501', 1, '2026-07-31', '2025-06-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- VIROTROL ToRCH-M (control)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('VIROTROL ToRCH-M', '00117B', 'Control serum for ToRCH IgM panel', 'Bio-Rad', 'control', 1, 'kits', 'Freezer A - Drawer 1', '-20°C', 'Serology', 'Analyzer I', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_virotrol_torch;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_virotrol_torch, 'VT-TM-2501', 1, '2026-03-28', '2025-06-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- VIROTROL Syphilis LR-A (control)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('VIROTROL Syphilis LR-A', '00171X', 'Control serum for syphilis screening', 'Bio-Rad', 'control', 1, 'kits', 'Freezer A - Drawer 1', '-20°C', 'Serology', 'Analyzer I', 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_se_virotrol_syph;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_se_virotrol_syph, 'VT-SY-2501', 1, '2026-06-20', '2025-06-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- URINALYSIS SECTOR
  -- ============================================

  -- QUAntify Advance (control)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('QUAntify Advance', '12007028', 'Urine chemistry quality control', 'Bio-Rad', 'control', 1, 'kits', 'Fridge D - Shelf 1', '2-8°C', 'Urinalysis', NULL, 2, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_ur_quantify;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_ur_quantify, 'QA-2501', 2, '2026-08-15', '2025-09-01', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 2, 0, 2, 'Initial stock from inventory setup', seed_user_id);

  -- ============================================
  -- QUALITY ASSESSMENT SECTOR
  -- ============================================

  -- EQAS (control)
  INSERT INTO public.reagents (name, reference, description, supplier, category, minimum_stock, unit, storage_location, storage_temperature, sector, machine, total_quantity, created_by, updated_by)
  VALUES ('EQAS', '12000815', 'External Quality Assessment Scheme', 'Bio-Rad', 'control', 1, 'kits', 'Fridge D - Shelf 2', '2-8°C', 'Quality Assessment', NULL, 1, seed_user_id, seed_user_id)
  RETURNING id INTO reagent_qa_eqas;

  INSERT INTO public.lots (reagent_id, lot_number, quantity, expiry_date, date_of_reception, created_by, updated_by)
  VALUES (reagent_qa_eqas, 'EQAS-2501', 1, '2026-12-31', '2025-01-15', seed_user_id, seed_user_id)
  RETURNING id INTO temp_lot_id;
  INSERT INTO public.stock_movements (lot_id, movement_type, quantity, quantity_before, quantity_after, notes, performed_by)
  VALUES (temp_lot_id, 'in', 1, 0, 1, 'Initial stock from inventory setup', seed_user_id);

END $$;
