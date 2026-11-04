/** "2026-10" reads as "October 2026"; anything else is shown unchanged. */
export function periodLabel(period: string): string {
  return /^\d{4}-\d{2}$/.test(period)
    ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(period + "-15T12:00:00"))
    : period;
}
