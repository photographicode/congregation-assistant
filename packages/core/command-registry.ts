type CommandPermission =
  "admin" | "field_service" | "oclm" | "weekend" | "attendance";
type CommandMode = "read" | "write";
export type CommandDefinition = {
  name: string;
  mode: CommandMode;
  permission: CommandPermission;
  params: readonly string[];
  undo: boolean;
  examples: readonly string[];
};
export const commandRegistry = [
  {
    name: "publisher.edit",
    mode: "write",
    permission: "admin",
    params: ["publisher", "fields"],
    undo: true,
    examples: ["update Maria Thomas phone number"],
  },
  {
    name: "report.save",
    mode: "write",
    permission: "field_service",
    params: ["publisher", "period", "report"],
    undo: true,
    examples: ["add a report for Maria Thomas, September, 3 hours, 2 studies"],
  },
  {
    name: "report.revoke",
    mode: "write",
    permission: "field_service",
    params: ["publisher", "period"],
    undo: true,
    examples: ["revoke Maria Thomas report for September"],
  },
  {
    name: "attendance.save",
    mode: "write",
    permission: "attendance",
    params: ["date", "meetingType", "count"],
    undo: true,
    examples: ["record midweek attendance 85"],
  },
  {
    name: "assignment.save",
    mode: "write",
    permission: "oclm",
    params: ["week", "part", "publisher", "assistant", "reader"],
    undo: true,
    examples: ["assign Daniel to Bible reading this week"],
  },
  {
    name: "weekend.save",
    mode: "write",
    permission: "weekend",
    params: ["date", "speaker", "chairman", "reader"],
    undo: true,
    examples: ["assign Samuel as Watchtower reader"],
  },
  {
    name: "ap.revoke",
    mode: "write",
    permission: "field_service",
    params: ["publisher", "period"],
    undo: true,
    examples: ["revoke AP for Maria Thomas in September"],
  },
  {
    name: "pdf.s21",
    mode: "read",
    permission: "field_service",
    params: ["publisher", "serviceYear"],
    undo: false,
    examples: ["S-21 for Maria Thomas"],
  },
  {
    name: "pdf.export",
    mode: "read",
    permission: "admin",
    params: ["kind", "selection"],
    undo: false,
    examples: ["download all publisher S-21 records"],
  },
  {
    name: "link.create",
    mode: "read",
    permission: "admin",
    params: ["kind", "group", "publisher"],
    undo: false,
    examples: ["create the North group report link"],
  },
] as const satisfies readonly CommandDefinition[];
export function canRunCommand(
  command: CommandDefinition,
  roles: readonly string[],
) {
  return roles.includes("admin") || roles.includes(command.permission);
}
