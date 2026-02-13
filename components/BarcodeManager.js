"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, QrCode } from "lucide-react";
import toast from "react-hot-toast";
import { searchReagents } from "@/actions/inventory";
import { CATEGORIES } from "@/libs/constants";
import AddLabelModal from "./barcode/AddLabelModal";
import LabelBatchPrintView from "./barcode/LabelBatchPrintView";

export function BarcodeManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Label batch — persisted to localStorage
  const [labelBatch, setLabelBatch] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("labelBatch");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      if (labelBatch.length === 0) {
        localStorage.removeItem("labelBatch");
      } else {
        localStorage.setItem("labelBatch", JSON.stringify(labelBatch));
      }
    } catch { /* storage full or unavailable — ignore */ }
  }, [labelBatch]);

  // Add label modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReagent, setSelectedReagent] = useState(null);

  // Debounced search (triggered by query or category change)
  useEffect(() => {
    const hasQuery = searchQuery.length >= 1;
    const hasCategory = !!selectedCategory;

    if (!hasQuery && !hasCategory) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const result = await searchReagents(
        hasQuery ? searchQuery : null,
        selectedCategory
      );
      if (result.success) {
        setSearchResults(result.data);
        setShowDropdown(true);
      }
      setIsSearching(false);
    }, hasCategory && !hasQuery ? 0 : 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const handleCategoryClick = useCallback((categoryValue) => {
    setSelectedCategory((prev) => (prev === categoryValue ? null : categoryValue));
    setSearchQuery("");
  }, []);

  const handleSelectReagent = useCallback((reagent) => {
    setSelectedReagent(reagent);
    setShowAddModal(true);
    setShowDropdown(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedCategory(null);
  }, []);

  const handleAddLabel = useCallback((labelData) => {
    // Check for duplicates
    const isDuplicate = labelBatch.some(
      (l) => l.reagent.id === labelData.reagent.id && l.lot_number === labelData.lot_number
    );

    if (isDuplicate) {
      toast.error("This lot label is already in the batch. Adjust the quantity to generate more labels.");
      return;
    }

    // Check total label cap (384 = 8 HERMA 4346 sheets)
    const currentTotal = labelBatch.reduce((sum, l) => sum + (l.quantity || 1), 0);
    if (currentTotal + (labelData.quantity || 1) > 384) {
      toast.error("Batch cannot exceed 384 labels (8 sheets)");
      return;
    }

    setLabelBatch((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        ...labelData,
      },
    ]);

    toast.success("Label added to batch");
  }, [labelBatch]);

  const handleRemoveLabel = useCallback((labelId) => {
    setLabelBatch((prev) => prev.filter((l) => l.id !== labelId));
  }, []);

  const handleClearBatch = useCallback(() => {
    setLabelBatch([]);
    toast.success("Batch cleared");
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <QrCode className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Barcode Label Generator</h2>
      </div>

      {/* Reagent Search */}
      <div className="relative">
        <label className="label">
          <span className="label-text font-medium">Search reagent to add labels</span>
        </label>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2 mb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              className={`btn btn-xs ${
                selectedCategory === cat.value ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => handleCategoryClick(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            className="input input-bordered w-full pl-10"
            placeholder={
              selectedCategory
                ? `Search within ${selectedCategory}s...`
                : "Search by name or reference..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          />
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
          {isSearching && (
            <span className="loading loading-spinner loading-xs absolute right-3 top-1/2 -translate-y-1/2" />
          )}
        </div>

        {/* Search dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-40 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((reagent) => (
              <button
                key={reagent.id}
                className="w-full text-left px-4 py-3 hover:bg-base-200 border-b border-base-200 last:border-0 transition-colors"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectReagent(reagent)}
              >
                <p className="font-medium text-sm">{reagent.name}</p>
                <p className="text-xs text-base-content/60">
                  Ref: {reagent.reference} &bull;{" "}
                  <span className="capitalize">{reagent.category}</span> &bull;{" "}
                  {reagent.supplier}
                </p>
              </button>
            ))}
          </div>
        )}

        {showDropdown && searchResults.length === 0 && !isSearching && (searchQuery.length >= 2 || selectedCategory) && (
          <div className="absolute z-40 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg p-4">
            <p className="text-sm text-base-content/50 text-center">No reagents found</p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="divider my-2">Labels Batch</div>

      {/* Label batch */}
      <LabelBatchPrintView
        labels={labelBatch}
        onRemove={handleRemoveLabel}
        onClear={handleClearBatch}
      />

      {/* Add Label Modal */}
      <AddLabelModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        reagent={selectedReagent}
        onAdd={handleAddLabel}
      />
    </div>
  );
}
