"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Plus, Info } from "lucide-react";
import toast from "react-hot-toast";
import { stockIn, checkLotExists } from "@/actions/inventory";

export default function LotStockInModal({ isOpen, onClose, reagent, existingLots = [], prefilledLot = null, onSaved }) {
  const [lotNumber, setLotNumber] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [dateOfReception, setDateOfReception] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingLot, setExistingLot] = useState(null);
  const [isCheckingLot, setIsCheckingLot] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      // If prefilled lot is provided, use it
      if (prefilledLot) {
        setLotNumber(prefilledLot.lot_number);
        setExistingLot(prefilledLot);
      } else {
        setLotNumber('');
        setExistingLot(null);
      }
      setQuantity(1);
      setExpiryDate('');
      setDateOfReception(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [isOpen, prefilledLot]);

  // Check if lot exists when lot number changes
  useEffect(() => {
    if (!lotNumber || !reagent?.id) {
      setExistingLot(null);
      return;
    }

    const checkLot = async () => {
      setIsCheckingLot(true);
      const result = await checkLotExists(reagent.id, lotNumber);
      if (result.success && result.exists) {
        setExistingLot(result.lot);
      } else {
        setExistingLot(null);
      }
      setIsCheckingLot(false);
    };

    const timer = setTimeout(checkLot, 300);
    return () => clearTimeout(timer);
  }, [lotNumber, reagent?.id]);

  if (!reagent) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await stockIn({
        reagent_id: reagent.id,
        lot_number: lotNumber,
        quantity: parseInt(quantity, 10),
        expiry_date: existingLot ? undefined : expiryDate,
        date_of_reception: existingLot ? undefined : dateOfReception,
        notes: notes || undefined
      });

      if (result.success) {
        toast.success(result.action === 'created' ? 'New lot created' : 'Stock added to lot');
        onSaved();
      } else {
        toast.error(result.errorMessage);
      }
    } catch (error) {
      toast.error("Failed to add stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
                    <Plus className="w-5 h-5 text-success" />
                    Add Stock
                  </Dialog.Title>
                  <button
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={onClose}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Reagent info header */}
                <div className="px-6 py-3 bg-base-200">
                  <p className="font-semibold">{reagent.name}</p>
                  <p className="text-sm text-base-content/70">
                    Code: {reagent.internal_barcode} • Current total: {reagent.total_quantity} {reagent.unit}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                  {/* Lot Number with autocomplete */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-medium">Lot Number</span>
                      <span className="label-text-alt text-error">*</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full font-mono"
                      placeholder="e.g., LOT-2024-001"
                      value={lotNumber}
                      onChange={(e) => setLotNumber(e.target.value)}
                      list="existing-lots"
                      required
                    />
                    <datalist id="existing-lots">
                      {existingLots.map(lot => (
                        <option key={lot.id} value={lot.lot_number} />
                      ))}
                    </datalist>
                    {isCheckingLot && (
                      <label className="label">
                        <span className="label-text-alt">Checking...</span>
                      </label>
                    )}
                  </div>

                  {/* Existing lot info */}
                  {existingLot && (
                    <div className="alert alert-info py-3 mb-4">
                      <Info className="w-4 h-4 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium">Adding to existing lot</p>
                        <p>Current: {existingLot.quantity} {reagent.unit} • Expiry: {formatDate(existingLot.expiry_date)}</p>
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-medium">Quantity to Add</span>
                      <span className="label-text-alt text-error">*</span>
                    </label>
                    <div className="join">
                      <input
                        type="number"
                        min="1"
                        className="input input-bordered w-full join-item"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                        required
                      />
                      <span className="btn btn-disabled join-item">{reagent.unit}</span>
                    </div>
                  </div>

                  {/* Expiry Date - only for new lots */}
                  {!existingLot && (
                    <>
                      <div className="form-control mb-4">
                        <label className="label">
                          <span className="label-text font-medium">Expiry Date</span>
                          <span className="label-text-alt text-error">*</span>
                        </label>
                        <input
                          type="date"
                          className="input input-bordered w-full"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          required={!existingLot}
                        />
                      </div>

                      <div className="form-control mb-4">
                        <label className="label">
                          <span className="label-text font-medium">Date of Reception</span>
                        </label>
                        <input
                          type="date"
                          className="input input-bordered w-full"
                          value={dateOfReception}
                          onChange={(e) => setDateOfReception(e.target.value)}
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
                      placeholder="Optional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Preview */}
                  <div className="alert alert-success py-3 mb-4">
                    <span>
                      {existingLot ? (
                        <>New lot total: <strong>{existingLot.quantity + quantity} {reagent.unit}</strong></>
                      ) : (
                        <>Creating new lot with <strong>{quantity} {reagent.unit}</strong></>
                      )}
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
                      className="btn btn-success flex-1"
                      disabled={isSubmitting || quantity <= 0 || !lotNumber || (!existingLot && !expiryDate)}
                    >
                      {isSubmitting ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        'Add Stock'
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
