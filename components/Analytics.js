"use client";

import { useState } from "react";
import { TrendingDown, PieChart, Activity } from "lucide-react";
import ConsumptionDashboard from "./analytics/ConsumptionDashboard";
import InventoryCompositionDashboard from "./analytics/InventoryCompositionDashboard";
import ActivityAuditDashboard from "./analytics/ActivityAuditDashboard";

const DASHBOARDS = [
  { id: "consumption", title: "Consumption", icon: TrendingDown },
  { id: "inventory", title: "Inventory", icon: PieChart },
  { id: "activity", title: "Activity", icon: Activity },
];

export function Analytics() {
  const [active, setActive] = useState(DASHBOARDS[0].id);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Dashboard selector */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {DASHBOARDS.map((d) => {
          const Icon = d.icon;
          return (
            <button
              key={d.id}
              className={`btn btn-sm ${active === d.id ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActive(d.id)}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{d.title}</span>
            </button>
          );
        })}
      </div>

      {/* Dashboard content */}
      <div className="animate-opacity" key={active}>
        {active === "consumption" && <ConsumptionDashboard />}
        {active === "inventory" && <InventoryCompositionDashboard />}
        {active === "activity" && <ActivityAuditDashboard />}
      </div>
    </div>
  );
}
