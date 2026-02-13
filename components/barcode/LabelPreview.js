"use client";

import { QRCodeSVG } from "qrcode.react";
import { encodeQRPayload } from "@/libs/barcode";
import { X } from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function LabelPreview({ label, onRemove }) {
  const { reagent, lot_number, expiry_date } = label;

  const qrValue = encodeQRPayload({
    reagent_id: reagent.id,
    lot_number,
    expiry_date,
  });

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body p-3 flex-row gap-3 items-start">
        {/* QR Code */}
        <div className="shrink-0 bg-white p-1 rounded">
          <QRCodeSVG value={qrValue} size={80} level="M" />
        </div>

        {/* Text Info */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="font-semibold text-sm truncate">{reagent.name}</p>
          <p className="text-xs text-base-content/70">Ref: {reagent.reference}</p>
          <p className="text-xs font-mono">
            Lot: {lot_number}
            {label.quantity > 1 && (
              <span className="badge badge-xs badge-primary ml-1">&times;{label.quantity}</span>
            )}
          </p>
          {expiry_date ? (
            <p className="text-xs text-base-content/70">Exp: {formatDate(expiry_date)}</p>
          ) : (
            <p className="text-xs text-base-content/50 italic">No expiry</p>
          )}
          <span className="badge badge-sm badge-ghost capitalize">{reagent.category}</span>
        </div>

        {/* Remove button */}
        {onRemove && (
          <button
            className="btn btn-ghost btn-xs btn-square shrink-0"
            onClick={onRemove}
            title="Remove from batch"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
