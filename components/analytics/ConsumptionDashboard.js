"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend
} from "recharts";
import {
  getMovementTrends, getTopConsumedItems, getSectorConsumption, getMachineConsumption
} from "@/actions/analytics";
import { getFilterOptions } from "@/actions/inventory";
import { StatCard } from "./shared/StatCard";
import { ChartCard } from "./shared/ChartCard";
import { DateRangeFilter } from "./shared/DateRangeFilter";
import { CHART_COLORS, CATEGORY_COLORS } from "./shared/chartColors";

export default function ConsumptionDashboard() {
  const [dateRange, setDateRange] = useState('30d');
  const [sector, setSector] = useState('');
  const [machine, setMachine] = useState('');
  const [sectors, setSectors] = useState([]);
  const [machines, setMachines] = useState([]);
  const [trends, setTrends] = useState(null);
  const [topConsumed, setTopConsumed] = useState([]);
  const [sectorData, setSectorData] = useState([]);
  const [machineData, setMachineData] = useState([]);
  const [consumptionView, setConsumptionView] = useState('sector');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load filter options once
  useEffect(() => {
    getFilterOptions().then(res => {
      if (res.success) {
        setSectors(res.data?.sectors || []);
        setMachines(res.data?.machines || []);
      }
    });
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [trendsRes, topRes, sectorRes, machineRes] = await Promise.all([
        getMovementTrends(dateRange, sector || null, machine || null),
        getTopConsumedItems(dateRange, 10),
        getSectorConsumption(dateRange),
        getMachineConsumption(dateRange),
      ]);
      if (!trendsRes.success) throw new Error(trendsRes.errorMessage);
      if (!topRes.success) throw new Error(topRes.errorMessage);
      if (!sectorRes.success) throw new Error(sectorRes.errorMessage);
      if (!machineRes.success) throw new Error(machineRes.errorMessage);

      setTrends(trendsRes.data);
      setTopConsumed(topRes.data);
      setSectorData(sectorRes.data);
      setMachineData(machineRes.data);
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, sector, machine]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  if (!trends) return null;

  const { trends: trendData, totalIn, totalOut } = trends;
  const netChange = totalIn - totalOut;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          icon={TrendingUp} label="Stock In" value={totalIn.toLocaleString()}
          subtitle={`Units received (${dateRange})`}
          bgColor="bg-success/10" textColor="text-success"
        />
        <StatCard
          icon={TrendingDown} label="Stock Out" value={totalOut.toLocaleString()}
          subtitle={`Units consumed (${dateRange})`}
          bgColor="bg-primary/10" textColor="text-primary"
        />
        <StatCard
          icon={ArrowUpDown} label="Net Change"
          value={`${netChange >= 0 ? "+" : ""}${netChange.toLocaleString()}`}
          subtitle="In minus out"
          bgColor={netChange >= 0 ? "bg-success/10" : "bg-error/10"}
          textColor={netChange >= 0 ? "text-success" : "text-error"}
        />
      </div>

      {/* Movement Trend */}
      <ChartCard
        title="Movement Trend"
        subtitle="Stock in vs stock out over time"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            <select
              className="select select-bordered select-xs sm:select-sm w-auto"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            >
              <option value="">All Sectors</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              className="select select-bordered select-xs sm:select-sm w-auto"
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
            >
              <option value="">All Machines</option>
              {machines.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        }
      >
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trendData} margin={{ left: 0, right: 10 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="in" fill={CHART_COLORS.success} name="Stock In" radius={[4, 4, 0, 0]} />
              <Bar dataKey="out" fill={CHART_COLORS.primary} name="Stock Out" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[280px] text-base-content/40 text-sm">
            No movements in this period
          </div>
        )}
      </ChartCard>

      {/* Top Consumed + Consumption Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top Consumed Items" subtitle={`By stock-out quantity (${dateRange})`}>
          {topConsumed.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, topConsumed.length * 36)}>
              <BarChart data={topConsumed} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value) => [value.toLocaleString(), "Units"]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                />
                <Bar dataKey="totalOut" name="Consumed" radius={[0, 4, 4, 0]}>
                  {topConsumed.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.category] || CHART_COLORS.primary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-base-content/40 text-sm">
              No consumption data
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={`Consumption by ${consumptionView === 'sector' ? 'Sector' : 'Machine'}`}
          subtitle={`Total stock-out (${dateRange})`}
          actions={
            <div className="join">
              <button
                className={`join-item btn btn-xs ${consumptionView === 'sector' ? 'btn-active' : ''}`}
                onClick={() => setConsumptionView('sector')}
              >
                Sector
              </button>
              <button
                className={`join-item btn btn-xs ${consumptionView === 'machine' ? 'btn-active' : ''}`}
                onClick={() => setConsumptionView('machine')}
              >
                Machine
              </button>
            </div>
          }
        >
          {(() => {
            const chartConfig = consumptionView === 'sector'
              ? { data: sectorData, dataKey: 'sector', fill: CHART_COLORS.primary, emptyMsg: 'No sector data' }
              : { data: machineData, dataKey: 'machine', fill: CHART_COLORS.success, emptyMsg: 'No machine data' };
            return chartConfig.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, chartConfig.data.length * 44)}>
                <BarChart data={chartConfig.data} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey={chartConfig.dataKey} width={130} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [value.toLocaleString(), "Units"]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  />
                  <Bar dataKey="totalOut" fill={chartConfig.fill} name="Units Consumed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-base-content/40 text-sm">
                {chartConfig.emptyMsg}
              </div>
            );
          })()}
        </ChartCard>
      </div>
    </div>
  );
}
