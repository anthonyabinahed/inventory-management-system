"use client";

import { useState, useEffect } from "react";
import { Package, AlertTriangle, Clock } from "lucide-react";
import {
  getReagents,
  getLowStockReagents,
  getExpiredLotsCount,
  getExpiredLots
} from "@/actions/inventory";
import { AlertsPanel } from "@/components/AlertsPanel";
import { getExpiryStatus, getStockStatus } from "@/libs/constants";

export function Overview({ onNavigateToInventory }) {
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    expired: 0
  });
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const [reagentsResult, lowStockResult, expiredResult, expiredLotsResult] = await Promise.all([
        getReagents({ page: 1, limit: 1 }), // Just to get total count
        getLowStockReagents(),
        getExpiredLotsCount(),
        getExpiredLots()
      ]);

      setStats({
        totalItems: reagentsResult.pagination?.total || 0,
        lowStock: lowStockResult.data?.length || 0,
        expired: expiredResult.count || 0
      });

      // Build unified alerts array
      const alertItems = [];

      // Expiry alerts from lot-level data
      if (expiredLotsResult.success && expiredLotsResult.data) {
        for (const lot of expiredLotsResult.data) {
          const { status, daysUntil } = getExpiryStatus(lot.expiry_date);
          if (status === "expired" || status === "critical" || status === "warning") {
            const detail = status === "expired"
              ? `Expired ${Math.abs(daysUntil)} days ago`
              : `Expires in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`;
            alertItems.push({
              id: `expiry-${lot.id}`,
              type: status,
              severity: status === "warning" ? "warning" : "error",
              reagentName: lot.reagents?.name || "Unknown",
              detail: `${detail} (Lot: ${lot.lot_number})`,
              filter: { search: lot.reagents?.name || "" },
            });
          }
        }
      }

      // Stock alerts from low stock reagents data (already fetched for stat card)
      if (lowStockResult.success && lowStockResult.data) {
        for (const reagent of lowStockResult.data) {
          const { status } = getStockStatus(reagent.total_quantity, reagent.minimum_stock);
          if (status === "out" || status === "low") {
            alertItems.push({
              id: `stock-${reagent.id}`,
              type: status,
              severity: status === "out" ? "error" : "warning",
              reagentName: reagent.name,
              detail: `${reagent.total_quantity} / ${reagent.minimum_stock} ${reagent.unit}`,
              filter: { search: reagent.name },
            });
          }
        }
      }

      // Sort: errors first, then warnings
      alertItems.sort((a, b) => {
        const order = { error: 0, warning: 1 };
        return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
      });

      setAlerts(alertItems);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = (filter) => {
    if (onNavigateToInventory) {
      onNavigateToInventory(filter);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[250px] sm:min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Items Card */}
        <div
          className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleCardClick({})}
        >
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-base-content/60">Total Items</p>
                <p className="text-2xl font-bold">{stats.totalItems}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Card */}
        <div
          className="card bg-base-100 border-2 border-warning shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleCardClick({ lowStock: true })}
        >
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-warning/10">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-base-content/60">Low Stock</p>
                <p className="text-2xl font-bold">{stats.lowStock}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Expired Reagents Card */}
        <div
          className="card bg-base-100 border-2 border-error shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleCardClick({ hasExpiredLots: true })}
        >
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-error/10">
                <Clock className="w-6 h-6 text-error" />
              </div>
              <div>
                <p className="text-sm text-base-content/60">Expired Reagents</p>
                <p className="text-2xl font-bold">{stats.expired}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <AlertsPanel
        alerts={alerts}
        onAlertClick={handleCardClick}
      />
    </div>
  );
}
