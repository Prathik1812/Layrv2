import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

let _supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseServerClient() {
  if (!_supabaseClient && ENV.supabaseUrl && (ENV.supabaseServiceKey || ENV.supabaseAnonKey)) {
    try {
      _supabaseClient = createClient(
        ENV.supabaseUrl,
        ENV.supabaseServiceKey || ENV.supabaseAnonKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );
    } catch (error) {
      console.warn("[Supabase] Failed to initialize Supabase server client:", error);
      _supabaseClient = null;
    }
  }
  return _supabaseClient;
}

export async function uploadToSupabaseStorage(bucket: string, path: string, fileBuffer: Buffer, mimeType: string) {
  const client = getSupabaseServerClient();
  if (!client) return null;

  const { data, error } = await client.storage.from(bucket).upload(path, fileBuffer, {
    contentType: mimeType,
    upsert: true,
  });

  if (error) {
    console.error("[Supabase Storage] Upload error:", error);
    throw error;
  }

  const { data: publicUrlData } = client.storage.from(bucket).getPublicUrl(path);
  return { path: data.path, publicUrl: publicUrlData.publicUrl };
}
