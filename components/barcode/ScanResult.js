"use client";

import { Package, MapPin, Thermometer, Plus, Minus, ScanLine } from "lucide-react";
import { ExpiryBadge } from "@/components/inventory/StatusBadges";

export default function ScanResult({ reagent, lot, lotNumber, expiryDate, onStockIn, onStockOut, onScanAnother }) {
  const isNewLot = !lot;
  const canStockOut = lot && lot.quantity > 0;
  const displayLotNumber = lot ? lot.lot_number : lotNumber;

  return (
    <div className="space-y-4">
      {/* Reagent info card */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body p-4 space-y-3">
          {/* Name & category */}
          <div>
            <h3 className="font-semibold text-lg">{reagent.name}</h3>
            <p className="text-sm text-base-content/60">
              Ref: {reagent.reference} &bull; <span className="capitalize">{reagent.category}</span>
            </p>
          </div>

          {/* Lot info */}
          <div className="bg-base-200 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-mono font-medium">
                Lot: {displayLotNumber}
              </span>
              {isNewLot ? (
                <span className="badge badge-sm badge-info">New lot</span>
              ) : (
                <ExpiryBadge expiryDate={lot.expiry_date} />
              )}
            </div>

            {!isNewLot && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-base-content/70">Current stock:</span>
                <span className={`font-semibold ${lot.quantity === 0 ? "text-error" : ""}`}>
                  {lot.quantity} {reagent.unit}
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60">
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {reagent.supplier}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {reagent.storage_location}
            </span>
            <span className="flex items-center gap-1">
              <Thermometer className="w-3 h-3" />
              {reagent.storage_temperature}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn btn-success gap-1" onClick={onStockIn}>
          <Plus className="w-4 h-4" />
          Stock In
        </button>
        <button
          className="btn btn-warning gap-1"
          onClick={onStockOut}
          disabled={!canStockOut}
        >
          <Minus className="w-4 h-4" />
          Stock Out
        </button>
      </div>

      {/* Scan another */}
      <button className="btn btn-ghost btn-sm w-full gap-1" onClick={onScanAnother}>
        <ScanLine className="w-4 h-4" />
        Scan Another
      </button>
    </div>
  );
}
