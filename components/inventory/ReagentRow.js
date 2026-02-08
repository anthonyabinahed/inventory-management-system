"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, MoreHorizontal, Edit2, Trash2, History } from "lucide-react";
import toast from "react-hot-toast";
import { deleteReagent } from "@/actions/inventory";
import { StockBadge } from "./StatusBadges";

export default function ReagentRow({
  reagent,
  rowNumber,
  isExpanded,
  onToggleExpand,
  onEdit,
  onViewHistory,
  onRefresh
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${reagent.name}"? This will also delete all lots. This action cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      const result = await deleteReagent(reagent.id);
      if (result.success) {
        toast.success("Reagent deleted");
        onRefresh();
      } else {
        toast.error(result.errorMessage);
      }
    } catch (error) {
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <tr className={`hover cursor-pointer ${isExpanded ? 'bg-base-200/30' : ''}`}>
      {/* Row number */}
      <td className="w-10 text-center text-base-content/50 text-sm" onClick={onToggleExpand}>
        {rowNumber}
      </td>

      {/* Expand/Collapse chevron */}
      <td className="w-8" onClick={onToggleExpand}>
        <button className="btn btn-ghost btn-xs btn-square">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </td>

      {/* Name + mobile info */}
      <td onClick={onToggleExpand}>
        <div className="font-medium max-w-[150px] sm:max-w-none truncate">{reagent.name}</div>
        <div className="text-xs opacity-50 md:hidden">{reagent.internal_barcode}</div>
        {reagent.description && (
          <div className="text-xs opacity-60 truncate max-w-[200px] hidden sm:block">{reagent.description}</div>
        )}
      </td>

      {/* Barcode/Code - hidden on mobile */}
      <td className="hidden md:table-cell" onClick={onToggleExpand}>
        <span className="font-mono text-xs">{reagent.internal_barcode}</span>
      </td>

      {/* Supplier - hidden on smaller screens */}
      <td className="hidden xl:table-cell" onClick={onToggleExpand}>
        <span className="text-sm max-w-[120px] truncate block">{reagent.supplier}</span>
      </td>

      {/* Total Quantity */}
      <td onClick={onToggleExpand}>
        <StockBadge quantity={reagent.total_quantity} minimumStock={reagent.minimum_stock} />
      </td>

      {/* Location - hidden on mobile */}
      <td className="hidden lg:table-cell" onClick={onToggleExpand}>
        <span className="text-sm">{reagent.storage_location}</span>
      </td>

      {/* Sector - hidden on mobile */}
      <td className="hidden md:table-cell" onClick={onToggleExpand}>
        <span className="badge badge-ghost badge-sm capitalize">
          {reagent.sector}
        </span>
      </td>

      {/* Machine - hidden on smaller screens */}
      <td className="hidden xl:table-cell" onClick={onToggleExpand}>
        {reagent.machine && (
          <span className="text-sm">{reagent.machine}</span>
        )}
      </td>

      {/* Actions */}
      <td className="text-right">
        <div className="flex justify-end items-center gap-1">
          {/* Actions dropdown */}
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-xs">
              <MoreHorizontal className="w-4 h-4" />
            </label>
            <ul tabIndex={0} className="dropdown-content z-[1] menu menu-sm p-2 shadow bg-base-100 rounded-box w-44">
              <li>
                <button onClick={() => onEdit(reagent)}>
                  <Edit2 className="w-4 h-4" />
                  Edit Reagent
                </button>
              </li>
              <li>
                <button onClick={() => onViewHistory(reagent)}>
                  <History className="w-4 h-4" />
                  View History
                </button>
              </li>
              <li>
                <button
                  onClick={handleDelete}
                  className="text-error"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </td>
    </tr>
  );
}
