/**
 * Excel workbook builder for inventory exports.
 *
 * Part of the Edge Function's internal shared library (supabase/functions/_shared/).
 * The Next.js app never generates Excel directly — all Excel logic lives here.
 * Imported by the process-export Edge Function via relative path.
 */
// @ts-ignore — Deno npm specifier
import ExcelJS from "npm:exceljs";

const BRAND_TEAL = "FF00A896";
const ROW_ALT = "FFF0FAFA";
const WHITE = "FFFFFFFF";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function computeStockStatus(quantity: number, minimumStock: number): string {
  if (quantity <= 0) return "Out of Stock";
  if (quantity <= minimumStock) return "Low";
  return "OK";
}

function computeExpiryStatus(expiryDate: string | null | undefined): string {
  if (!expiryDate) return "No Expiry";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "Expired";
  if (days <= 7) return "Critical (<7d)";
  if (days <= 30) return "Expiring Soon (<30d)";
  return "OK";
}

// deno-lint-ignore no-explicit-any
function applyHeaderStyle(row: any) {
  row.height = 18;
  row.font = { bold: true, color: { argb: WHITE }, size: 11 };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_TEAL } };
  row.alignment = { vertical: "middle", horizontal: "left" };
  // deno-lint-ignore no-explicit-any
  row.eachCell((cell: any) => {
    cell.border = { bottom: { style: "thin", color: { argb: WHITE } } };
  });
}

// deno-lint-ignore no-explicit-any
function applyAltRowShading(worksheet: any, dataRowCount: number) {
  for (let i = 0; i < dataRowCount; i++) {
    if (i % 2 === 1) {
      const row = worksheet.getRow(i + 2);
      // deno-lint-ignore no-explicit-any
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROW_ALT } };
      });
    }
  }
}

// deno-lint-ignore no-explicit-any
export async function buildInventoryWorkbook(reagents: any[], lots: any[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Inventory Management System";
  workbook.created = new Date();

  // ── Sheet 1: Items ──────────────────────────────────────────────────────────
  const itemsSheet = workbook.addWorksheet("Items");
  itemsSheet.columns = [
    { header: "Name",                key: "name",                 width: 30 },
    { header: "Reference",           key: "reference",            width: 20 },
    { header: "Category",            key: "category",             width: 14 },
    { header: "Supplier",            key: "supplier",             width: 22 },
    { header: "Unit",                key: "unit",                 width: 10 },
    { header: "Total Quantity",      key: "total_quantity",       width: 14 },
    { header: "Minimum Stock",       key: "minimum_stock",        width: 14 },
    { header: "Stock Status",        key: "stock_status",         width: 14 },
    { header: "Storage Location",    key: "storage_location",     width: 20 },
    { header: "Storage Temperature", key: "storage_temperature",  width: 20 },
    { header: "Sector",              key: "sector",               width: 16 },
    { header: "Machine",             key: "machine",              width: 16 },
    { header: "Description",         key: "description",          width: 35 },
    { header: "Created At",          key: "created_at",           width: 14 },
  ];

  applyHeaderStyle(itemsSheet.getRow(1));
  itemsSheet.views = [{ state: "frozen", ySplit: 1 }];

  // deno-lint-ignore no-explicit-any
  reagents.forEach((r: any) => {
    itemsSheet.addRow({
      name:                r.name,
      reference:           r.reference,
      category:            r.category ? r.category.charAt(0).toUpperCase() + r.category.slice(1) : "",
      supplier:            r.supplier,
      unit:                r.unit,
      total_quantity:      r.total_quantity,
      minimum_stock:       r.minimum_stock,
      stock_status:        computeStockStatus(r.total_quantity, r.minimum_stock),
      storage_location:    r.storage_location,
      storage_temperature: r.storage_temperature,
      sector:              r.sector,
      machine:             r.machine || "",
      description:         r.description || "",
      created_at:          formatDate(r.created_at),
    });
  });

  applyAltRowShading(itemsSheet, reagents.length);

  // ── Sheet 2: Lots ───────────────────────────────────────────────────────────
  const lotsSheet = workbook.addWorksheet("Lots");
  lotsSheet.columns = [
    { header: "Item Name",           key: "item_name",            width: 30 },
    { header: "Reference",           key: "reference",            width: 20 },
    { header: "Category",            key: "category",             width: 14 },
    { header: "Lot Number",          key: "lot_number",           width: 20 },
    { header: "Quantity",            key: "quantity",             width: 10 },
    { header: "Unit",                key: "unit",                 width: 10 },
    { header: "Expiry Date",         key: "expiry_date",          width: 14 },
    { header: "Expiry Status",       key: "expiry_status",        width: 18 },
    { header: "Date of Reception",   key: "date_of_reception",    width: 18 },
    { header: "Shelf Life (days)",   key: "shelf_life_days",      width: 16 },
    { header: "Received (days ago)", key: "days_since_reception", width: 18 },
  ];

  applyHeaderStyle(lotsSheet.getRow(1));
  lotsSheet.views = [{ state: "frozen", ySplit: 1 }];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // deno-lint-ignore no-explicit-any
  lots.forEach((l: any) => {
    const reception = l.date_of_reception ? new Date(l.date_of_reception) : null;
    const daysSince = reception ? Math.floor((today.getTime() - reception.getTime()) / 86400000) : "";

    lotsSheet.addRow({
      item_name:            l.reagents?.name || "",
      reference:            l.reagents?.reference || "",
      category:             l.reagents?.category
                              ? l.reagents.category.charAt(0).toUpperCase() + l.reagents.category.slice(1)
                              : "",
      lot_number:           l.lot_number,
      quantity:             l.quantity,
      unit:                 l.reagents?.unit || "",
      expiry_date:          formatDate(l.expiry_date),
      expiry_status:        computeExpiryStatus(l.expiry_date),
      date_of_reception:    formatDate(l.date_of_reception),
      shelf_life_days:      l.shelf_life_days ?? "",
      days_since_reception: daysSince,
    });
  });

  applyAltRowShading(lotsSheet, lots.length);

  return workbook.xlsx.writeBuffer();
}
