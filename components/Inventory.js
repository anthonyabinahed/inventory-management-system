"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import {
  getReagents,
  getReagentById,
  getFilterOptions
} from "@/actions/inventory";
import ReagentTable from "./inventory/ReagentTable";
import ReagentFilters from "./inventory/ReagentFilters";
import ReagentModal from "./inventory/ReagentModal";
import StockHistoryModal from "./inventory/StockHistoryModal";
import Pagination from "./inventory/Pagination";

const DEFAULT_FILTERS = {
  search: '',
  category: '',
  sector: '',
  machine: '',
  supplier: '',
  storage_location: '',
  lowStock: false,
  hasExpiredLots: false
};

export function Inventory({ initialFilters = {} }) {
  // Data state
  const [reagents, setReagents] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ suppliers: [], locations: [] });
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });

  // Filter state - merge initial filters with defaults
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...initialFilters });

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [expandedReagentId, setExpandedReagentId] = useState(null);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReagent, setEditingReagent] = useState(null);
  const [viewingReagent, setViewingReagent] = useState(null);
  const [historyReagent, setHistoryReagent] = useState(null);

  // Track if initial data has loaded
  const [isInitialized, setIsInitialized] = useState(false);

  // Update filters when initialFilters prop changes
  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      setFilters({ ...DEFAULT_FILTERS, ...initialFilters });
    }
  }, [initialFilters]);

  // Initial data load
  useEffect(() => {
    loadInitialData();
  }, []);

  // Debounced filter effect - only runs after initial load
  useEffect(() => {
    if (!isInitialized) return;
    const timer = setTimeout(() => {
      loadReagents();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, pagination.page, pagination.limit, isInitialized]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [reagentsResult, optionsResult] = await Promise.all([
        getReagents({ page: 1, limit: pagination.limit, filters }),
        getFilterOptions()
      ]);

      if (reagentsResult.success) {
        setReagents(reagentsResult.data);
        setPagination(reagentsResult.pagination);
      } else {
        toast.error(reagentsResult.errorMessage);
      }

      if (optionsResult.success) {
        setFilterOptions(optionsResult.data);
      }
    } catch (error) {
      toast.error("Failed to load inventory");
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  const loadReagents = async () => {
    setIsFiltering(true);
    try {
      const result = await getReagents({
        page: pagination.page,
        limit: pagination.limit,
        filters
      });

      if (result.success) {
        setReagents(result.data);
        setPagination(result.pagination);
      } else {
        toast.error(result.errorMessage);
      }
    } catch (error) {
      toast.error("Failed to load reagents");
    } finally {
      setIsFiltering(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadInitialData();
    setIsRefreshing(false);
  };

  const handleReagentUpdated = async (reagentId) => {
    try {
      const result = await getReagentById(reagentId);
      if (result.success && result.data) {
        setReagents(prev => prev.map(r => r.id === reagentId ? result.data : r));
      }
    } catch (error) {
      handleRefresh();
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const handleReagentSaved = () => {
    const wasEditing = editingReagent;
    setShowAddModal(false);
    setEditingReagent(null);
    if (wasEditing) {
      handleReagentUpdated(wasEditing.id);
    } else {
      handleRefresh();
    }
  };

  const handleToggleExpand = (reagentId) => {
    setExpandedReagentId(prev => prev === reagentId ? null : reagentId);
  };

  const handleViewHistory = (reagent) => {
    setHistoryReagent(reagent);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px] sm:min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Filters and Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
        <ReagentFilters
          filters={filters}
          options={filterOptions}
          onFilterChange={handleFilterChange}
        />

        <div className="flex gap-2 shrink-0">
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Reagents Table with Expandable Lots */}
      <ReagentTable
        reagents={reagents}
        isFiltering={isFiltering}
        onEdit={setEditingReagent}
        onViewDetails={setViewingReagent}
        onViewHistory={handleViewHistory}
        onRefresh={handleRefresh}
        onReagentUpdated={handleReagentUpdated}
        expandedReagentId={expandedReagentId}
        onToggleExpand={handleToggleExpand}
      />

      {/* Pagination */}
      <Pagination
        pagination={pagination}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />

      {/* Add/Edit Reagent Modal */}
      <ReagentModal
        isOpen={showAddModal || !!editingReagent}
        onClose={() => { setShowAddModal(false); setEditingReagent(null); }}
        reagent={editingReagent}
        onSaved={handleReagentSaved}
      />

      {/* View Details Modal (read-only, reuses ReagentModal) */}
      <ReagentModal
        isOpen={!!viewingReagent}
        onClose={() => setViewingReagent(null)}
        reagent={viewingReagent}
        viewOnly
      />

      {/* Stock History Modal (reagent-level) */}
      <StockHistoryModal
        isOpen={!!historyReagent}
        onClose={() => setHistoryReagent(null)}
        reagent={historyReagent}
      />
    </div>
  );
}
