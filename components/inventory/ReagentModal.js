"use client";

import { Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { createReagent, updateReagent } from "@/actions/inventory";
import { UNITS } from "@/libs/constants";
import { reagentSchema } from "@/libs/schemas";

const defaultValues = {
  name: '',
  internal_barcode: '',
  description: '',
  supplier: '',
  minimum_stock: 0,
  unit: 'units',
  storage_location: '',
  storage_temperature: '',
  sector: '',
  machine: ''
};

export default function ReagentModal({ isOpen, onClose, reagent, onSaved }) {
  const isEditing = !!reagent;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(reagentSchema),
    defaultValues,
  });

  useEffect(() => {
    if (reagent) {
      reset({
        name: reagent.name || '',
        internal_barcode: reagent.internal_barcode || '',
        description: reagent.description || '',
        supplier: reagent.supplier || '',
        minimum_stock: reagent.minimum_stock || 0,
        unit: reagent.unit || 'units',
        storage_location: reagent.storage_location || '',
        storage_temperature: reagent.storage_temperature || '',
        sector: reagent.sector || '',
        machine: reagent.machine || ''
      });
    } else {
      reset(defaultValues);
    }
  }, [reagent, isOpen, reset]);

  const onSubmit = async (data) => {
    try {
      let result;
      if (isEditing) {
        result = await updateReagent(reagent.id, data);
      } else {
        result = await createReagent(data);
      }

      if (result.success) {
        toast.success(isEditing ? "Reagent updated" : "Reagent created");
        onSaved();
      } else {
        toast.error(result.errorMessage);
      }
    } catch (error) {
      toast.error("Failed to save reagent");
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
              <Dialog.Panel className="w-full max-w-2xl rounded-2xl bg-base-100 shadow-xl">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-base-300">
                  <Dialog.Title as="h3" className="text-lg font-semibold">
                    {isEditing ? 'Edit Reagent' : 'Add New Reagent'}
                  </Dialog.Title>
                  <button
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={onClose}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Info banner for new reagents */}
                {!isEditing && (
                  <div className="px-6 py-3 bg-info/10 border-b border-info/20">
                    <div className="flex items-start gap-2 text-sm text-info-content">
                      <Info className="w-4 h-4 mt-0.5 shrink-0" />
                      <p>
                        New reagents start with zero stock. After creating the reagent,
                        expand its row and click "Add Stock" to add lots with quantities and expiry dates.
                      </p>
                    </div>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                  {/* Basic Information */}
                  <h4 className="text-sm font-semibold text-base-content/70 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Name</span>
                        <span className="label-text-alt text-error">*</span>
                      </label>
                      <input
                        type="text"
                        {...register("name")}
                        className={`input input-bordered w-full ${errors.name ? "input-error" : ""}`}
                        placeholder="e.g., CBC Diluent"
                      />
                      {errors.name && (
                        <label className="label">
                          <span className="label-text-alt text-error">{errors.name.message}</span>
                        </label>
                      )}
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Internal Barcode / Code</span>
                        <span className="label-text-alt text-error">*</span>
                      </label>
                      <input
                        type="text"
                        {...register("internal_barcode")}
                        className={`input input-bordered w-full font-mono ${errors.internal_barcode ? "input-error" : ""}`}
                        placeholder="e.g., HEM-001-2024"
                      />
                      {errors.internal_barcode && (
                        <label className="label">
                          <span className="label-text-alt text-error">{errors.internal_barcode.message}</span>
                        </label>
                      )}
                    </div>

                    <div className="form-control sm:col-span-2">
                      <label className="label">
                        <span className="label-text font-medium">Description</span>
                        <span className="label-text-alt">(optional)</span>
                      </label>
                      <textarea
                        {...register("description")}
                        className="textarea textarea-bordered w-full"
                        placeholder="Optional description for this reagent..."
                        rows={2}
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Supplier</span>
                        <span className="label-text-alt text-error">*</span>
                      </label>
                      <input
                        type="text"
                        {...register("supplier")}
                        className={`input input-bordered w-full ${errors.supplier ? "input-error" : ""}`}
                        placeholder="e.g., Beckman Coulter"
                      />
                      {errors.supplier && (
                        <label className="label">
                          <span className="label-text-alt text-error">{errors.supplier.message}</span>
                        </label>
                      )}
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Unit</span>
                      </label>
                      <select
                        {...register("unit")}
                        className="select select-bordered w-full"
                      >
                        {UNITS.map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Stock Settings */}
                  <h4 className="text-sm font-semibold text-base-content/70 mb-3">Stock Settings</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Minimum Stock Level</span>
                      </label>
                      <input
                        type="number"
                        {...register("minimum_stock", { valueAsNumber: true })}
                        min="0"
                        className="input input-bordered w-full"
                      />
                      <label className="label">
                        <span className="label-text-alt">Alert when total stock falls below this level</span>
                      </label>
                    </div>
                  </div>

                  {/* Location & Classification */}
                  <h4 className="text-sm font-semibold text-base-content/70 mb-3">Location & Classification</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Storage Location</span>
                        <span className="label-text-alt text-error">*</span>
                      </label>
                      <input
                        type="text"
                        {...register("storage_location")}
                        className={`input input-bordered w-full ${errors.storage_location ? "input-error" : ""}`}
                        placeholder="e.g., Fridge A - Shelf 2"
                      />
                      {errors.storage_location && (
                        <label className="label">
                          <span className="label-text-alt text-error">{errors.storage_location.message}</span>
                        </label>
                      )}
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Storage Temperature</span>
                        <span className="label-text-alt text-error">*</span>
                      </label>
                      <input
                        type="text"
                        {...register("storage_temperature")}
                        className={`input input-bordered w-full ${errors.storage_temperature ? "input-error" : ""}`}
                        placeholder="e.g., 2-8°C"
                      />
                      {errors.storage_temperature && (
                        <label className="label">
                          <span className="label-text-alt text-error">{errors.storage_temperature.message}</span>
                        </label>
                      )}
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Sector</span>
                        <span className="label-text-alt text-error">*</span>
                      </label>
                      <input
                        type="text"
                        {...register("sector")}
                        className={`input input-bordered w-full ${errors.sector ? "input-error" : ""}`}
                        placeholder="e.g., Hematology"
                      />
                      {errors.sector && (
                        <label className="label">
                          <span className="label-text-alt text-error">{errors.sector.message}</span>
                        </label>
                      )}
                    </div>

                   <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Machine</span>
                        <span className="label-text-alt">(optional)</span>
                      </label>
                      <input
                        type="text"
                        {...register("machine")}
                        className="input input-bordered w-full"
                        placeholder="e.g., Sysmex XN"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-8 pt-4 border-t border-base-300">
                    <button
                      type="button"
                      className="btn btn-ghost flex-1"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        isEditing ? 'Save Changes' : 'Add Reagent'
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
