import { supabase } from './client';

/** Resolve an avatars-bucket storage path to a public URL. */
export function avatarPublicUrl(path: string | null | undefined): string | undefined {
  if (!path || !supabase) return undefined;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
