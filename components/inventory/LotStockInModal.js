"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Plus, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { stockIn, checkLotExists } from "@/actions/inventory";
import { stockInSchema } from "@/libs/schemas";

export default function LotStockInModal({ isOpen, onClose, reagent, existingLots = [], prefilledLot = null, onSaved }) {
  const [existingLot, setExistingLot] = useState(null);
  const [isCheckingLot, setIsCheckingLot] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(stockInSchema),
    defaultValues: {
      reagent_id: reagent?.id,
      lot_number: '',
      quantity: 1,
      expiry_date: '',
      date_of_reception: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const lotNumber = watch("lot_number");
  const quantity = watch("quantity");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && reagent) {
      if (prefilledLot) {
        reset({
          reagent_id: reagent.id,
          lot_number: prefilledLot.lot_number,
          quantity: 1,
          expiry_date: '',
          date_of_reception: new Date().toISOString().split('T')[0],
          notes: '',
        });
        setExistingLot(prefilledLot);
      } else {
        reset({
          reagent_id: reagent.id,
          lot_number: '',
          quantity: 1,
          expiry_date: '',
          date_of_reception: new Date().toISOString().split('T')[0],
          notes: '',
        });
        setExistingLot(null);
      }
    }
  }, [isOpen, prefilledLot, reagent, reset]);

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

  const onSubmit = async (data) => {
    // If existing lot, remove expiry_date and date_of_reception from payload
    const payload = {
      reagent_id: data.reagent_id,
      lot_number: data.lot_number,
      quantity: data.quantity,
      expiry_date: existingLot ? undefined : data.expiry_date,
      date_of_reception: existingLot ? undefined : data.date_of_reception,
      notes: data.notes,
    };

    try {
      const result = await stockIn(payload);

      if (result.success) {
        toast.success(result.action === 'created' ? 'New lot created' : 'Stock added to lot');
        onSaved();
      } else {
        toast.error(result.errorMessage);
      }
    } catch (error) {
      toast.error("Failed to add stock");
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
                <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                  {/* Hidden reagent_id */}
                  <input type="hidden" {...register("reagent_id")} />

                  {/* Lot Number with autocomplete */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-medium">Lot Number</span>
                      <span className="label-text-alt text-error">*</span>
                    </label>
                    <input
                      type="text"
                      {...register("lot_number")}
                      className={`input input-bordered w-full font-mono ${errors.lot_number ? "input-error" : ""}`}
                      placeholder="e.g., LOT-2024-001"
                      list="existing-lots"
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
                    {errors.lot_number && (
                      <label className="label">
                        <span className="label-text-alt text-error">{errors.lot_number.message}</span>
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
                        {...register("quantity", { valueAsNumber: true })}
                        min="1"
                        className={`input input-bordered w-full join-item ${errors.quantity ? "input-error" : ""}`}
                      />
                      <span className="btn btn-disabled join-item">{reagent.unit}</span>
                    </div>
                    {errors.quantity && (
                      <label className="label">
                        <span className="label-text-alt text-error">{errors.quantity.message}</span>
                      </label>
                    )}
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
                          {...register("expiry_date")}
                          className={`input input-bordered w-full ${errors.expiry_date ? "input-error" : ""}`}
                        />
                        {errors.expiry_date && (
                          <label className="label">
                            <span className="label-text-alt text-error">{errors.expiry_date.message}</span>
                          </label>
                        )}
                      </div>

                      <div className="form-control mb-4">
                        <label className="label">
                          <span className="label-text font-medium">Date of Reception</span>
                        </label>
                        <input
                          type="date"
                          {...register("date_of_reception")}
                          className="input input-bordered w-full"
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
                      {...register("notes")}
                      className="textarea textarea-bordered w-full"
                      placeholder="Optional notes..."
                      rows={2}
                    />
                  </div>

                  {/* Preview */}
                  <div className="alert alert-success py-3 mb-4">
                    <span>
                      {existingLot ? (
                        <>New lot total: <strong>{existingLot.quantity + (quantity || 0)} {reagent.unit}</strong></>
                      ) : (
                        <>Creating new lot with <strong>{quantity || 0} {reagent.unit}</strong></>
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
                      disabled={isSubmitting}
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
