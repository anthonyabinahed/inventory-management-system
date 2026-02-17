"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Activity, Calendar, FileText, Clock, Search } from "lucide-react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { getActivityOverview, getLotLifecycleStats, getAuditLogs, getAuditLogCount } from "@/actions/analytics";
import { getAuditActionBadgeClass } from "@/libs/constants";
import { StatCard } from "./shared/StatCard";
import { ChartCard } from "./shared/ChartCard";
import { CHART_COLORS } from "./shared/chartColors";

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

export default function ActivityAuditDashboard() {
  const [data, setData] = useState(null);
  const [lifecycle, setLifecycle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Audit log state (independent from main dashboard data)
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditCount, setAuditCount] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditLoading, setAuditLoading] = useState(true);
  const debounceRef = useRef(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [activityRes, lifecycleRes, auditCountRes] = await Promise.all([
        getActivityOverview('30d'),
        getLotLifecycleStats(),
        getAuditLogCount(),
      ]);
      if (!activityRes.success) throw new Error(activityRes.errorMessage);
      if (!lifecycleRes.success) throw new Error(lifecycleRes.errorMessage);
      setData(activityRes.data);
      setLifecycle(lifecycleRes.data);
      if (auditCountRes.success) setAuditCount(auditCountRes.count);
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load audit logs independently
  const loadAuditLogs = useCallback(async (page, search, append = false) => {
    setAuditLoading(true);
    try {
      const res = await getAuditLogs({ page, limit: 20, search: search || undefined });
      if (res.success) {
        setAuditLogs(prev => append ? [...prev, ...res.data] : res.data);
        setAuditHasMore(res.pagination.hasMore);
        setAuditPage(page);
      }
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load initial audit logs
  useEffect(() => {
    loadAuditLogs(1, '');
  }, [loadAuditLogs]);

  // Debounced search
  const handleAuditSearch = useCallback((value) => {
    setAuditSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadAuditLogs(1, value);
    }, 300);
  }, [loadAuditLogs]);

  const handleLoadMore = useCallback(() => {
    loadAuditLogs(auditPage + 1, auditSearch, true);
  }, [auditPage, auditSearch, loadAuditLogs]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <p className="text-error text-sm">{error}</p>
        <button className="btn btn-sm btn-primary" onClick={loadData}>Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const { totalMovements, mostActiveDay, topUsers } = data;

  // Format most active day
  const mostActiveDayLabel = mostActiveDay
    ? `${new Date(mostActiveDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${mostActiveDay.in + mostActiveDay.out + mostActiveDay.adjustment + mostActiveDay.expired + mostActiveDay.damaged})`
    : "—";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Activity} label="Total Movements" value={totalMovements.toLocaleString()}
          subtitle="Last 30 days"
        />
        <StatCard
          icon={Calendar} label="Most Active Day" value={mostActiveDayLabel}
        />
        <StatCard
          icon={FileText} label="Audit Events" value={auditCount.toLocaleString()}
          subtitle="All system operations"
          bgColor="bg-info/10" textColor="text-info"
        />
        <StatCard
          icon={Clock} label="Avg Lot Lifespan"
          value={lifecycle?.avgDays != null ? `${lifecycle.avgDays}d` : "—"}
          subtitle={lifecycle?.count > 0 ? `Median: ${lifecycle.medianDays}d (${lifecycle.count} lots)` : "No depleted lots"}
        />
      </div>

      {/* Audit Logs (full width) */}
      <ChartCard title="Audit Logs" subtitle="All system operations">
        <div className="space-y-2">
          {/* Search input */}
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
                        {log.profiles?.full_name || log.profiles?.email || "—"}
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

      {/* Top Active Users (full width) */}
      <ChartCard title="Top Active Users">
        {topUsers.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topUsers} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [value, "Movements"]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              />
              <Bar dataKey="count" fill={CHART_COLORS.primary} name="Movements" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[280px] text-base-content/40 text-sm">
            No user data
          </div>
        )}
      </ChartCard>
    </div>
  );
}
