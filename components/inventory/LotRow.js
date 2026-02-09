"use client";

import { useState } from "react";
import { Plus, Minus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { deleteLot } from "@/actions/inventory";
import { ExpiryBadge } from "./StatusBadges";

export default function LotRow({
  lot,
  unit,
  onStockIn,
  onStockOut,
  onRefresh
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete lot "${lot.lot_number}"? This action cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      const result = await deleteLot(lot.id);
      if (result.success) {
        toast.success("Lot deleted");
        onRefresh();
      } else {
        toast.error(result.errorMessage);
      }
    } catch (error) {
      toast.error("Failed to delete lot");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <tr className="hover">
        {/* Lot Number */}
        <td>
          <span className="font-mono text-sm">{lot.lot_number}</span>
        </td>

        {/* Quantity */}
        <td>
          <span className={`font-medium ${lot.quantity === 0 ? 'text-error' : ''}`}>
            {lot.quantity} {unit}
          </span>
        </td>

        {/* Expiry Date */}
        <td>
          {lot.expiry_date ? (
            <ExpiryBadge expiryDate={lot.expiry_date} />
          ) : (
            <span className="text-sm text-base-content/40">N/A</span>
          )}
        </td>

        {/* Date Received - hidden on mobile */}
        <td className="hidden sm:table-cell">
          <span className="text-sm text-base-content/70">{formatDate(lot.date_of_reception)}</span>
        </td>

        {/* Shelf Life - hidden on mobile */}
        <td className="hidden md:table-cell">
          <span className="text-sm text-base-content/70">
            {lot.shelf_life_days > 0 ? `${lot.shelf_life_days} days` : '-'}
          </span>
        </td>

        {/* Actions */}
        <td className="text-right">
          <div className="flex justify-end items-center gap-1">
            {/* Stock buttons - bolder style */}
            <button
              className="btn btn-sm btn-success btn-outline"
              onClick={onStockIn}
              title="Add Stock"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              className="btn btn-sm btn-error btn-outline"
              onClick={onStockOut}
              title="Remove Stock"
              disabled={lot.quantity <= 0}
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Delete button */}
            <button
              className="btn btn-sm btn-ghost text-error"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete Lot"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    </>
  );
}
