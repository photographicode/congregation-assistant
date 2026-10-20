export type AssignmentRecency = {
  weeks: number | null;
  label: string;
  exact: string | null;
};
function day(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
export function assignmentRecency(
  last: Date | string | null | undefined,
  now: Date | string = new Date(),
): AssignmentRecency {
  if (!last) return { weeks: null, label: "Never", exact: null };
  const parsed = last instanceof Date ? last : new Date(last);
  if (!Number.isFinite(parsed.getTime()))
    return { weeks: null, label: "Never", exact: null };
  const weeks = Math.max(0, Math.floor((day(now) - day(parsed)) / 604800000));
  return {
    weeks,
    label:
      weeks === 0
        ? "This week"
        : weeks === 1
          ? "Last week"
          : weeks + " weeks ago",
    exact: parsed.toISOString().slice(0, 10),
  };
}
export function compareAssignmentRecency(
  a: Date | string | null | undefined,
  b: Date | string | null | undefined,
  now: Date | string = new Date(),
) {
  const first = assignmentRecency(a, now).weeks,
    second = assignmentRecency(b, now).weeks;
  return (
    (second ?? Number.MAX_SAFE_INTEGER) - (first ?? Number.MAX_SAFE_INTEGER)
  );
}
