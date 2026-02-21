"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "lucide-react";
import { getAuditLogs } from "@/actions/analytics";
import { getAllUsers } from "@/actions/users";
import { getAuditActionBadgeClass } from "@/libs/constants";
import { ChartCard } from "./shared/ChartCard";

// Human-readable labels for audit actions
const ACTION_LABELS = {
  create_reagent: "Create",
  update_reagent: "Update",
  delete_reagent: "Delete",
  stock_in: "Stock In",
  stock_out: "Stock Out",
  delete_lot: "Delete Lot",
  invite_user: "Invite",
  update_user_role: "Role Change",
  revoke_user: "Revoke",
};

const DATE_RANGE_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '6m', label: '6m' },
];

export default function ActivityAuditDashboard() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState('');
  const [auditDateRange, setAuditDateRange] = useState('');
  const [auditUserId, setAuditUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const debounceRef = useRef(null);

  const loadAuditLogs = useCallback(async (page, search, action, dateRange, userId, append = false) => {
    setAuditLoading(true);
    try {
      const res = await getAuditLogs({
        page,
        limit: 20,
        search: search || undefined,
        action: action || undefined,
        dateRange: dateRange || undefined,
        userId: userId || undefined,
      });
      if (res.success) {
        setAuditLogs(prev => append ? [...prev, ...res.data] : res.data);
        setAuditHasMore(res.pagination.hasMore);
        setAuditPage(page);
      } else {
        console.error("getAuditLogs failed:", res.errorMessage, { page, search, action, dateRange, userId });
        if (!append) setAuditLogs([]);
      }
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs(1, '', '', '', '');
  }, [loadAuditLogs]);

  useEffect(() => {
    getAllUsers().then(res => {
      if (res.success) setUsers(res.data || []);
    });
  }, []);

  const handleAuditSearch = useCallback((value) => {
    setAuditSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadAuditLogs(1, value, auditAction, auditDateRange, auditUserId);
    }, 300);
  }, [loadAuditLogs, auditAction, auditDateRange, auditUserId]);

  const handleActionChange = useCallback((value) => {
    setAuditAction(value);
    loadAuditLogs(1, auditSearch, value, auditDateRange, auditUserId);
  }, [loadAuditLogs, auditSearch, auditDateRange, auditUserId]);

  const handleDateRangeChange = useCallback((value) => {
    setAuditDateRange(value);
    loadAuditLogs(1, auditSearch, auditAction, value, auditUserId);
  }, [loadAuditLogs, auditSearch, auditAction, auditUserId]);

  const handleUserChange = useCallback((value) => {
    setAuditUserId(value);
    loadAuditLogs(1, auditSearch, auditAction, auditDateRange, value);
  }, [loadAuditLogs, auditSearch, auditAction, auditDateRange]);

  const handleLoadMore = useCallback(() => {
    loadAuditLogs(auditPage + 1, auditSearch, auditAction, auditDateRange, auditUserId, true);
  }, [auditPage, auditSearch, auditAction, auditDateRange, auditUserId, loadAuditLogs]);

  return (
    <ChartCard title="Audit Logs" subtitle="All system operations">
      <div className="space-y-2">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="join">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`join-item btn btn-xs sm:btn-sm ${auditDateRange === opt.value ? 'btn-active' : ''}`}
                onClick={() => handleDateRangeChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <select
            className="select select-bordered select-xs sm:select-sm w-auto"
            value={auditAction}
            onChange={(e) => handleActionChange(e.target.value)}
          >
            <option value="">All Actions</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            className="select select-bordered select-xs sm:select-sm w-auto"
            value={auditUserId}
            onChange={(e) => handleUserChange(e.target.value)}
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
            ))}
          </select>
          <div className="relative max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/40" />
            <input
              type="text"
              placeholder="Search logs..."
              className="input input-sm input-bordered w-full pl-7"
              value={auditSearch}
              onChange={(e) => handleAuditSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        {auditLogs.length > 0 ? (
          <div className="overflow-y-auto max-h-[320px]">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th className="hidden sm:table-cell">Description</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-xs whitespace-nowrap">
                      {new Date(log.performed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="text-xs truncate max-w-[100px]" title={log.profiles?.full_name || log.profiles?.email}>
                      {log.profiles?.full_name || log.profiles?.email || "\u2014"}
                    </td>
                    <td>
                      <span className={`badge badge-xs ${getAuditActionBadgeClass(log.action)}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell text-xs truncate max-w-[250px]" title={log.description}>
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-base-content/40 text-sm">
            {auditLoading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "No audit logs"
            )}
          </div>
        )}

        {/* Load more */}
        {auditHasMore && (
          <div className="text-center">
            <button
              className="btn btn-xs btn-ghost"
              onClick={handleLoadMore}
              disabled={auditLoading}
            >
              {auditLoading ? <span className="loading loading-spinner loading-xs" /> : "Load more"}
            </button>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
