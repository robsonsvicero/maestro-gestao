import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PACKAGE_NAME = 'com.maeztrogestao.app';

const headers = {
  'content-type': 'application/json; charset=utf-8',
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers });

// ─── Google OAuth via Service Account (JWT) ─────────────────────────────────

async function getGoogleAccessToken(): Promise<string> {
  const raw = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
  if (!raw) throw new Error('Missing GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');

  const sa = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const unsignedToken = `${enc(header)}.${enc(claim)}`;

  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken),
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${unsignedToken}.${sig}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    throw new Error(`Google OAuth failed: ${tokenRes.status} ${errBody}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

// ─── Map Google subscription state → internal status ────────────────────────

function mapGoogleState(sub: Record<string, unknown>): {
  status: string;
  accessEndsAt: string | null;
  autoRenewing: boolean;
  canceledAt: string | null;
  revokedAt: string | null;
} {
  const subscriptionState = sub.subscriptionState as string | undefined;
  const lineItems = sub.lineItems as Array<Record<string, unknown>> | undefined;

  let expiryTimeIso: string | null = null;
  if (lineItems && lineItems.length > 0) {
    const firstItem = lineItems[0];
    const expiryTime = firstItem.expiryTime as string | undefined;
    if (expiryTime) {
      expiryTimeIso = new Date(expiryTime).toISOString();
    }
  }

  const autoRenewing = (sub.autoRenewing as boolean) ?? false;

  switch (subscriptionState) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
      return { status: 'active', accessEndsAt: expiryTimeIso, autoRenewing, canceledAt: null, revokedAt: null };
    case 'SUBSCRIPTION_STATE_CANCELED':
      return { status: 'canceled', accessEndsAt: expiryTimeIso, autoRenewing: false, canceledAt: new Date().toISOString(), revokedAt: null };
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return { status: 'grace_period', accessEndsAt: expiryTimeIso, autoRenewing, canceledAt: null, revokedAt: null };
    case 'SUBSCRIPTION_STATE_ON_HOLD':
      return { status: 'on_hold', accessEndsAt: expiryTimeIso, autoRenewing: false, canceledAt: null, revokedAt: null };
    case 'SUBSCRIPTION_STATE_PAUSED':
      return { status: 'on_hold', accessEndsAt: expiryTimeIso, autoRenewing: false, canceledAt: null, revokedAt: null };
    case 'SUBSCRIPTION_STATE_EXPIRED':
      return { status: 'expired', accessEndsAt: expiryTimeIso, autoRenewing: false, canceledAt: null, revokedAt: null };
    case 'SUBSCRIPTION_STATE_REVOKED':
      return { status: 'revoked', accessEndsAt: expiryTimeIso, autoRenewing: false, canceledAt: null, revokedAt: new Date().toISOString() };
    default:
      return { status: 'pending', accessEndsAt: expiryTimeIso, autoRenewing: false, canceledAt: null, revokedAt: null };
  }
}

// ─── Main handler ───────────────────────────────────────────────────────────
// This endpoint receives RTDN messages from Google Cloud Pub/Sub.
// The Pub/Sub push subscription sends a POST with a JSON body containing:
// {
//   "message": {
//     "data": "<base64 encoded>",
//     "messageId": "...",
//     ...
//   },
//   "subscription": "..."
// }
// The decoded "data" field contains a SubscriptionNotification or similar.

Deno.serve(async (request) => {
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return reply(500, { error: 'Server misconfigured' });

  // 1. Parse the Pub/Sub push message
  let pubsubBody: Record<string, unknown>;
  try {
    pubsubBody = await request.json();
  } catch {
    return reply(400, { error: 'Invalid JSON' });
  }

  const message = pubsubBody.message as Record<string, unknown> | undefined;
  if (!message || !message.data) {
    return reply(400, { error: 'Missing message.data' });
  }

  const messageId = message.messageId as string | undefined;
  if (!messageId) return reply(400, { error: 'Missing messageId' });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // 2. Idempotency check: has this messageId already been processed?
  const { data: existingEvent } = await admin
    .from('subscription_events')
    .select('id')
    .eq('message_id', messageId)
    .maybeSingle();

  if (existingEvent) {
    // Already processed, return success to avoid Pub/Sub retry
    return reply(200, { status: 'already_processed' });
  }

  // 3. Decode the base64 data
  let notificationPayload: Record<string, unknown>;
  try {
    const decoded = atob(message.data as string);
    notificationPayload = JSON.parse(decoded);
  } catch {
    return reply(400, { error: 'Could not decode message data' });
  }

  // 4. Extract subscription notification
  const subscriptionNotification = notificationPayload.subscriptionNotification as Record<string, unknown> | undefined;
  const packageName = notificationPayload.packageName as string | undefined;

  if (!subscriptionNotification) {
    // This might be a one-time product or test notification, log and acknowledge
    await admin.from('subscription_events').insert({
      provider: 'google_play',
      event_type: 'unknown_notification',
      message_id: messageId,
      payload: notificationPayload,
      processing_status: 'processed',
      processed_at: new Date().toISOString(),
    });
    return reply(200, { status: 'acknowledged_non_subscription' });
  }

  if (packageName && packageName !== PACKAGE_NAME) {
    return reply(200, { status: 'ignored_wrong_package' });
  }

  const purchaseToken = subscriptionNotification.purchaseToken as string | undefined;
  const notificationType = subscriptionNotification.notificationType as number | undefined;

  if (!purchaseToken) {
    return reply(400, { error: 'Missing purchaseToken in subscriptionNotification' });
  }

  // 5. Query Google Play Developer API for the full subscription state
  let googleSub: Record<string, unknown>;
  try {
    const accessToken = await getGoogleAccessToken();

    const url =
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${purchaseToken}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Google API ${res.status}: ${errBody}`);
    }

    googleSub = await res.json();
  } catch (err) {
    // Log the failed event and return 500 so Pub/Sub retries
    await admin.from('subscription_events').insert({
      provider: 'google_play',
      event_type: `rtdn_type_${notificationType}`,
      purchase_token: purchaseToken,
      message_id: messageId,
      payload: notificationPayload,
      processing_status: 'failed',
      processing_error: String(err),
    });
    console.error('RTDN Google API lookup failed:', err);
    return reply(500, { error: 'Google API lookup failed' });
  }

  // 6. Map Google state
  const mapped = mapGoogleState(googleSub);
  const now = new Date().toISOString();

  // 7. Find and update the entitlement by purchase_token
  const { data: entitlement } = await admin
    .from('entitlements')
    .select('id, auth_user_id')
    .eq('purchase_token', purchaseToken)
    .maybeSingle();

  if (entitlement) {
    const updatePayload: Record<string, unknown> = {
      status: mapped.status,
      access_ends_at: mapped.accessEndsAt,
      auto_renewing: mapped.autoRenewing,
      updated_at: now,
    };

    if (mapped.canceledAt) updatePayload.canceled_at = mapped.canceledAt;
    if (mapped.revokedAt) updatePayload.revoked_at = mapped.revokedAt;

    await admin
      .from('entitlements')
      .update(updatePayload)
      .eq('id', entitlement.id);
  }
  // If no entitlement found, the user hasn't verified yet — log the event anyway

  // 8. Log subscription event
  await admin.from('subscription_events').insert({
    auth_user_id: entitlement?.auth_user_id ?? null,
    provider: 'google_play',
    event_type: `rtdn_type_${notificationType}`,
    purchase_token: purchaseToken,
    product_id: (subscriptionNotification.subscriptionId as string) ?? null,
    message_id: messageId,
    payload: { rtdn: notificationPayload, google_sub: googleSub },
    processing_status: 'processed',
    processed_at: now,
  });

  // 9. Acknowledge to Pub/Sub
  return reply(200, { status: 'processed' });
});
