"use client";

import { useState } from "react";
import { FileSpreadsheet, X, Download } from "lucide-react";
import toast from "react-hot-toast";

export default function ExportModal({ onClose, onExportStarted }) {
  const [includeEmptyLots, setIncludeEmptyLots] = useState(true);
  const [includeExpiredLots, setIncludeExpiredLots] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExport = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/export/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          include_empty_lots: includeEmptyLots,
          include_expired_lots: includeExpiredLots,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        toast.error(body.error || "Failed to start export");
        return;
      }

      onExportStarted(body.jobId);
      onClose();
    } catch {
      toast.error("Failed to start export. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-200">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-base-content">Export to Excel</h2>
          </div>
          <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-base-content/70 mb-5">
            The export will include two sheets: <strong>Items</strong> and <strong>Lots</strong>.
            Choose which lots to include:
          </p>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer gap-4">
              <div>
                <p className="text-sm font-medium">Include out-of-stock lots</p>
                <p className="text-xs text-base-content/60">Lots with quantity = 0</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={includeEmptyLots}
                onChange={e => setIncludeEmptyLots(e.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer gap-4">
              <div>
                <p className="text-sm font-medium">Include expired lots</p>
                <p className="text-xs text-base-content/60">Lots past their expiry date</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={includeExpiredLots}
                onChange={e => setIncludeExpiredLots(e.target.checked)}
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-base-200">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleExport}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? <span className="loading loading-spinner loading-xs" />
              : <Download className="w-4 h-4" />
            }
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
