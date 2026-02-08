"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Minus } from "lucide-react";
import toast from "react-hot-toast";
import { stockOut } from "@/actions/inventory";
import { ExpiryBadge } from "./StatusBadges";

export default function LotStockOutModal({ isOpen, onClose, lot, unit, onSaved }) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && lot) {
      setQuantity(1);
      setNotes('');
    }
  }, [isOpen, lot]);

  if (!lot) return null;

  const previewQuantity = lot.quantity - quantity;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await stockOut(lot.id, parseInt(quantity, 10), {
        notes: notes || undefined
      });

      if (result.success) {
        toast.success('Stock removed');
        onSaved();
      } else {
        toast.error(result.errorMessage);
      }
    } catch (error) {
      toast.error("Failed to remove stock");
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
                    <Minus className="w-5 h-5 text-error" />
                    Remove Stock
                  </Dialog.Title>
                  <button
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={onClose}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Lot info header */}
                <div className="px-6 py-3 bg-base-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold font-mono">{lot.lot_number}</p>
                      <p className="text-sm text-base-content/70">
                        Current stock: <span className="font-medium">{lot.quantity} {unit}</span>
                      </p>
                    </div>
                    <ExpiryBadge expiryDate={lot.expiry_date} />
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                  {/* Quantity */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-medium">Quantity to Remove</span>
                      <span className="label-text-alt text-error">*</span>
                    </label>
                    <div className="join">
                      <input
                        type="number"
                        min="1"
                        max={lot.quantity}
                        className="input input-bordered w-full join-item"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                        required
                      />
                      <span className="btn btn-disabled join-item">{unit}</span>
                    </div>
                    {quantity > lot.quantity && (
                      <label className="label">
                        <span className="label-text-alt text-error">Cannot exceed current stock ({lot.quantity})</span>
                      </label>
                    )}
                  </div>

                  {/* Quick quantity buttons */}
                  <div className="flex gap-2 mb-4">
                    {[1, 5, 10].filter(n => n <= lot.quantity).map(n => (
                      <button
                        key={n}
                        type="button"
                        className={`btn btn-sm ${quantity === n ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setQuantity(n)}
                      >
                        {n}
                      </button>
                    ))}
                    {lot.quantity > 1 && (
                      <button
                        type="button"
                        className={`btn btn-sm ${quantity === lot.quantity ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setQuantity(lot.quantity)}
                      >
                        All ({lot.quantity})
                      </button>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-medium">Notes</span>
                      <span className="label-text-alt">(optional)</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered w-full"
                      placeholder="Optional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Preview */}
                  <div className={`alert py-3 mb-4 ${previewQuantity === 0 ? 'alert-error' : 'alert-warning'}`}>
                    <span>
                      Remaining: <strong>{previewQuantity} {unit}</strong>
                      {previewQuantity === 0 && ' (lot will be empty)'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="btn btn-ghost flex-1"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-warning flex-1"
                      disabled={isSubmitting || quantity <= 0 || quantity > lot.quantity}
                    >
                      {isSubmitting ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        'Remove Stock'
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
