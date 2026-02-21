"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, ChevronDown, MoreHorizontal, Eye, Edit2, Trash2, History } from "lucide-react";
import toast from "react-hot-toast";
import { deleteReagent } from "@/actions/inventory";
import { StockBadge } from "./StatusBadges";

function ActionsMenu({ reagent, onViewDetails, onEdit, onViewHistory, onDelete, isDeleting }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);

  const handleOpen = (e) => {
    e.stopPropagation();
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY,
      right: window.innerWidth - rect.right,
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <>
      <button ref={buttonRef} onClick={handleOpen} className="btn btn-ghost btn-xs">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && createPortal(
        <ul
          style={{ position: "absolute", top: pos.top, right: pos.right }}
          className="z-[9999] menu menu-sm p-2 shadow-lg bg-base-100 rounded-box w-44"
          onClick={(e) => e.stopPropagation()}
        >
          <li>
            <button onClick={() => { onViewDetails(reagent); setOpen(false); }}>
              <Eye className="w-4 h-4" />
              View Details
            </button>
          </li>
          <li>
            <button onClick={() => { onEdit(reagent); setOpen(false); }}>
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </li>
          <li>
            <button onClick={() => { onViewHistory(reagent); setOpen(false); }}>
              <History className="w-4 h-4" />
              View History
            </button>
          </li>
          <li>
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              className="text-error"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </li>
        </ul>,
        document.body
      )}
    </>
  );
}

export default function ReagentRow({
  reagent,
  rowNumber,
  isExpanded,
  onToggleExpand,
  onEdit,
  onViewDetails,
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
    <tr className={`hover cursor-pointer whitespace-nowrap ${isExpanded ? 'bg-base-200/30' : ''}`}>
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
        <div className="font-medium truncate max-w-[180px]">{reagent.name}</div>
        <div className="text-xs opacity-50 md:hidden truncate max-w-[140px]">{reagent.reference}</div>
        {reagent.description && (
          <div className="text-xs opacity-60 truncate max-w-[200px] hidden sm:block">{reagent.description}</div>
        )}
      </td>

      {/* Reference - hidden on mobile */}
      <td className="hidden md:table-cell" onClick={onToggleExpand}>
        <span className="font-mono text-xs block truncate max-w-[150px]">{reagent.reference}</span>
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
        <span className="text-sm block truncate max-w-[90px]">{reagent.storage_location}</span>
      </td>

      {/* Machine - hidden on smaller screens */}
      <td className="hidden xl:table-cell" onClick={onToggleExpand}>
        {reagent.machine && (
          <span className="text-sm block truncate max-w-[100px]">{reagent.machine}</span>
        )}
      </td>

      {/* Actions */}
      <td className="text-right">
        <div className="flex justify-end items-center gap-1">
          <ActionsMenu
            reagent={reagent}
            onViewDetails={onViewDetails}
            onEdit={onEdit}
            onViewHistory={onViewHistory}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        </div>
      </td>
    </tr>
  );
}
