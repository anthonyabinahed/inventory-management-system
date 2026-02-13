"use client";

import LabelPreview from "./LabelPreview";
import { generateLabelsPDF } from "@/libs/barcode";
import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function LabelBatchPrintView({ labels, onRemove, onClear }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    if (labels.length === 0) return;

    setIsGenerating(true);
    try {
      await generateLabelsPDF(labels);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  if (labels.length === 0) {
    return (
      <div className="text-center py-12 text-base-content/50">
        <p className="text-lg mb-1">No labels in batch</p>
        <p className="text-sm">Search for a reagent above and add labels to get started.</p>
      </div>
    );
  }

  const totalLabels = labels.reduce((sum, l) => sum + (l.quantity || 1), 0);
  const exceedsLimit = totalLabels > 384;

  return (
    <div>
      {/* Action bar */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-base-content/70">
            {labels.length} item{labels.length !== 1 ? "s" : ""} &bull; {totalLabels} label{totalLabels !== 1 ? "s" : ""} total
            {totalLabels > 48 && ` (${Math.ceil(totalLabels / 48)} pages)`}
          </p>
          {exceedsLimit && (
            <p className="text-xs text-error mt-1">Exceeds 384 label limit (8 sheets). Remove some labels to download.</p>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm gap-1" onClick={onClear}>
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            className="btn btn-primary btn-sm gap-1"
            onClick={handleDownloadPDF}
            disabled={isGenerating || exceedsLimit}
          >
            {isGenerating ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Download PDF</span>
          </button>
        </div>
      </div>

      {/* Label grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {labels.map((label) => (
          <LabelPreview
            key={label.id}
            label={label}
            onRemove={() => onRemove(label.id)}
          />
        ))}
      </div>
    </div>
  );
}
