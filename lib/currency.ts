/**
 * Concourse — Currency Display Utilities
 * USD/KRW dual display for patient-facing screens.
 * Uses a static exchange rate until server-side API is connected.
 */

// Static rate — will be replaced with live API in Phase 3
const USD_TO_KRW = 1350;

/** Convert USD to KRW using static rate */
export function usdToKrw(usd: number): number {
  return Math.round(usd * USD_TO_KRW);
}

/** Format USD amount: "$1,234" */
export function formatUSD(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

/** Format KRW amount: "₩1,665,000" */
export function formatKRW(amount: number): string {
  return `₩${usdToKrw(amount).toLocaleString()}`;
}

/** Dual display string: "$1,234 (≈ ₩1,665,900)" */
export function formatDual(usd: number): string {
  return `${formatUSD(usd)} (≈ ${formatKRW(usd)})`;
}

/** Short dual: "$1,234 / ₩1.7M" */
export function formatDualCompact(usd: number): string {
  const krw = usdToKrw(usd);
  const krwStr = krw >= 1_000_000
    ? `₩${(krw / 1_000_000).toFixed(1)}M`
    : `₩${(krw / 1_000).toFixed(0)}K`;
  return `${formatUSD(usd)} / ${krwStr}`;
}
