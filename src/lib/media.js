import { FALLBACK_IMAGE, MEDIA_BUCKET } from './constants';
import { supabase } from './supabase';

export async function uploadMedia(file) {
  if (!file) return '';

  const ext = file.name.split('.').pop();
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    upsert: false,
  });

  if (error) throw error;

  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function imageOrFallback(url) {
  return url || FALLBACK_IMAGE;
}
