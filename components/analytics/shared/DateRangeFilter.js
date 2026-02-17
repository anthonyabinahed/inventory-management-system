"use client";

const OPTIONS = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '6m', label: '6m' },
];

export function DateRangeFilter({ value, onChange }) {
  return (
    <div className="join">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`join-item btn btn-xs sm:btn-sm ${value === opt.value ? 'btn-active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
