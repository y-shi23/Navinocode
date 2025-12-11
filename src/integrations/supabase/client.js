import { createClient } from "@supabase/supabase-js";

const STORAGE_KEY = "supabaseConfig";
const CLIENT_ID_STORAGE_KEY = "supabaseClientId";
const SYNC_ID_STORAGE_KEY = "supabaseSyncId";

export const getStoredSupabaseConfig = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { url: "", anonKey: "" };
    const parsed = JSON.parse(saved);
    return {
      url: parsed.url || "",
      anonKey: parsed.anonKey || "",
    };
  } catch (error) {
    console.error("Failed to read Supabase config from storage", error);
    return { url: "", anonKey: "" };
  }
};

export const persistSupabaseConfig = (config) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        url: config.url || "",
        anonKey: config.anonKey || "",
      })
    );
  } catch (error) {
    console.error("Failed to save Supabase config", error);
  }
};

export const getSupabaseClientId = () => {
  try {
    const existing = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, fresh);
    return fresh;
  } catch (error) {
    console.error("Failed to read/create Supabase client id", error);
    return "navinocode-local";
  }
};

export const getStoredSyncId = () => {
  try {
    const saved = localStorage.getItem(SYNC_ID_STORAGE_KEY);
    return saved || getSupabaseClientId();
  } catch (error) {
    console.error("Failed to read sync id", error);
    return getSupabaseClientId();
  }
};

export const persistSyncId = (syncId) => {
  try {
    localStorage.setItem(SYNC_ID_STORAGE_KEY, syncId || "");
  } catch (error) {
    console.error("Failed to save sync id", error);
  }
};

export const createSupabaseClient = (config) => {
  if (!config?.url || !config?.anonKey) return null;
  return createClient(config.url, config.anonKey);
};
