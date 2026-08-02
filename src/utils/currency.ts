// The catalog is priced and charged in Indian rupees. Amounts are stored as
// whole rupees (the `*Paise` column names are historical), so formatting is
// just Indian digit grouping — 2,05,000 rather than 205,000.
export function formatInr(value: number | null | undefined): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return '₹' + amount.toLocaleString('en-IN')
}
