"use client";

import { useState, useEffect } from "react";
import { Package, MapPin, Monitor, Layers } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { getInventoryComposition } from "@/actions/analytics";
import { StatCard } from "./shared/StatCard";
import { ChartCard } from "./shared/ChartCard";
import { CHART_COLORS, CATEGORY_COLORS } from "./shared/chartColors";

const CATEGORY_LABELS = {
  reagent: "Reagent",
  control: "Control",
  calibrator: "Calibrator",
  consumable: "Consumable",
  solution: "Solution",
};

export default function InventoryCompositionDashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pieMode, setPieMode] = useState("count"); // "count" or "quantity"
  const [breakdownView, setBreakdownView] = useState("sector"); // "sector" or "machine"

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getInventoryComposition();
      if (!result.success) throw new Error(result.errorMessage);
      setData(result.data);
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

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

  const { totalItems, totalQuantity, categoryDistribution,
    stockCoverage, sectorBreakdown, storageUtilization, machineDependency } = data;

  // Prepare pie chart data
  const pieData = categoryDistribution.map(c => ({
    name: CATEGORY_LABELS[c.category] || c.category,
    value: pieMode === "count" ? c.count : c.totalQty,
    color: CATEGORY_COLORS[c.category] || CHART_COLORS.primary,
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Package} label="Total Items" value={totalItems} />
        <StatCard icon={Layers} label="Total Quantity" value={totalQuantity.toLocaleString()} />
        <StatCard icon={MapPin} label="Storage Locations" value={storageUtilization.length} />
        <StatCard icon={Monitor} label="Machines" value={machineDependency.length} />
      </div>

      {/* Category Distribution + Stock Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Items by Category"
          subtitle={pieMode === "count" ? "Number of distinct items per category" : "Total stock units per category"}
          actions={
            <div className="join">
              <button
                className={`join-item btn btn-xs ${pieMode === "count" ? "btn-active" : ""}`}
                onClick={() => setPieMode("count")}
              >
                Items
              </button>
              <button
                className={`join-item btn btn-xs ${pieMode === "quantity" ? "btn-active" : ""}`}
                onClick={() => setPieMode("quantity")}
              >
                Stock Units
              </button>
            </div>
          }
        >
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => value.toLocaleString()}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-base-content/40 text-sm">
              No items found
            </div>
          )}
        </ChartCard>

        <ChartCard title="Stock Coverage" subtitle="Items by stock status relative to minimum threshold">
          <div className="space-y-5 py-2">
            {[
              { label: "Above Minimum", count: stockCoverage.aboveMinimum, color: "progress-success", bg: "text-success" },
              { label: "Below Minimum", count: stockCoverage.belowMinimum, color: "progress-warning", bg: "text-warning" },
              { label: "Out of Stock", count: stockCoverage.outOfStock, color: "progress-error", bg: "text-error" },
            ].map((item) => {
              const pct = totalItems > 0 ? (item.count / totalItems) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className={`text-sm font-bold ${item.bg}`}>
                      {item.count} <span className="font-normal text-xs text-base-content/50">({Math.round(pct)}%)</span>
                    </span>
                  </div>
                  <progress
                    className={`progress ${item.color} w-full h-2.5`}
                    value={pct}
                    max="100"
                  />
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* Sector/Machine Breakdown + Storage Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title={`${breakdownView === 'sector' ? 'Sector' : 'Machine'} Breakdown`}
          subtitle={`Total items vs alerts per ${breakdownView}`}
          actions={
            <div className="join">
              <button
                className={`join-item btn btn-xs ${breakdownView === 'sector' ? 'btn-active' : ''}`}
                onClick={() => setBreakdownView('sector')}
              >
                Sector
              </button>
              <button
                className={`join-item btn btn-xs ${breakdownView === 'machine' ? 'btn-active' : ''}`}
                onClick={() => setBreakdownView('machine')}
              >
                Machine
              </button>
            </div>
          }
        >
          {breakdownView === 'sector' ? (
            sectorBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, sectorBreakdown.length * 50)}>
                <BarChart data={sectorBreakdown} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="sector" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="totalItems" fill={CHART_COLORS.primary} name="Total Items" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="alertItems" fill={CHART_COLORS.error} name="Alert Items" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-base-content/40 text-sm">
                No sector data
              </div>
            )
          ) : (
            machineDependency.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, machineDependency.length * 50)}>
                <BarChart data={machineDependency} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="machine" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="totalItems" fill={CHART_COLORS.primary} name="Total Items" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="alertItems" fill={CHART_COLORS.error} name="Alert Items" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-base-content/40 text-sm">
                No machine data
              </div>
            )
          )}
        </ChartCard>

        {storageUtilization.length > 0 && (
          <ChartCard title="Storage Utilization" subtitle="Items per storage location">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={storageUtilization} margin={{ left: 0, right: 10 }}>
                <XAxis dataKey="location" tick={false} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill={CHART_COLORS.info} name="Items" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  );
}
