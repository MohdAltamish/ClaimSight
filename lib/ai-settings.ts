import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SETTING_KEY = "gemini_api_key";
const ENCRYPTION_VERSION = "v1";

type StoredSetting = { encrypted_value: string; updated_at: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

export type GeminiSettingsStatus = {
  provider: "gemini";
  model: "gemini-2.5-flash";
  configured: boolean;
  storageReady: boolean;
  updatedAt: string | null;
  message?: string;
};

function encryptionKey() {
  const encoded = process.env.CLAIMSIGHT_CONFIG_ENCRYPTION_KEY;
  if (!encoded) throw new Error("Secure Gemini key storage is not configured. Set CLAIMSIGHT_CONFIG_ENCRYPTION_KEY.");
  const key = Buffer.from(encoded, "base64url");
  if (key.length !== 32) throw new Error("CLAIMSIGHT_CONFIG_ENCRYPTION_KEY must be a base64url-encoded 32-byte key.");
  return key;
}

function secureStorageError() {
  if (!supabase) return "Secure Gemini key storage needs Supabase server credentials.";
  try {
    encryptionKey();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Secure Gemini key storage is not configured.";
  }
}

export function encryptSecret(value: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [ENCRYPTION_VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(encryptedValue: string, key: Buffer) {
  const [version, ivValue, tagValue, ciphertextValue, ...extra] = encryptedValue.split(".");
  if (version !== ENCRYPTION_VERSION || !ivValue || !tagValue || !ciphertextValue || extra.length) {
    throw new Error("The stored Gemini key is invalid.");
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("The stored Gemini key could not be decrypted.");
  }
}

export async function getGeminiSettingsStatus(): Promise<GeminiSettingsStatus> {
  const configurationError = secureStorageError();
  if (configurationError || !supabase) {
    return {
      provider: "gemini",
      model: "gemini-2.5-flash",
      configured: false,
      storageReady: false,
      updatedAt: null,
      message: configurationError ?? "Secure Gemini key storage is not configured."
    };
  }

  const { data, error } = await supabase
    .from("app_settings")
    .select("encrypted_value, updated_at")
    .eq("setting_key", SETTING_KEY)
    .maybeSingle<StoredSetting>();
  if (error) {
    return {
      provider: "gemini",
      model: "gemini-2.5-flash",
      configured: false,
      storageReady: false,
      updatedAt: null,
      message: "Secure Gemini key storage is unavailable."
    };
  }

  if (data?.encrypted_value) {
    try {
      decryptSecret(data.encrypted_value, encryptionKey());
    } catch {
      return {
        provider: "gemini",
        model: "gemini-2.5-flash",
        configured: false,
        storageReady: true,
        updatedAt: data.updated_at,
        message: "The stored Gemini key is unavailable. Save a replacement key to restore live analysis."
      };
    }
  }

  return {
    provider: "gemini",
    model: "gemini-2.5-flash",
    configured: Boolean(data?.encrypted_value),
    storageReady: true,
    updatedAt: data?.updated_at ?? null
  };
}

export async function getGeminiApiKey() {
  // Support direct env var as a simple fallback (no Supabase/encryption needed)
  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (envKey) return envKey;

  const configurationError = secureStorageError();
  if (configurationError || !supabase) {
    throw new Error("Live Gemini analysis is not configured. Set GEMINI_API_KEY in your environment, or configure secure Supabase key storage.");
  }

  const { data, error } = await supabase
    .from("app_settings")
    .select("encrypted_value")
    .eq("setting_key", SETTING_KEY)
    .maybeSingle<Pick<StoredSetting, "encrypted_value">>();
  if (error || !data?.encrypted_value) {
    throw new Error("Live Gemini analysis is not configured. Set GEMINI_API_KEY in your environment, or save a key via the admin panel.");
  }
  return decryptSecret(data.encrypted_value, encryptionKey());
}

export async function hasGeminiKey() {
  try {
    await getGeminiApiKey();
    return true;
  } catch {
    return false;
  }
}

export async function saveGeminiApiKey(apiKey: string) {
  const configurationError = secureStorageError();
  if (configurationError || !supabase) throw new Error(configurationError ?? "Secure Gemini key storage is unavailable.");
  const { error } = await supabase.from("app_settings").upsert({
    setting_key: SETTING_KEY,
    encrypted_value: encryptSecret(apiKey, encryptionKey()),
    updated_at: new Date().toISOString()
  }, { onConflict: "setting_key" });
  if (error) throw new Error("Could not save the Gemini API key.");
}
