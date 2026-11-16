// Territory request form rules: what a congregation can ask for, and the texts and checks the form shows.
// Kept apart from the form so they can be tested.
// What a congregation needs; any mix. The choices are sent at the start of the request details.
export const NEEDS = [
  { id: "cards", label: "Territory Cards", detail: "A Territory Map Card for each territory: the map with boundary roads named, landmarks, a QR code to Google Maps and the card-care note in your language." },
  { id: "map", label: "Full map", detail: "One high-resolution map of the whole congregation area with every territory number, ready to print large." },
  { id: "software", label: "Territory Management Software", detail: "Keep every territory, assign and return them, keep the S-13 record, share each card by link and collect reports from publishers." },
] as const;
export type Need = (typeof NEEDS)[number]["id"];
// Links from the territory landing page name a service; each preselects the needs it covers.
export const SERVICE_NEEDS: Record<string, Need[]> = { scratch: ["cards"], cards: ["cards"], package: ["cards", "map", "software"] };
// The making steps, in order. Congregations say which they have already finished.
export const STEPS = [
  "Drawing all territories",
  "Splitting them",
  "Naming each territory (locality name)",
  "Finding each territory's corners",
  "Assigning QR codes",
  "Making the cards in the shown format",
  "A high-resolution full map with all numbers",
];
// The starting point before every step: only the congregation boundary KML from Hub.
export const NOT_STARTED = "Just the KML file from Hub";
/** What the request says about progress: 0 is "not started", n is "done up to step n". */
export const progressLabel = (done: number) => (done ? `Done up to step ${done}: ${STEPS[done - 1] ?? ""}` : NOT_STARTED);
// What the area is like; any mix.
export const AREAS = ["City", "Hills or mountains", "Backwaters", "Villages and farmland", "Coast"];
export const territoryProblem = (needs: Need[], files: { length: number }) => {
  if (!needs.length) return "Tick at least one thing you need.";
  return files.length ? "" : "Add the KML file from JW Hub. Your congregation secretary can give it to you.";
};
/** The request details: labels in brackets first (the owner dashboard shows them as chips), then the free text. */
export const requestDetails = (needs: Need[], areas: string[], progress: number, text: string) =>
  `[Needs: ${NEEDS.filter((item) => needs.includes(item.id)).map((item) => item.label).join(", ")}] ${areas.length ? `[Area: ${areas.join(", ")}] ` : ""}[Now: ${progressLabel(progress)}] ${text}`.trim();
export const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const sectionState = (done: boolean, optional?: boolean) => {
  if (done) return "Done";
  return optional ? "Optional" : "To do";
};
export const submitLabel = (busy: boolean, toReview: boolean) => {
  if (busy) return "Sending…";
  return toReview ? "Review request" : "Send request";
};
export const progressText = (review: boolean, done: number, total: number) => {
  if (review) return "Check your request, then send it";
  return done === total ? "Ready to review" : `${done} of ${total} required answers`;
};
