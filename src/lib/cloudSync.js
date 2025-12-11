import { createSupabaseClient, getSupabaseClientId } from "@/integrations/supabase/client";

export const DEFAULT_SYNC_TABLE = "navinocode_states";

const createClientOrThrow = (config) => {
  const client = createSupabaseClient(config);
  if (!client) {
    throw new Error("缺少 Supabase URL 或 anon key");
  }
  return client;
};

export const pullCloudState = async (config, table = DEFAULT_SYNC_TABLE, syncId) => {
  const client = createClientOrThrow(config);
  const clientId = syncId || getSupabaseClientId();

  const { data, error } = await client
    .from(table)
    .select("data, updated_at")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    payload: data?.data || null,
    updatedAt: data?.updated_at || null,
  };
};

export const pushCloudState = async (
  config,
  payload,
  table = DEFAULT_SYNC_TABLE,
  syncId
) => {
  const client = createClientOrThrow(config);
  const clientId = syncId || getSupabaseClientId();

  const { error } = await client.from(table).upsert(
    {
      client_id: clientId,
      data: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" }
  );

  if (error) {
    throw error;
  }
};

export const hasSupabaseConfig = (config) =>
  Boolean(config?.url && config?.anonKey);
