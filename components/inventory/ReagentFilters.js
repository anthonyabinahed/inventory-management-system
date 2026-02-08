"use client";

import { Search, X, Filter, AlertTriangle, Clock } from "lucide-react";

export default function ReagentFilters({ filters, options, alertCounts = {}, onFilterChange }) {
  const hasActiveFilters = filters.search || filters.sector || filters.machine ||
    filters.supplier || filters.storage_location || filters.lowStock || filters.hasExpiredLots;

  const clearFilters = () => {
    onFilterChange({
      search: '',
      sector: '',
      machine: '',
      supplier: '',
      storage_location: '',
      lowStock: false,
      hasExpiredLots: false
    });
  };

  const updateFilter = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
        <input
          type="text"
          placeholder="Search..."
          className="input input-bordered input-sm pl-9 w-32 sm:w-44"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
      </div>

      {/* Sector dropdown - hidden on mobile, populated from data */}
      <select
        className="select select-bordered select-sm w-28 hidden sm:inline-flex"
        value={filters.sector}
        onChange={(e) => updateFilter('sector', e.target.value)}
      >
        <option value="">All Sectors</option>
        {options.sectors?.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Machine dropdown - hidden on mobile, populated from data */}
      <select
        className="select select-bordered select-sm w-28 hidden sm:inline-flex"
        value={filters.machine}
        onChange={(e) => updateFilter('machine', e.target.value)}
      >
        <option value="">All Machines</option>
        {options.machines?.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {/* More filters dropdown */}
      <div className="dropdown dropdown-end">
        <label tabIndex={0} className="btn btn-sm btn-ghost">
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">More</span>
        </label>
        <div tabIndex={0} className="dropdown-content z-[1] p-4 shadow bg-base-100 rounded-box w-64">
          <div className="flex flex-col gap-3">
            <div className="form-control sm:hidden">
              <label className="label label-text text-xs">Sector</label>
              <select
                className="select select-bordered select-sm"
                value={filters.sector}
                onChange={(e) => updateFilter('sector', e.target.value)}
              >
                <option value="">All Sectors</option>
                {options.sectors?.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-control sm:hidden">
              <label className="label label-text text-xs">Machine</label>
              <select
                className="select select-bordered select-sm"
                value={filters.machine}
                onChange={(e) => updateFilter('machine', e.target.value)}
              >
                <option value="">All Machines</option>
                {options.machines?.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label label-text text-xs">Supplier</label>
              <select
                className="select select-bordered select-sm"
                value={filters.supplier}
                onChange={(e) => updateFilter('supplier', e.target.value)}
              >
                <option value="">All Suppliers</option>
                {options.suppliers.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label label-text text-xs">Storage Location</label>
              <select
                className="select select-bordered select-sm"
                value={filters.storage_location}
                onChange={(e) => updateFilter('storage_location', e.target.value)}
              >
                <option value="">All Locations</option>
                {options.locations.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px h-6 bg-base-300" />

      {/* Quick filter buttons with counts */}
      <button
        className={`btn btn-sm ${filters.lowStock ? 'btn-warning' : 'btn-ghost'}`}
        onClick={() => updateFilter('lowStock', !filters.lowStock)}
      >
        <AlertTriangle className="w-3 h-3" />
        <span className="text-xs">Low Stock</span>
        {alertCounts.lowStock > 0 && (
          <span className="badge badge-xs badge-warning">{alertCounts.lowStock}</span>
        )}
      </button>
      <button
        className={`btn btn-sm ${filters.hasExpiredLots ? 'btn-error' : 'btn-ghost'}`}
        onClick={() => updateFilter('hasExpiredLots', !filters.hasExpiredLots)}
      >
        <Clock className="w-3 h-3" />
        <span className="text-xs">Expired</span>
        {alertCounts.expiredLots > 0 && (
          <span className="badge badge-xs badge-error">{alertCounts.expiredLots}</span>
        )}
      </button>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={clearFilters}
        >
          <X className="w-4 h-4" />
          <span className="text-xs">Clear filters</span>
        </button>
      )}
    </div>
  );
}
