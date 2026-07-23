// send-push — delivers a push notification for a newly-created notifications row.
//
// Notifications are written server-side (triggers → create_notification), so the
// delivery trigger is a Supabase Database Webhook, not the client:
//
//   Dashboard → Database → Webhooks → Create:
//     table:   public.notifications
//     events:  INSERT
//     type:    HTTP Request → POST <project>/functions/v1/send-push
//     headers: x-webhook-secret: <SEND_PUSH_SECRET>
//
// Deploy:  supabase functions deploy send-push
// Secret:  supabase secrets set SEND_PUSH_SECRET=<random string>
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// The function reads the recipient's Expo push tokens (service role, bypassing
// RLS) and fans the message out to the Expo Push API. It never trusts a payload
// to name its own recipient tokens.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface NotificationRecord {
  id: string;
  recipient_id: string;
  type: string;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Push copy per notification type. `actor` is a display name. */
function buildMessage(type: string, actor: string, targetType: string | null): { title: string; body: string } {
  const noun = targetType === 'review' ? 'review' : targetType === 'list' ? 'list' : 'diary entry';
  switch (type) {
    case 'new_follower':
      return { title: 'New follower', body: `${actor} started following you` };
    case 'friend_request':
      return { title: 'Friend request', body: `${actor} sent you a friend request` };
    case 'friend_accepted':
      return { title: 'Friend accepted', body: `${actor} accepted your friend request` };
    case 'review_like':
      return { title: 'New like', body: `${actor} liked your review` };
    case 'list_like':
      return { title: 'New like', body: `${actor} liked your list` };
    case 'diary_like':
      return { title: 'New like', body: `${actor} liked your diary entry` };
    case 'comment':
      return { title: 'New comment', body: `${actor} commented on your ${noun}` };
    case 'comment_reply':
      return { title: 'New reply', body: `${actor} replied to your comment` };
    default:
      return { title: 'Video Club', body: `${actor} sent you a notification` };
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const secret = Deno.env.get('SEND_PUSH_SECRET');
  if (!secret) {
    return json(500, { error: 'SEND_PUSH_SECRET is not configured.' });
  }
  if (req.headers.get('x-webhook-secret') !== secret) {
    return json(401, { error: 'Unauthorized' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'Supabase service credentials are not available.' });
  }

  let record: NotificationRecord | undefined;
  try {
    const payload = await req.json();
    // Database Webhook shape: { type: 'INSERT', record: {...} }. Also accept a
    // bare notification object for manual invocation.
    record = payload?.record ?? payload;
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }
  if (!record?.recipient_id || !record?.type) {
    return json(200, { skipped: 'no recipient' });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const [{ data: tokens }, { data: actor }] = await Promise.all([
    admin.from('push_tokens').select('token').eq('user_id', record.recipient_id),
    record.actor_id
      ? admin.from('profiles').select('username, display_name').eq('id', record.actor_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!tokens || tokens.length === 0) {
    return json(200, { sent: 0, reason: 'no registered devices' });
  }

  const actorName =
    (actor?.display_name as string | null)?.trim() || (actor?.username as string | null) || 'Someone';
  const { title, body } = buildMessage(record.type, actorName, record.target_type);

  const messages = tokens.map((t: { token: string }) => ({
    to: t.token,
    title,
    body,
    sound: 'default',
    data: {
      notification_id: record!.id,
      type: record!.type,
      target_type: record!.target_type,
      target_id: record!.target_id,
    },
  }));

  // Expo accepts up to 100 messages per request.
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (res.ok) sent += chunk.length;
      else console.error('Expo push error:', res.status, await res.text());
    } catch (error) {
      console.error('Expo push request failed:', error instanceof Error ? error.message : error);
    }
  }

  return json(200, { sent });
});
