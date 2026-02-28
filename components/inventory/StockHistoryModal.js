"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, History } from "lucide-react";
import { getReagentStockHistory } from "@/actions/inventory";
import { MOVEMENT_TYPES } from "@/libs/constants";

function getMovementBadgeClass(type) {
  const movement = MOVEMENT_TYPES.find(m => m.value === type);
  if (!movement) return 'badge-ghost';
  return `badge-${movement.color}`;
}

export default function StockHistoryModal({ isOpen, onClose, reagent }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && reagent) {
      loadHistory();
    }
  }, [isOpen, reagent]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const result = await getReagentStockHistory(reagent.id);
      if (result.success) {
        setHistory(result.data);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!reagent) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl rounded-2xl bg-base-100 shadow-xl">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-base-300">
                  <Dialog.Title as="h3" className="text-lg font-semibold flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Stock History
                  </Dialog.Title>
                  <button
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={onClose}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Reagent info */}
                <div className="px-6 py-3 bg-base-200">
                  <p className="font-semibold">{reagent.name}</p>
                  <p className="text-sm text-base-content/70">
                    Total: {reagent.total_quantity} {reagent.unit}
                  </p>
                </div>

                {/* Content */}
                <div className="p-6">
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <span className="loading loading-spinner loading-lg"></span>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-8 text-base-content/60">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No stock movements recorded yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-96">
                      <table className="table table-sm">
                        <thead className="sticky top-0 bg-base-100">
                          <tr>
                            <th>Date</th>
                            <th>Lot</th>
                            <th>Type</th>
                            <th>Change</th>
                            <th className="hidden sm:table-cell">Before → After</th>
                            <th className="hidden md:table-cell">User</th>
                            <th className="hidden lg:table-cell">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map(movement => (
                            <tr key={movement.id} className="hover">
                              <td className="text-xs">
                                {new Date(movement.performed_at).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td>
                                <span className="font-mono text-xs">{movement.lot_number || '-'}</span>
                              </td>
                              <td>
                                <span className={`badge badge-sm ${getMovementBadgeClass(movement.movement_type)}`}>
                                  {movement.movement_type}
                                </span>
                              </td>
                              <td className={movement.quantity >= 0 ? 'text-success' : 'text-error'}>
                                {movement.quantity >= 0 ? '+' : ''}{movement.quantity}
                              </td>
                              <td className="hidden sm:table-cell text-xs text-base-content/70">
                                {movement.quantity_before} → {movement.quantity_after}
                              </td>
                              <td className="hidden md:table-cell text-xs">
                                {movement.profiles?.full_name || movement.profiles?.email || '-'}
                                {movement.profiles && !movement.profiles.is_active && <span className="opacity-50"> (deactivated)</span>}
                              </td>
                              <td className="hidden lg:table-cell text-xs max-w-[150px] truncate">
                                {movement.notes || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end px-6 py-4 border-t border-base-300">
                  <button className="btn btn-ghost" onClick={onClose}>
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
