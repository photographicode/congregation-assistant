/** "2026-10" reads as "October 2026"; anything else is shown unchanged. */
export function periodLabel(period: string): string {
  return /^\d{4}-\d{2}$/.test(period)
    ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(period + "-15T12:00:00"))
    : period;
}
/** Moves a "YYYY-MM" period by whole months: shiftPeriod("2026-01", -1) is "2025-12". */
const MONTHS_PER_YEAR = 12;
export function shiftPeriod(period: string, months: number): string {
  const [y = 0, m = 1] = period.split("-").map(Number), total = y * MONTHS_PER_YEAR + m - 1 + months;
  return `${Math.floor(total / MONTHS_PER_YEAR)}-${String((total % MONTHS_PER_YEAR) + 1).padStart(2, "0")}`;
}
