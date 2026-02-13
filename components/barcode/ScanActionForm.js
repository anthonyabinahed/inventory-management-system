"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stockOutSchema, stockInSchema } from "@/libs/schemas";
import { stockIn, stockOut } from "@/actions/inventory";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

export default function ScanActionForm({ mode, reagent, lot, qrData, onSuccess, onCancel }) {
  const isStockIn = mode === "in";
  const isNewLot = !lot;

  // For stock-in, we validate with stockInSchema (but we pre-fill most fields)
  // For stock-out, we validate with stockOutSchema
  const schema = isStockIn
    ? stockInSchema.pick({ quantity: true, notes: true })
    : stockOutSchema;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      quantity: 1,
      notes: "",
    },
  });

  const quantity = watch("quantity");

  const onSubmit = async (data) => {
    try {
      let result;

      if (isStockIn) {
        result = await stockIn({
          reagent_id: qrData.reagent_id,
          lot_number: qrData.lot_number,
          quantity: data.quantity,
          expiry_date: qrData.expiry_date || undefined,
          notes: data.notes,
        });
      } else {
        if (data.quantity > lot.quantity) {
          toast.error(`Cannot exceed current stock (${lot.quantity})`);
          return;
        }
        result = await stockOut(lot.id, data.quantity, {
          notes: data.notes,
        });
      }

      if (result.success) {
        toast.success(isStockIn ? "Stock added" : "Stock removed");
        onSuccess();
      } else {
        toast.error(result.errorMessage);
      }
    } catch {
      toast.error(isStockIn ? "Failed to add stock" : "Failed to remove stock");
    }
  };

  const previewText = isStockIn
    ? isNewLot
      ? `Creating new lot with ${quantity || 0} ${reagent.unit}`
      : `New total: ${(lot.quantity || 0) + (quantity || 0)} ${reagent.unit}`
    : `Remaining: ${Math.max(0, (lot?.quantity || 0) - (quantity || 0))} ${reagent.unit}`;

  const isOverStock = !isStockIn && lot && quantity > lot.quantity;

  return (
    <div className="space-y-4">
      {/* Info bar */}
      <div className="bg-base-200 rounded-lg p-3">
        <p className="font-semibold text-sm">{reagent.name}</p>
        <p className="text-xs text-base-content/70">
          Lot: <span className="font-mono">{qrData.lot_number}</span>
          {lot && ` — Current: ${lot.quantity} ${reagent.unit}`}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Quantity */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">
              Quantity to {isStockIn ? "Add" : "Remove"}
            </span>
            <span className="label-text-alt text-error">*</span>
          </label>
          <div className="join">
            <input
              type="number"
              {...register("quantity", { valueAsNumber: true })}
              min="1"
              max={!isStockIn && lot ? lot.quantity : undefined}
              className={`input input-bordered w-full join-item ${errors.quantity ? "input-error" : ""}`}
              autoFocus
            />
            <span className="btn btn-disabled join-item">{reagent.unit}</span>
          </div>
          {errors.quantity && (
            <label className="label">
              <span className="label-text-alt text-error">{errors.quantity.message}</span>
            </label>
          )}
          {isOverStock && !errors.quantity && (
            <label className="label">
              <span className="label-text-alt text-error">
                Cannot exceed current stock ({lot.quantity})
              </span>
            </label>
          )}
        </div>

        {/* Quick buttons (for stock-out with existing lot) */}
        {!isStockIn && lot && lot.quantity > 0 && (
          <div className="flex gap-2">
            {[1, 5, 10].filter((n) => n <= lot.quantity).map((n) => (
              <button
                key={n}
                type="button"
                className={`btn btn-sm ${quantity === n ? "btn-primary" : "btn-outline"}`}
                onClick={() => setValue("quantity", n)}
              >
                {n}
              </button>
            ))}
            {lot.quantity > 1 && (
              <button
                type="button"
                className={`btn btn-sm ${quantity === lot.quantity ? "btn-primary" : "btn-outline"}`}
                onClick={() => setValue("quantity", lot.quantity)}
              >
                All ({lot.quantity})
              </button>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="form-control">
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
        <div
          className={`alert py-3 ${
            !isStockIn && (lot?.quantity || 0) - (quantity || 0) === 0
              ? "alert-error"
              : isStockIn
              ? "alert-success"
              : "alert-warning"
          }`}
        >
          <span>{previewText}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" className="btn btn-ghost flex-1 gap-1" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="submit"
            className={`btn flex-1 ${isStockIn ? "btn-success" : "btn-warning"}`}
            disabled={isSubmitting || isOverStock}
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : isStockIn ? (
              "Confirm Stock In"
            ) : (
              "Confirm Stock Out"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
