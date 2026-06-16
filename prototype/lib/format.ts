// Display formatting helpers. USD-only prototype.

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usd2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** $1,234 — whole dollars (use for KPIs and totals). */
export const formatCurrency = (n: number) => usd0.format(n);

/** $12.34 — cents (use for unit prices). */
export const formatCurrencyCents = (n: number) => usd2.format(n);

/** 44.3% */
export const formatPercent = (n: number, digits = 1) =>
  `${(n * 100).toFixed(digits)}%`;

/** 1,234 */
export const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-US").format(n);

/** Jun 16, 2026 */
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/** Jun 2026 */
export const formatMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });

/** Two-letter initials from a name. */
export const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
