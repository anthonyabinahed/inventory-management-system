"use client";

import { AlertTriangle, Clock, PackageX, TrendingDown } from "lucide-react";

const ALERT_CONFIG = {
  expired:  { icon: Clock,         label: "Expired",       borderColor: "border-error",   bgColor: "bg-error/10",   textColor: "text-error" },
  critical: { icon: Clock,         label: "Expiring Soon", borderColor: "border-error",   bgColor: "bg-error/10",   textColor: "text-error" },
  warning:  { icon: AlertTriangle, label: "Expiring Soon", borderColor: "border-warning", bgColor: "bg-warning/10", textColor: "text-warning" },
  out:      { icon: PackageX,      label: "Out of Stock",  borderColor: "border-error",   bgColor: "bg-error/10",   textColor: "text-error" },
  low:      { icon: TrendingDown,  label: "Low Stock",     borderColor: "border-warning", bgColor: "bg-warning/10", textColor: "text-warning" },
};

export function AlertsPanel({ alerts, onAlertClick }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body py-8 text-center">
          <p className="text-base-content/60">No active alerts. All items are within normal parameters.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-base-content/70 mb-3">
        Active Alerts ({alerts.length})
      </h3>
        <div className="flex flex-col gap-3 max-h-[28rem] overflow-y-auto pr-1 pb-6">
          {alerts.map((alert) => {
            const config = ALERT_CONFIG[alert.type];
            const Icon = config.icon;
            return (
              <div
                key={alert.id}
                className={`card bg-base-100 border-2 ${config.borderColor} shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                onClick={() => onAlertClick(alert.filter)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onAlertClick(alert.filter);
                  }
                }}
              >
                <div className="card-body p-4 flex-row items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.bgColor} shrink-0`}>
                    <Icon className={`w-4 h-4 ${config.textColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" title={alert.reagentName}>
                      {alert.reagentName}
                    </p>
                    <p className="text-xs text-base-content/60">{alert.detail}</p>
                  </div>
                  <span className={`text-xs font-semibold ${config.textColor} shrink-0`}>
                    {config.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
  );
}
