export const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
export const groupKey = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
export function phoneE164(value, country = "IN") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  let n = raw.replace(/[\s().-]/g, "");
  if (n.startsWith("00")) n = "+" + n.slice(2);
  if (!n.startsWith("+")) {
    const prefixes = { IN: "91", US: "1", GB: "44", AU: "61", CA: "1" };
    const prefix = prefixes[country];
    if (!prefix) throw Error("Include the country code, starting with +.");
    n = "+" + prefix + n.replace(/^0/, "");
  }
  if (!/^\+[1-9]\d{7,14}$/.test(n))
    throw Error("Use a valid phone number with country code.");
  return n;
}
export function parseDelimited(text) {
  text = String(text).replace(/^\uFEFF/, "");
  const delimiter = text.split(/\r?\n/, 1)[0].includes("\t") ? "\t" : ",";
  const rows = [];
  let row = [],
    value = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === delimiter && !quoted) {
      row.push(value);
      value = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      value = "";
    } else value += c;
  }
  if (quoted) throw Error("Unclosed quotation mark.");
  row.push(value);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export function parseVCard(text) {
  return String(text)
    .split(/BEGIN:VCARD/i)
    .slice(1)
    .map((card) => {
      const lines = card.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
      const get = (name) => {
        const line = lines.find((x) =>
          new RegExp("^" + name + "(?:;[^:]*)?:", "i").test(x),
        );
        return line
          ? line
              .slice(line.indexOf(":") + 1)
              .replace(/\\n/gi, " ")
              .replace(/\\([,;\\])/g, "$1")
          : "";
      };
      return {
        name: get("FN"),
        phone: get("TEL"),
        email: normalizeEmail(get("EMAIL")),
        group: "",
        address: get("ADR").replace(/;/g, " "),
      };
    });
}
const aliases = {
  name: ["name", "fullname", "publishername"],
  email: ["email", "emailaddress", "signinemail"],
  phone: ["phone", "mobile", "telephone", "phonenumber"],
  group: ["group", "servicegroup"],
  address: ["address", "homeaddress"],
};
export function mapImport(rows) {
  if (!rows.length) return [];
  const header = rows[0].map((v) => v.toLowerCase().replace(/[^a-z]/g, ""));
  const mapped = Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => [
      key,
      header.findIndex((v) => names.includes(v)),
    ]),
  );
  const first = header.indexOf("firstname"),
    last = header.indexOf("lastname");
  return rows.slice(1).map((row) => {
    const result = Object.fromEntries(
      Object.entries(mapped).map(([key, index]) => [
        key,
        index < 0 ? "" : row[index] || "",
      ]),
    );
    if (!result.name && first >= 0)
      result.name = [row[first], last >= 0 ? row[last] : ""]
        .filter(Boolean)
        .join(" ");
    result.email = normalizeEmail(result.email);
    return result;
  });
}
export function reviewImport(rows, groups, people = [], country = "IN") {
  const seen = new Set();
  return rows.map((person, index) => {
    const issues = [];
    if (!person.name.trim()) issues.push("Name required");
    if (person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email))
      issues.push("Invalid email");
    let phone = person.phone;
    try {
      phone = phoneE164(phone, country);
    } catch {
      issues.push("Invalid phone");
    }
    if (
      person.group &&
      !groups.some((g) => groupKey(g.name) === groupKey(person.group))
    )
      issues.push("Choose an existing group");
    const key = groupKey(person.name);
    if (seen.has(key) || people.some((p) => groupKey(p.name) === key))
      issues.push("Possible duplicate person");
    seen.add(key);
    return { ...person, phone, index, issues, include: issues.length === 0 };
  });
}
export const weekendDefaults = (week) => ({
  week,
  chairman: "",
  openingSong: 1,
  talkTitle: "",
  outline: "",
  speaker: "",
  speakerCongregation: "",
  conductor: "",
  reader: "",
  closingSong: 1,
  prayer: "",
  exception: "normal",
  meetingTime: "10:00",
  articleTitle: "Not published yet",
  studyRange: "",
  notes: "",
  duties: [],
  revision: 0,
});
export function assignmentConflicts(week, away = []) {
  const slots = ["chairman", "speaker", "conductor", "reader", "prayer"];
  const warnings = [];
  const used = new Map();
  for (const slot of slots) {
    const person = week[slot];
    if (!person) continue;
    if (used.has(person))
      warnings.push(
        `${person} is assigned to ${used.get(person)} and ${slot}. Review the timing.`,
      );
    else used.set(person, slot);
    if (
      away.some(
        (x) => x.name === person && x.from <= week.week && x.to >= week.week,
      )
    )
      warnings.push(`${person} is away this week.`);
  }
  return warnings;
}
export function formatMessage(template, values) {
  return String(template).replace(/\{(name|part|date|link)\}/g, (_, key) =>
    String(values[key] || ""),
  );
}
export const whatsappURL = (phone, message) =>
  "https://wa.me/" +
  phoneE164(phone).slice(1) +
  "?text=" +
  encodeURIComponent(message);
export function aad(meta) {
  const keys = [
    "cong_id",
    "scope",
    "kind",
    "record_id",
    "epoch",
    "revision",
    "schema_version",
  ];
  for (const k of keys) if (meta[k] === undefined) throw Error("Missing " + k);
  return JSON.stringify(keys.map((k) => meta[k]));
}
