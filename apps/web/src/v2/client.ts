import { createClient } from "@supabase/supabase-js";
import publicConfig from "../../../../public-config.json";
export const config = publicConfig;
export const client = createClient(
  "https://ejosykrxjvwrhxfnputo.supabase.co",
  "sb_publishable_-WylxZpXTD06syk3LPGpWg_SfSf5K7C",
  {
    auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true },
  },
);
export const demo = new URLSearchParams(location.search).has("demo");
export async function rpc(name: string, args: Record<string, unknown> = {}) {
  if (demo) throw Error("The fictional demo never calls the cloud.");
  const { data, error } = await client.rpc(name, args);
  if (error) throw Error(error.message);
  return data;
}
export async function capabilities(cong: string) {
  try {
    return await rpc("ca_v2_capabilities", { p_cong_id: cong });
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
