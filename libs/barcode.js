import QRCode from "qrcode";
import { jsPDF } from "jspdf";

// ============ QR ENCODE/DECODE ============

const QR_PREFIX = "IMS:v1:";

/**
 * Encode lot metadata into a QR code payload string.
 * Format: "IMS:v1:{json}" where json = { r: reagent_id, l: lot_number, e: expiry_date|null }
 */
export function encodeQRPayload({ reagent_id, lot_number, expiry_date }) {
  const payload = {
    r: reagent_id,
    l: lot_number,
    e: expiry_date || null,
  };
  return QR_PREFIX + JSON.stringify(payload);
}

/**
 * Decode a raw QR code string back into lot metadata.
 * Returns { valid, data?, error? }
 */
export function decodeQRPayload(raw) {
  if (!raw || !raw.startsWith(QR_PREFIX)) {
    return { valid: false, error: "Not a valid inventory QR code" };
  }

  try {
    const json = raw.slice(QR_PREFIX.length);
    const payload = JSON.parse(json);

    if (!payload.r || !payload.l) {
      return { valid: false, error: "Incomplete QR code data" };
    }

    return {
      valid: true,
      data: {
        reagent_id: payload.r,
        lot_number: payload.l,
        expiry_date: payload.e || null,
      },
    };
  } catch {
    return { valid: false, error: "Corrupted QR code data" };
  }
}

// ============ PDF GENERATION (HERMA 4346) ============

// HERMA 4346 label sheet specifications (mm)
const HERMA_4346 = {
  // A4 sheet
  pageWidth: 210,
  pageHeight: 297,
  // Label dimensions
  labelWidth: 45.7,
  labelHeight: 21.2,
  // Grid layout
  columns: 4,
  rows: 12,
  labelsPerPage: 48,
  // Margins (calculated to center the grid)
  topMargin: 21.5,
  leftMargin: 13.6,
  // No gaps between labels
  hGap: 0,
  vGap: 0,
};

// QR code size in mm (fits within label height with padding)
const QR_SIZE = 17;
const QR_PADDING = 2;
const TEXT_LEFT = QR_SIZE + QR_PADDING + 2; // mm from label left edge

function formatDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Generate a PDF with labels laid out on HERMA 4346 sticker sheets.
 * Each label has a QR code (left) + text info (right).
 * Labels with quantity > 1 are expanded into that many copies in the PDF.
 *
 * @param {Array} labels - Array of { reagent: { name, reference, category }, lot_number, expiry_date, quantity? }
 * @returns {Promise<void>} - Triggers PDF download
 */
export async function generateLabelsPDF(labels) {
  if (!labels || labels.length === 0) return;

  // Expand labels by quantity (e.g., qty 5 → 5 identical labels in the PDF)
  labels = labels.flatMap((l) => Array(l.quantity || 1).fill(l));

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Pre-generate all QR code data URLs
  const qrDataUrls = await Promise.all(
    labels.map((label) => {
      const payload = encodeQRPayload({
        reagent_id: label.reagent.id,
        lot_number: label.lot_number,
        expiry_date: label.expiry_date,
      });
      return QRCode.toDataURL(payload, {
        width: 256,
        margin: 1,
        errorCorrectionLevel: "M",
      });
    })
  );

  const { columns, rows, labelsPerPage, topMargin, leftMargin, labelWidth, labelHeight, hGap, vGap } = HERMA_4346;

  labels.forEach((label, index) => {
    // Add new page if needed (not for the first label)
    if (index > 0 && index % labelsPerPage === 0) {
      doc.addPage();
    }

    const posOnPage = index % labelsPerPage;
    const col = posOnPage % columns;
    const row = Math.floor(posOnPage / columns);

    const x = leftMargin + col * (labelWidth + hGap);
    const y = topMargin + row * (labelHeight + vGap);

    // Draw QR code
    const qrX = x + QR_PADDING;
    const qrY = y + (labelHeight - QR_SIZE) / 2;
    doc.addImage(qrDataUrls[index], "PNG", qrX, qrY, QR_SIZE, QR_SIZE);

    // Draw text info
    const textX = x + TEXT_LEFT;
    const textY = y + 4.5;
    const maxTextWidth = labelWidth - TEXT_LEFT - 1;

    // Reagent name (bold, larger)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    const name = truncateText(doc, label.reagent.name, maxTextWidth);
    doc.text(name, textX, textY);

    // Reference
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.text(`Ref: ${label.reagent.reference}`, textX, textY + 3.5);

    // Lot number
    doc.text(`Lot: ${label.lot_number}`, textX, textY + 7);

    // Expiry date
    const expiry = formatDate(label.expiry_date);
    if (expiry) {
      doc.text(`Exp: ${expiry}`, textX, textY + 10.5);
    } else {
      doc.text("No expiry", textX, textY + 10.5);
    }
  });

  doc.save("inventory-labels.pdf");
}

/**
 * Truncate text to fit within a max width in mm.
 */
function truncateText(doc, text, maxWidth) {
  if (doc.getTextWidth(text) <= maxWidth) return text;

  let truncated = text;
  while (truncated.length > 0 && doc.getTextWidth(truncated + "...") > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
}
