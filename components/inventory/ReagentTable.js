"use client";

import { Fragment } from "react";
import { Package } from "lucide-react";
import ReagentRow from "./ReagentRow";
import LotsPanel from "./LotsPanel";

export default function ReagentTable({
  reagents,
  isFiltering,
  onEdit,
  onViewHistory,
  onRefresh,
  onReagentUpdated,
  expandedReagentId,
  onToggleExpand
}) {
  if (reagents.length === 0) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <Package className="w-12 h-12 text-base-content/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No reagents found</h3>
          <p className="text-sm text-base-content/60 text-center">
            Add your first reagent or adjust your filters to see results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl overflow-hidden relative">
      {isFiltering && (
        <div className="absolute inset-0 bg-base-100/60 z-10 flex items-center justify-center">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="table table-sm sm:table-md">
          <thead>
            <tr>
              <th className="w-10 text-center">#</th>
              <th className="w-8"></th>
              <th>Name</th>
              <th className="hidden md:table-cell">Code</th>
              <th className="hidden xl:table-cell">Supplier</th>
              <th>Total Qty</th>
              <th className="hidden lg:table-cell">Location</th>
              <th className="hidden md:table-cell">Sector</th>
              <th className="hidden xl:table-cell">Machine</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reagents.map((reagent, index) => (
              <Fragment key={reagent.id}>
                <ReagentRow
                  reagent={reagent}
                  rowNumber={index + 1}
                  isExpanded={expandedReagentId === reagent.id}
                  onToggleExpand={() => onToggleExpand(reagent.id)}
                  onEdit={onEdit}
                  onViewHistory={onViewHistory}
                  onRefresh={onRefresh}
                />
                {expandedReagentId === reagent.id && (
                  <tr>
                    <td colSpan={10} className="p-0">
                      <LotsPanel
                        reagent={reagent}
                        onReagentUpdated={onReagentUpdated}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
