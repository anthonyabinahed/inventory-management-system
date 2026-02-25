/**
 * Tests for _shared/excel.ts — buildInventoryWorkbook()
 *
 * Runs with: deno task test (from supabase/functions/)
 * Strategy: write the buffer then parse it back with ExcelJS to assert cell values.
 */

import { assertEquals, assert } from "jsr:@std/assert";
import { buildInventoryWorkbook } from "./excel.ts";
// @ts-ignore — Deno npm specifier
import ExcelJS from "npm:exceljs";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function parseWorkbook(buffer: Uint8Array) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}

/** Returns a YYYY-MM-DD date string that is `n` days from today. */
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const sampleReagent = {
  name: "CBC Diluent",
  reference: "BM-001",
  category: "reagent",
  supplier: "Beckman",
  unit: "vials",
  total_quantity: 20,
  minimum_stock: 5,
  storage_location: "Fridge A",
  storage_temperature: "2-8°C",
  sector: "Hematology",
  machine: null,
  description: null,
  // noon UTC — safe from timezone off-by-one across all timezones
  created_at: "2025-06-15T12:00:00Z",
};

function sampleLot(overrides: Record<string, unknown> = {}) {
  return {
    lot_number: "LOT-001",
    quantity: 10,
    expiry_date: null as string | null,
    date_of_reception: null as string | null,
    shelf_life_days: null as number | null,
    reagents: {
      name: "CBC Diluent",
      reference: "BM-001",
      category: "reagent",
      unit: "vials",
    },
    ...overrides,
  };
}

// ─── Return type ─────────────────────────────────────────────────────────────

Deno.test("returns a Uint8Array", async () => {
  const buf = await buildInventoryWorkbook([], []);
  assert(buf instanceof Uint8Array);
});

// ─── Sheet names ─────────────────────────────────────────────────────────────

Deno.test("generates two sheets named Items and Lots", async () => {
  const buf = await buildInventoryWorkbook([], []);
  const wb = await parseWorkbook(buf);
  assert(wb.getWorksheet("Items") !== undefined, "Items sheet missing");
  assert(wb.getWorksheet("Lots") !== undefined, "Lots sheet missing");
});

// ─── Column headers ───────────────────────────────────────────────────────────

Deno.test("Items sheet has correct 14 column headers in order", async () => {
  const buf = await buildInventoryWorkbook([], []);
  const wb = await parseWorkbook(buf);
  const sheet = wb.getWorksheet("Items");
  const headerRow = sheet.getRow(1);
  const expected = [
    "Name", "Reference", "Category", "Supplier", "Unit",
    "Total Quantity", "Minimum Stock", "Stock Status",
    "Storage Location", "Storage Temperature",
    "Sector", "Machine", "Description", "Created At",
  ];
  expected.forEach((header, i) => {
    assertEquals(headerRow.getCell(i + 1).value, header, `Items col ${i + 1}`);
  });
});

Deno.test("Lots sheet has correct 11 column headers in order", async () => {
  const buf = await buildInventoryWorkbook([], []);
  const wb = await parseWorkbook(buf);
  const sheet = wb.getWorksheet("Lots");
  const headerRow = sheet.getRow(1);
  const expected = [
    "Item Name", "Reference", "Category", "Lot Number", "Quantity", "Unit",
    "Expiry Date", "Expiry Status", "Date of Reception",
    "Shelf Life (days)", "Received (days ago)",
  ];
  expected.forEach((header, i) => {
    assertEquals(headerRow.getCell(i + 1).value, header, `Lots col ${i + 1}`);
  });
});

// ─── Row counts ───────────────────────────────────────────────────────────────

Deno.test("Items sheet has one data row per reagent", async () => {
  const buf = await buildInventoryWorkbook([sampleReagent, sampleReagent], []);
  const wb = await parseWorkbook(buf);
  const sheet = wb.getWorksheet("Items");
  // rowCount includes the header row
  assertEquals(sheet.rowCount, 3);
});

Deno.test("Lots sheet has one data row per lot", async () => {
  const buf = await buildInventoryWorkbook([], [sampleLot(), sampleLot(), sampleLot()]);
  const wb = await parseWorkbook(buf);
  const sheet = wb.getWorksheet("Lots");
  assertEquals(sheet.rowCount, 4);
});

Deno.test("handles empty reagents and lots arrays", async () => {
  const buf = await buildInventoryWorkbook([], []);
  const wb = await parseWorkbook(buf);
  const itemsSheet = wb.getWorksheet("Items");
  const lotsSheet = wb.getWorksheet("Lots");
  // Only the header row
  assertEquals(itemsSheet.rowCount, 1);
  assertEquals(lotsSheet.rowCount, 1);
});

// ─── computeStockStatus (Items col 8) ────────────────────────────────────────

Deno.test("Stock Status is 'Out of Stock' when total_quantity is 0", async () => {
  const buf = await buildInventoryWorkbook([{ ...sampleReagent, total_quantity: 0 }], []);
  const wb = await parseWorkbook(buf);
  assertEquals(wb.getWorksheet("Items").getRow(2).getCell(8).value, "Out of Stock");
});

Deno.test("Stock Status is 'Out of Stock' when total_quantity is negative", async () => {
  const buf = await buildInventoryWorkbook([{ ...sampleReagent, total_quantity: -1 }], []);
  const wb = await parseWorkbook(buf);
  assertEquals(wb.getWorksheet("Items").getRow(2).getCell(8).value, "Out of Stock");
});

Deno.test("Stock Status is 'Low' when total_quantity equals minimum_stock", async () => {
  const buf = await buildInventoryWorkbook(
    [{ ...sampleReagent, total_quantity: 5, minimum_stock: 5 }], []
  );
  const wb = await parseWorkbook(buf);
  assertEquals(wb.getWorksheet("Items").getRow(2).getCell(8).value, "Low");
});

Deno.test("Stock Status is 'Low' when total_quantity is below minimum_stock", async () => {
  const buf = await buildInventoryWorkbook(
    [{ ...sampleReagent, total_quantity: 3, minimum_stock: 5 }], []
  );
  const wb = await parseWorkbook(buf);
  assertEquals(wb.getWorksheet("Items").getRow(2).getCell(8).value, "Low");
});

Deno.test("Stock Status is 'OK' when total_quantity is above minimum_stock", async () => {
  const buf = await buildInventoryWorkbook(
    [{ ...sampleReagent, total_quantity: 10, minimum_stock: 5 }], []
  );
  const wb = await parseWorkbook(buf);
  assertEquals(wb.getWorksheet("Items").getRow(2).getCell(8).value, "OK");
});

// ─── computeExpiryStatus (Lots col 8) ────────────────────────────────────────

Deno.test("Expiry Status is 'No Expiry' when expiry_date is null", async () => {
  const buf = await buildInventoryWorkbook([], [sampleLot({ expiry_date: null })]);
  const wb = await parseWorkbook(buf);
  assertEquals(wb.getWorksheet("Lots").getRow(2).getCell(8).value, "No Expiry");
});

Deno.test("Expiry Status is 'Expired' when date is 2 days in the past", async () => {
  const buf = await buildInventoryWorkbook([], [sampleLot({ expiry_date: daysFromNow(-2) })]);
  const wb = await parseWorkbook(buf);
  assertEquals(wb.getWorksheet("Lots").getRow(2).getCell(8).value, "Expired");
});

Deno.test("Expiry Status is 'Critical (<7d)' when date is 4 days away", async () => {
  const buf = await buildInventoryWorkbook([], [sampleLot({ expiry_date: daysFromNow(4) })]);
  const wb = await parseWorkbook(buf);
  assertEquals(wb.getWorksheet("Lots").getRow(2).getCell(8).value, "Critical (<7d)");
});

Deno.test("Expiry Status is 'Expiring Soon (<30d)' when date is 15 days away", async () => {
  const buf = await buildInventoryWorkbook([], [sampleLot({ expiry_date: daysFromNow(15) })]);
  const wb = await parseWorkbook(buf);
  assertEquals(wb.getWorksheet("Lots").getRow(2).getCell(8).value, "Expiring Soon (<30d)");
});

Deno.test("Expiry Status is 'OK' when date is 60 days away", async () => {
  const buf = await buildInventoryWorkbook([], [sampleLot({ expiry_date: daysFromNow(60) })]);
  const wb = await parseWorkbook(buf);
  assertEquals(wb.getWorksheet("Lots").getRow(2).getCell(8).value, "OK");
});

// ─── formatDate ───────────────────────────────────────────────────────────────

Deno.test("Created At is empty string when created_at is null", async () => {
  const buf = await buildInventoryWorkbook([{ ...sampleReagent, created_at: null }], []);
  const wb = await parseWorkbook(buf);
  const cell = wb.getWorksheet("Items").getRow(2).getCell(14);
  // ExcelJS may represent an empty string as null after round-trip
  assert(cell.value === "" || cell.value == null, `expected empty, got: ${cell.value}`);
});

Deno.test("Created At formats as '15 Jun 2025' for 2025-06-15T12:00:00Z", async () => {
  const buf = await buildInventoryWorkbook([sampleReagent], []);
  const wb = await parseWorkbook(buf);
  const cell = wb.getWorksheet("Items").getRow(2).getCell(14);
  assertEquals(cell.value, "15 Jun 2025");
});

Deno.test("Expiry Date formats as a date string when expiry_date is set", async () => {
  const buf = await buildInventoryWorkbook([], [sampleLot({ expiry_date: "2026-12-31T12:00:00Z" })]);
  const wb = await parseWorkbook(buf);
  const cell = wb.getWorksheet("Lots").getRow(2).getCell(7);
  assertEquals(cell.value, "31 Dec 2026");
});

// ─── Category capitalization ──────────────────────────────────────────────────

Deno.test("Items Category is capitalized (reagent → Reagent)", async () => {
  const buf = await buildInventoryWorkbook([{ ...sampleReagent, category: "reagent" }], []);
  const wb = await parseWorkbook(buf);
  assertEquals(wb.getWorksheet("Items").getRow(2).getCell(3).value, "Reagent");
});

Deno.test("Lots Category is capitalized via reagents.category", async () => {
  const buf = await buildInventoryWorkbook([], [sampleLot()]);
  const wb = await parseWorkbook(buf);
  assertEquals(wb.getWorksheet("Lots").getRow(2).getCell(3).value, "Reagent");
});

// ─── Lots-specific columns ────────────────────────────────────────────────────

Deno.test("Lot uses reagents.name for Item Name column", async () => {
  const buf = await buildInventoryWorkbook([], [sampleLot()]);
  const wb = await parseWorkbook(buf);
  assertEquals(wb.getWorksheet("Lots").getRow(2).getCell(1).value, "CBC Diluent");
});

Deno.test("Days Since Reception is empty when date_of_reception is null", async () => {
  const buf = await buildInventoryWorkbook([], [sampleLot({ date_of_reception: null })]);
  const wb = await parseWorkbook(buf);
  const cell = wb.getWorksheet("Lots").getRow(2).getCell(11);
  assert(cell.value === "" || cell.value == null, `expected empty, got: ${cell.value}`);
});

Deno.test("Days Since Reception is a non-negative number when date_of_reception is set", async () => {
  const buf = await buildInventoryWorkbook(
    [],
    [sampleLot({ date_of_reception: daysFromNow(-30) })]
  );
  const wb = await parseWorkbook(buf);
  const cell = wb.getWorksheet("Lots").getRow(2).getCell(11);
  assert(typeof cell.value === "number" && cell.value >= 0, `expected number >= 0, got: ${cell.value}`);
});
