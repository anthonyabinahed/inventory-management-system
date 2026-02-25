"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Package, EyeOff, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { getLotsForReagent } from "@/actions/inventory";
import LotRow from "./LotRow";
import LotStockInModal from "./LotStockInModal";
import LotStockOutModal from "./LotStockOutModal";

const LOTS_PER_PAGE = 7;

export default function LotsPanel({ reagent, onReagentUpdated }) {
  const [lots, setLots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: LOTS_PER_PAGE, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [hideExpired, setHideExpired] = useState(false);
  const [stockInLot, setStockInLot] = useState(null);
  const [stockOutLot, setStockOutLot] = useState(null);

  const loadLots = useCallback(async (currentPage) => {
    setIsLoading(true);
    try {
      const result = await getLotsForReagent(reagent.id, {
        hideOutOfStock,
        hideExpired,
        page: currentPage,
        limit: LOTS_PER_PAGE,
      });
      if (result.success) {
        setLots(result.data);
        setPagination(result.pagination);
      } else {
        toast.error(result.errorMessage);
      }
    } catch {
      toast.error("Failed to load lots");
    } finally {
      setIsLoading(false);
    }
  }, [reagent.id, hideOutOfStock, hideExpired]);

  // Reload when reagent changes
  useEffect(() => {
    setPage(1);
  }, [reagent.id]);

  // Reload when page, filters, or reagent changes
  useEffect(() => {
    loadLots(page);
  }, [loadLots, page]);

  const handleToggleHideOutOfStock = () => {
    setHideOutOfStock(prev => !prev);
    setPage(1);
  };

  const handleToggleHideExpired = () => {
    setHideExpired(prev => !prev);
    setPage(1);
  };

  const handleStockInSaved = () => {
    setStockInLot(null);
    loadLots(page);
    onReagentUpdated(reagent.id);
  };

  const handleStockOutSaved = () => {
    setStockOutLot(null);
    loadLots(page);
    onReagentUpdated(reagent.id);
  };

  const handleRefreshLot = () => {
    loadLots(page);
    onReagentUpdated(reagent.id);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center bg-base-300">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  const showPagination = pagination.totalPages > 1;

  return (
    <div className="p-4 bg-base-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-base-content/70">
          {pagination.total} lot{pagination.total !== 1 ? "s" : ""} • Total:{" "}
          <span className="font-medium text-base-content">
            {reagent.total_quantity} {reagent.unit}
          </span>
        </p>

        <div className="flex items-center gap-1">
          {/* Filter toggles */}
          <button
            className={`btn btn-xs ${hideOutOfStock ? "btn-warning" : "btn-ghost"}`}
            onClick={handleToggleHideOutOfStock}
            title={hideOutOfStock ? "Showing in-stock lots only" : "Show in-stock lots only"}
          >
            <EyeOff className="w-3 h-3" />
            <span className="hidden sm:inline">Out of stock</span>
          </button>
          <button
            className={`btn btn-xs ${hideExpired ? "btn-warning" : "btn-ghost"}`}
            onClick={handleToggleHideExpired}
            title={hideExpired ? "Showing non-expired lots only" : "Show non-expired lots only"}
          >
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">Expired</span>
          </button>

          <div className="w-px h-4 bg-base-content/20 mx-1" />

          <button
            className="btn btn-primary btn-xs"
            onClick={() => setStockInLot({})}
          >
            <Plus className="w-3 h-3" />
            Add Stock
          </button>
        </div>
      </div>

      {/* Lots table */}
      {lots.length === 0 ? (
        <div className="text-center py-8 text-base-content/60 bg-base-100 rounded-lg">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            {hideOutOfStock || hideExpired
              ? "No lots match the current filters."
              : "No lots yet. Add stock to create the first lot."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg">
          <table className="table table-sm bg-base-100">
            <thead>
              <tr>
                <th>Lot Number</th>
                <th>Quantity</th>
                <th>Expiry Date</th>
                <th className="hidden sm:table-cell">Received</th>
                <th className="hidden md:table-cell">Shelf Life</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lots.map(lot => (
                <LotRow
                  key={lot.id}
                  lot={lot}
                  unit={reagent.unit}
                  onStockIn={() => setStockInLot(lot)}
                  onStockOut={() => setStockOutLot(lot)}
                  onRefresh={handleRefreshLot}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {showPagination && (
        <div className="flex justify-between items-center mt-3 px-1">
          <span className="text-xs text-base-content/60">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-1">
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= pagination.totalPages}
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Stock In Modal */}
      <LotStockInModal
        isOpen={!!stockInLot}
        onClose={() => setStockInLot(null)}
        reagent={reagent}
        existingLots={lots}
        prefilledLot={stockInLot?.id ? stockInLot : null}
        onSaved={handleStockInSaved}
      />

      {/* Stock Out Modal */}
      <LotStockOutModal
        isOpen={!!stockOutLot}
        onClose={() => setStockOutLot(null)}
        lot={stockOutLot}
        unit={reagent.unit}
        onSaved={handleStockOutSaved}
      />
    </div>
  );
}
