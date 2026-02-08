"use client";

import { getExpiryStatus, getStockStatus } from "@/libs/constants";

export function ExpiryBadge({ expiryDate }) {
  if (!expiryDate) return null;

  const { status, daysUntil, color } = getExpiryStatus(expiryDate);
  const expiry = new Date(expiryDate);

  if (status === 'expired') {
    return <span className="badge badge-error badge-sm">Expired</span>;
  }

  if (status === 'critical') {
    return <span className="badge badge-error badge-sm">{daysUntil}d</span>;
  }

  if (status === 'warning') {
    return <span className="badge badge-warning badge-sm">{daysUntil}d</span>;
  }

  return (
    <span className="text-sm">
      {expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
    </span>
  );
}

export function StockBadge({ quantity, minimumStock }) {
  const { status } = getStockStatus(quantity, minimumStock);

  if (status === 'out') {
    return <span className="badge badge-error badge-sm whitespace-nowrap">Out of stock</span>;
  }

  if (status === 'low') {
    return (
      <span className="badge badge-warning badge-sm whitespace-nowrap">
        {quantity} <span className="opacity-60">/ {minimumStock}</span>
      </span>
    );
  }

  return <span className="text-sm">{quantity}</span>;
}
