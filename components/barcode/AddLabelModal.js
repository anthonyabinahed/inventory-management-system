"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Tag, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addLabelSchema } from "@/libs/schemas";
import { checkLotExists } from "@/actions/inventory";

export default function AddLabelModal({ isOpen, onClose, reagent, onAdd }) {
  const [existingLot, setExistingLot] = useState(null);
  const [isCheckingLot, setIsCheckingLot] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addLabelSchema),
    defaultValues: {
      lot_number: "",
      expiry_date: "",
      quantity: 1,
    },
  });

  const lotNumber = watch("lot_number");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({ lot_number: "", expiry_date: "", quantity: 1 });
      setExistingLot(null);
    }
  }, [isOpen, reset]);

  // Debounced lot existence check
  useEffect(() => {
    if (!reagent || !lotNumber || lotNumber.length < 1) {
      setExistingLot(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingLot(true);
      const result = await checkLotExists(reagent.id, lotNumber);
      if (result.success && result.exists) {
        setExistingLot(result.lot);
        setValue("expiry_date", result.lot.expiry_date ?? "");
      } else {
        setExistingLot(null);
      }
      setIsCheckingLot(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [lotNumber, reagent, setValue]);

  if (!reagent) return null;

  const onSubmit = (data) => {
    onAdd({
      reagent,
      lot_number: data.lot_number,
      expiry_date: data.expiry_date || null,
      quantity: data.quantity,
    });
    onClose();
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
                    <Tag className="w-5 h-5 text-primary" />
                    Add Label
                  </Dialog.Title>
                  <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Reagent info header */}
                <div className="px-6 py-3 bg-base-200">
                  <p className="font-semibold">{reagent.name}</p>
                  <p className="text-sm text-base-content/70">
                    Ref: {reagent.reference} &bull; {reagent.supplier}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                  {/* Lot Number */}
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
                      autoFocus
                    />
                    {errors.lot_number && (
                      <label className="label">
                        <span className="label-text-alt text-error">{errors.lot_number.message}</span>
                      </label>
                    )}
                  </div>

                  {/* Expiry Date */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-medium">Expiry Date</span>
                      <span className="label-text-alt">(optional for consumables)</span>
                    </label>
                    <input
                      type="date"
                      {...register("expiry_date")}
                      className={`input input-bordered w-full ${existingLot ? "input-disabled" : ""}`}
                      disabled={!!existingLot}
                    />
                    {existingLot && (
                      <label className="label">
                        <span className="label-text-alt text-info flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          Expiry date from existing lot
                        </span>
                      </label>
                    )}
                    {isCheckingLot && (
                      <label className="label">
                        <span className="label-text-alt flex items-center gap-1">
                          <span className="loading loading-spinner loading-xs" />
                          Checking lot...
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Number of Labels */}
                  <div className="form-control mb-6">
                    <label className="label">
                      <span className="label-text font-medium">Number of Labels</span>
                      <span className="label-text-alt text-error">*</span>
                    </label>
                    <input
                      type="number"
                      {...register("quantity", { valueAsNumber: true })}
                      min="1"
                      className={`input input-bordered w-full ${errors.quantity ? "input-error" : ""}`}
                    />
                    {errors.quantity && (
                      <label className="label">
                        <span className="label-text-alt text-error">{errors.quantity.message}</span>
                      </label>
                    )}
                    <label className="label">
                      <span className="label-text-alt">How many copies of this label to print</span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary flex-1">
                      Add to Batch
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
