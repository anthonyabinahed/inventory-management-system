"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Plus, Minus } from "lucide-react";
import toast from "react-hot-toast";
import { stockIn, stockOut } from "@/actions/inventory";

export default function StockMovementModal({ isOpen, onClose, reagent, movementType, onSaved }) {
  const [quantity, setQuantity] = useState(1);
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isStockIn = movementType === 'in';

  useEffect(() => {
    if (isOpen && reagent) {
      setQuantity(1);
      setLotNumber('');
      setExpiryDate('');
      setNotes('');
    }
  }, [isOpen, reagent]);

  if (!reagent) return null;

  const previewQuantity = isStockIn
    ? reagent.quantity + quantity
    : reagent.quantity - quantity;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let result;
      if (isStockIn) {
        result = await stockIn(reagent.id, quantity, {
          lot_number: lotNumber || undefined,
          expiry_date: expiryDate || undefined,
          notes: notes || undefined
        });
      } else {
        result = await stockOut(reagent.id, quantity, {
          notes: notes || undefined
        });
      }

      if (result.success) {
        toast.success(isStockIn ? "Stock added" : "Stock removed");
        onSaved();
      } else {
        toast.error(result.errorMessage);
      }
    } catch (error) {
      toast.error("Failed to update stock");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <Dialog.Panel className="w-full max-w-md rounded-2xl bg-base-100 shadow-xl">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-base-300">
                  <Dialog.Title as="h3" className="text-lg font-semibold flex items-center gap-2">
                    {isStockIn ? (
                      <>
                        <Plus className="w-5 h-5 text-success" />
                        Stock In
                      </>
                    ) : (
                      <>
                        <Minus className="w-5 h-5 text-error" />
                        Stock Out
                      </>
                    )}
                  </Dialog.Title>
                  <button
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={onClose}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6">
                  {/* Reagent info header */}
                  <div className="bg-base-200 rounded-lg p-3 mb-4">
                    <p className="font-semibold">{reagent.name}</p>
                    <p className="text-sm text-base-content/70">
                      Current stock: <span className="font-medium">{reagent.quantity} {reagent.unit}</span>
                    </p>
                    <p className="text-xs text-base-content/50">
                      Lot: {reagent.lot_number} | Barcode: {reagent.internal_barcode}
                    </p>
                  </div>

                  {/* Quantity input */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-medium">Quantity</span>
                      <span className="label-text-alt text-error">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={!isStockIn ? reagent.quantity : undefined}
                      className="input input-bordered w-full"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                      required
                    />
                    {!isStockIn && quantity > reagent.quantity && (
                      <label className="label">
                        <span className="label-text-alt text-error">Cannot exceed current stock</span>
                      </label>
                    )}
                  </div>

                  {/* Stock In specific fields */}
                  {isStockIn && (
                    <>
                      <div className="form-control mb-4">
                        <label className="label">
                          <span className="label-text font-medium">New Lot Number</span>
                          <span className="label-text-alt">(optional)</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered w-full"
                          placeholder="Leave blank to keep current"
                          value={lotNumber}
                          onChange={(e) => setLotNumber(e.target.value)}
                        />
                      </div>

                      <div className="form-control mb-4">
                        <label className="label">
                          <span className="label-text font-medium">New Expiry Date</span>
                          <span className="label-text-alt">(optional)</span>
                        </label>
                        <input
                          type="date"
                          className="input input-bordered w-full"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {/* Notes */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-medium">Notes</span>
                      <span className="label-text-alt">(optional)</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered w-full"
                      placeholder="Optional notes for this movement..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Preview */}
                  <div className={`alert ${isStockIn ? 'alert-success' : 'alert-warning'} py-3`}>
                    <span>
                      New quantity will be:{' '}
                      <strong className="text-lg">{previewQuantity} {reagent.unit}</strong>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      className="btn btn-ghost flex-1"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`btn flex-1 ${isStockIn ? 'btn-success' : 'btn-warning'}`}
                      disabled={isSubmitting || quantity <= 0 || (!isStockIn && quantity > reagent.quantity)}
                    >
                      {isSubmitting ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        'Confirm'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
