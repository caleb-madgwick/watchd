import * as ImagePicker from 'expo-image-picker';

import { requireSupabase } from '@/lib/supabase/client';
import type { NotificationPrefs, ProfileRow } from '@/types/database';

export interface ProfileUpdate {
  username?: string;
  display_name?: string | null;
  bio?: string | null;
  avatar_path?: string | null;
  favourite_genres?: number[];
  onboarding_completed?: boolean;
  notification_prefs?: NotificationPrefs;
}

export async function updateProfile(userId: string, update: ProfileUpdate): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('profiles').update(update).eq('id', userId);
  if (error) {
    if (error.code === '23505') {
      throw new Error('That username is already taken.');
    }
    throw new Error(error.message);
  }
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('is_username_available', { p_username: username });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function fetchProfileByUsername(username: string): Promise<ProfileRow | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Opens the system image picker and uploads the chosen image to the avatars
 * bucket under the caller's folder. Returns the new storage path, the previous
 * path's file is best-effort deleted.
 */
export async function pickAndUploadAvatar(
  userId: string,
  previousPath: string | null,
): Promise<string | null> {
  const supabase = requireSupabase();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const response = await fetch(asset.uri);
  const body = await response.arrayBuffer();
  if (body.byteLength > 5 * 1024 * 1024) {
    throw new Error('Please choose an image under 5 MB.');
  }

  const extension = asset.mimeType === 'image/png' ? 'png' : asset.mimeType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from('avatars').upload(path, body, {
    contentType: asset.mimeType ?? 'image/jpeg',
  });
  if (error) throw new Error(error.message);

  if (previousPath) {
    supabase.storage
      .from('avatars')
      .remove([previousPath])
      .catch(() => undefined);
  }

  return path;
}
