export type MeetingDays = { midweek: number; weekend: number };
export function resolveMeetingType(
  date: Date,
  days: MeetingDays,
  timeZone: string,
) {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    name,
  );
  if (weekday === days.midweek) return "midweek" as const;
  if (weekday === days.weekend) return "weekend" as const;
  return null;
}
