// The boundary file sent with a territory request: one .kml file (from JW Hub), up to 5 MB. The same limits are enforced again by the server
// (submit_territory_request_with_files); checking here first gives the visitor a clear message before upload.
export const KIBIBYTE = 1024;
const MEBIBYTE = KIBIBYTE * KIBIBYTE;
const MAX_FILES = 1;
const EACH_MB = 5;
const TOTAL_MB = 5;
export const FILE_LIMITS = { count: MAX_FILES, each: EACH_MB * MEBIBYTE, total: TOTAL_MB * MEBIBYTE } as const;
export type RequestFile = { name: string; size: number; data: string };
const SNIFF = 4096;
const CHUNK = 0x8000;

const extension = (name: string) => /\.([a-z]+)$/i.exec(name)?.[1]?.toLowerCase();
const mb = (bytes: number) => `${(bytes / MEBIBYTE).toFixed(1)} MB`;

/** Why these bytes cannot be sent as `name`, or "" when they can. */
export function fileProblem(name: string, bytes: Uint8Array): string {
  const ext = extension(name);
  if (ext !== "kml") return `${name}: only a .kml file can be attached.`;
  if (!bytes.length) return `${name} is empty.`;
  if (bytes.length > FILE_LIMITS.each) return `${name} is ${mb(bytes.length)}. The file must be 5 MB or smaller.`;
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, SNIFF)).toLowerCase();
  return head.includes("<kml") ? "" : `${name} is not a KML file.`;
}

/** Problem with the whole set of files, or "". */
export function setProblem(files: { name: string; size: number }[]): string {
  if (files.length > FILE_LIMITS.count) return "Attach one KML file.";
  const names = new Set(files.map((f) => f.name.toLowerCase()));
  if (names.size < files.length) return "The same file is attached twice.";
  const total = files.reduce((sum, f) => sum + f.size, 0);
  return total > FILE_LIMITS.total ? `The files together are ${mb(total)}. Keep it to 5 MB or less.` : "";
}

/** Base64 in chunks: spreading megabytes into one fromCharCode call overflows the stack. */
export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binary);
}

export function fromBase64(data: string): Uint8Array<ArrayBuffer> {
  const binary = atob(data.replace(/\s/g, ""));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Reads a chosen file, checks it, and returns it ready to send; throws with a visitor-facing message. */
export async function readRequestFile(file: File): Promise<RequestFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const problem = fileProblem(file.name, bytes);
  if (problem) throw Error(problem);
  return { name: file.name, size: bytes.length, data: toBase64(bytes) };
}
