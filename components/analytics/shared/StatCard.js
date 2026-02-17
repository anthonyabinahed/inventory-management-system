"use client";

export function StatCard({ icon: Icon, label, value, subtitle, borderColor, bgColor, textColor }) {
  return (
    <div className={`card bg-base-100 shadow-sm ${borderColor ? `border-2 ${borderColor}` : 'border border-base-300'}`}>
      <div className="card-body p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${bgColor || 'bg-primary/10'}`}>
            <Icon className={`size-5 ${textColor || 'text-primary'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-base-content/60 truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-base-content/50 truncate">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
