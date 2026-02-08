"use client";

import { useState, useEffect } from "react";
import { Plus, Package } from "lucide-react";
import toast from "react-hot-toast";
import { getLotsForReagent } from "@/actions/inventory";
import LotRow from "./LotRow";
import LotStockInModal from "./LotStockInModal";
import LotStockOutModal from "./LotStockOutModal";

export default function LotsPanel({ reagent, onReagentUpdated }) {
  const [lots, setLots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stockInLot, setStockInLot] = useState(null); // Lot to prefill in stock in modal
  const [stockOutLot, setStockOutLot] = useState(null);

  useEffect(() => {
    loadLots();
  }, [reagent.id]);

  // Sort lots with expired first, then by expiry date ascending
  const sortLots = (lotsArray) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...lotsArray].sort((a, b) => {
      const expiryA = new Date(a.expiry_date);
      const expiryB = new Date(b.expiry_date);
      const aExpired = expiryA < today;
      const bExpired = expiryB < today;

      // Expired lots first
      if (aExpired && !bExpired) return -1;
      if (!aExpired && bExpired) return 1;

      // Then by expiry date ascending (soonest first)
      return expiryA - expiryB;
    });
  };

  const loadLots = async () => {
    setIsLoading(true);
    try {
      const result = await getLotsForReagent(reagent.id);
      if (result.success) {
        setLots(sortLots(result.data));
      } else {
        toast.error(result.errorMessage);
      }
    } catch (error) {
      toast.error("Failed to load lots");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockInSaved = () => {
    setStockInLot(null);
    loadLots();
    onReagentUpdated(reagent.id);
  };

  const handleStockOutSaved = () => {
    setStockOutLot(null);
    loadLots();
    onReagentUpdated(reagent.id);
  };

  const handleStockOut = (lot) => {
    setStockOutLot(lot);
  };

  const handleStockInToLot = (lot) => {
    // Open modal with lot prefilled
    setStockInLot(lot);
  };

  const handleAddNewStock = () => {
    // Open modal without prefilled lot
    setStockInLot({});
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center bg-base-300">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-base-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-base-content/70">
          {lots.length} lot{lots.length !== 1 ? 's' : ''} • Total: <span className="font-medium text-base-content">{reagent.total_quantity} {reagent.unit}</span>
        </p>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleAddNewStock}
        >
          <Plus className="w-4 h-4" />
          Add Stock
        </button>
      </div>

      {/* Lots table */}
      {lots.length === 0 ? (
        <div className="text-center py-8 text-base-content/60 bg-base-100 rounded-lg">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No lots yet. Add stock to create the first lot.</p>
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
                  onStockIn={() => handleStockInToLot(lot)}
                  onStockOut={() => handleStockOut(lot)}
                  onRefresh={() => { loadLots(); onReagentUpdated(reagent.id); }}
                />
              ))}
            </tbody>
          </table>
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
