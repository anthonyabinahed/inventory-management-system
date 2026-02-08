"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Info } from "lucide-react";
import toast from "react-hot-toast";
import { createReagent, updateReagent } from "@/actions/inventory";
import { UNITS } from "@/libs/constants";

const initialFormData = {
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
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!reagent;

  useEffect(() => {
    if (reagent) {
      setFormData({
        // TODO: isn't it better if i use something like ZOD so that in the actions i can use the same scheme? no duplications... 
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
      setFormData(initialFormData);
    }
  }, [reagent, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dataToSubmit = {
        ...formData,
        minimum_stock: parseInt(formData.minimum_stock, 10),
        // TODO: why only these 2 machine and description are specified here? 
        machine: formData.machine || null,
        description: formData.description || null
      };

      let result;
      if (isEditing) {
        result = await updateReagent(reagent.id, dataToSubmit);
      } else {
        result = await createReagent(dataToSubmit);
      }

      if (result.success) {
        toast.success(isEditing ? "Reagent updated" : "Reagent created");
        onSaved();
      } else {
        toast.error(result.errorMessage);
      }
    } catch (error) {
      toast.error("Failed to save reagent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    // TODO: what's that transition thing and Fragment ? explain 
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
                <form onSubmit={handleSubmit} className="p-6">
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
                        name="name"
                        className="input input-bordered w-full"
                        placeholder="e.g., CBC Diluent"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Internal Barcode / Code</span>
                        <span className="label-text-alt text-error">*</span>
                      </label>
                      <input
                        type="text"
                        name="internal_barcode"
                        className="input input-bordered w-full font-mono"
                        placeholder="e.g., HEM-001-2024"
                        value={formData.internal_barcode}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-control sm:col-span-2">
                      <label className="label">
                        <span className="label-text font-medium">Description</span>
                        <span className="label-text-alt">(optional)</span>
                      </label>
                      <textarea
                        name="description"
                        className="textarea textarea-bordered w-full"
                        placeholder="Optional description for this reagent..."
                        value={formData.description}
                        onChange={handleChange}
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
                        name="supplier"
                        className="input input-bordered w-full"
                        placeholder="e.g., Beckman Coulter"
                        value={formData.supplier}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Unit</span>
                      </label>
                      <select
                        name="unit"
                        className="select select-bordered w-full"
                        value={formData.unit}
                        onChange={handleChange}
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
                        name="minimum_stock"
                        min="0"
                        className="input input-bordered w-full"
                        value={formData.minimum_stock}
                        onChange={handleChange}
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
                        name="storage_location"
                        className="input input-bordered w-full"
                        placeholder="e.g., Fridge A - Shelf 2"
                        value={formData.storage_location}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Storage Temperature</span>
                        <span className="label-text-alt text-error">*</span>
                      </label>
                      <input
                        type="text"
                        name="storage_temperature"
                        className="input input-bordered w-full"
                        placeholder="e.g., 2-8°C"
                        value={formData.storage_temperature}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Sector</span>
                        <span className="label-text-alt text-error">*</span>
                      </label>
                      <input
                        type="text"
                        name="sector"
                        className="input input-bordered w-full"
                        placeholder="e.g., Hematology"
                        value={formData.sector}
                        onChange={handleChange}
                        required
                      />
                    </div>

                   <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Machine</span>
                        <span className="label-text-alt">(optional)</span>
                      </label>
                      <input
                        type="text"
                        name="machine"
                        className="input input-bordered w-full"
                        placeholder="e.g., Sysmex XN"
                        value={formData.machine}
                        onChange={handleChange}
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
