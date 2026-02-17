"use client";

export function ChartCard({ title, subtitle, actions, children, className }) {
  return (
    <div className={`card bg-base-100 border border-base-300 shadow-sm ${className || ''}`}>
      <div className="card-body p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            {subtitle && <p className="text-xs text-base-content/60">{subtitle}</p>}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
