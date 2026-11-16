import {validatePublicConfig} from '../../../../packages/core/config';
import {monitoredFetch} from '../system/network';
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import publicConfig from "../../../../public-config.json";
import {
  PlainStore,
  clearPlainAccount,
} from "../../../../packages/core/plain-store";
import { plainTransport } from "../../../../packages/core/plain-transport";
import type { Store, StoreEvent } from "../../../../packages/core/store";
import { handleError } from "../../../../packages/core/errors";

export const config = validatePublicConfig(publicConfig);
export const demo = new URLSearchParams(location.search).has("demo");
const sdk = createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
  global: {fetch:monitoredFetch},
  auth: {
    flowType: "pkce",
    persistSession: !demo,
    autoRefreshToken: !demo,
    detectSessionInUrl: !demo,
  },
});
// Screens may use the authentication API; data APIs belong to Store adapters.
export const client = { auth: sdk.auth };
// Full territory maps are files, not rows: owners upload them; workspace members get a short-lived download link.
// Plain Storage REST calls with the signed-in session, so the storage client stays out of the app bundle.
const MAP_BUCKET = "territory-maps", LINK_SECONDS = 600;
async function storageFetch(path: string, init: RequestInit) {
  const token = (await sdk.auth.getSession()).data.session?.access_token;
  if (!token) throw Error("Sign in again, then retry.");
  const response = await fetch(`${config.SUPABASE_URL}/storage/v1/${path}`, {
    ...init,
    headers: { ...init.headers, apikey: config.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string; error?: string; signedURL?: string };
  if (!response.ok) throw Error(body.message || body.error || `Storage error ${response.status}`);
  return body;
}
const objectPath = (path: string) => `${MAP_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
export const mapFiles = {
  async upload(path: string, file: File) {
    await storageFetch(`object/${objectPath(path)}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/pdf", "x-upsert": "true" },
      body: file,
    });
  },
  async link(path: string, name: string) {
    const { signedURL } = await storageFetch(`object/sign/${objectPath(path)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: LINK_SECONDS }),
    });
    if (!signedURL) throw Error("The download link could not be made.");
    return `${config.SUPABASE_URL}/storage/v1${signedURL}&download=${encodeURIComponent(name)}`;
  },
};
const transport = plainTransport(sdk),
  stores = new Map<string, Store>(),
  listeners = new Set<(event: StoreEvent) => void>();
let account = "";
export function storeFor(workspace: string, roles: string[] = []): Store {
  const key = JSON.stringify([account, workspace, [...roles].sort()]);
  const existing = stores.get(key);
  if (existing) return existing;
  const selected = new PlainStore({
    account: account || "public",
    workspace,
    authorization: [...roles].sort().join(",") || "transient",
    transport: demo
      ? {
          read: async () => {
            throw Error("The fictional demo never calls the cloud.");
          },
          write: async () => {
            throw Error("The fictional demo never calls the cloud.");
          },
        }
      : transport,
  });
  selected.subscribe((event) => {
    for (const listener of listeners) listener(event);
  });
  stores.set(key, selected);
  return selected;
}
export function subscribeStores(listener: (event: StoreEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
// Signing out clears this device, so send queued edits first and warn about any that remain.
export async function confirmSignOut(): Promise<boolean> {
  try { await syncStores(); } catch { /* whatever is left is counted below */ }
  let unsent = 0;
  try {
    for (const store of stores.values()) {
      const status = await store.status();
      unsent += status.pending + status.conflicts;
    }
  } catch { /* a closed store has nothing left to lose */ }
  if (!unsent) return true;
  const what = unsent === 1 ? "1 change has" : unsent + " changes have";
  return window.confirm(what + " not reached the server yet. Signing out deletes them from this device. Sign out anyway?");
}
export async function clearStores() {
  const previous = [...stores.values()],
    previousAccount = account;
  stores.clear();
  for (const store of previous) store.close();
  await Promise.all(previous.map((store) => store.clear()));
  if (previousAccount && !demo) await clearPlainAccount(previousAccount);
}
export function switchStoreAccount(next: string | null) {
  if (account === (next || "")) return;
  void clearStores().catch((error)=>{handleError(error,{scope:"features/client.ts",severity:'warning'});});
  account = next || "";
}
export async function syncStores() {
  await Promise.all([...stores.values()].map((store) => store.sync()));
}
export async function rpc(name: string, args: Record<string, unknown> = {}) {
  if (demo) throw Error("The fictional demo never calls the cloud.");
  // Unported RPC contracts are transient: no response or credential is mirrored.
  return storeFor(String(args.p_cong_id || "")).read(
    { source: { kind: "rpc", name, args } },
    z.any(),
  );
}
// Edge functions return { error } bodies in plain words; surface that text instead of the HTTP status.
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (demo) throw Error("The fictional demo never calls the cloud.");
  const { data, error } = await sdk.functions.invoke(name, { body });
  if (error) {
    const response = (error as { context?: Response }).context;
    const detail = response ? await response.clone().json().catch(() => null) : null;
    throw Error((detail as { error?: string } | null)?.error || "The server could not be reached. Try again.");
  }
  return data as T;
}
export async function capabilities(cong: string) {
  try {
    return await storeFor(cong).read(
      {
        source: {
          kind: "rpc",
          name: "ca_v2_capabilities",
          args: { p_cong_id: cong },
        },
        cacheKey: "capabilities",
        fresh: true,
      },
      z
        .object({
          schema_version: z.number(),
          groups: z.boolean(),
          weekend: z.boolean(),
          setup: z.boolean(),
          private: z.boolean(),
        })
        .passthrough(),
    );
  } catch {
    return {
      schema_version: 0,
      groups: false,
      weekend: false,
      setup: false,
      private: false,
      reason: "Database update required.",
    };
  }
}
