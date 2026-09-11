import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PACKAGE_NAME = 'com.maeztrogestao.app';

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
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

  // Import private key and sign
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

// ─── Fetch subscription details from Google Play Developer API ──────────────

interface GoogleSubscriptionResource {
  expiryTimeMillis?: string;
  autoRenewing?: boolean;
  cancelReason?: number;
  paymentState?: number;
  acknowledgementState?: number;
  // There are more fields, but these are the ones we use
}

async function getSubscriptionFromGoogle(
  accessToken: string,
  productId: string,
  purchaseToken: string,
): Promise<GoogleSubscriptionResource> {
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${purchaseToken}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google API error ${res.status}: ${errBody}`);
  }

  return res.json();
}

// ─── Map Google subscription state → internal status ────────────────────────

function mapGoogleState(sub: Record<string, unknown>): {
  status: string;
  accessEndsAt: string | null;
  autoRenewing: boolean;
} {
  const subscriptionState = sub.subscriptionState as string | undefined;
  const lineItems = sub.lineItems as Array<Record<string, unknown>> | undefined;

  // Extract expiry from the first lineItem
  let expiryTimeMillis: string | null = null;
  if (lineItems && lineItems.length > 0) {
    const firstItem = lineItems[0];
    const expiryTime = firstItem.expiryTime as string | undefined;
    if (expiryTime) {
      expiryTimeMillis = new Date(expiryTime).toISOString();
    }
  }

  const autoRenewing = (sub.autoRenewing as boolean) ?? false;

  switch (subscriptionState) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
      return { status: 'active', accessEndsAt: expiryTimeMillis, autoRenewing };
    case 'SUBSCRIPTION_STATE_CANCELED':
      // User canceled renewal but still has access until expiry
      return { status: 'canceled', accessEndsAt: expiryTimeMillis, autoRenewing: false };
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return { status: 'grace_period', accessEndsAt: expiryTimeMillis, autoRenewing };
    case 'SUBSCRIPTION_STATE_ON_HOLD':
      return { status: 'on_hold', accessEndsAt: expiryTimeMillis, autoRenewing: false };
    case 'SUBSCRIPTION_STATE_PAUSED':
      return { status: 'on_hold', accessEndsAt: expiryTimeMillis, autoRenewing: false };
    case 'SUBSCRIPTION_STATE_EXPIRED':
      return { status: 'expired', accessEndsAt: expiryTimeMillis, autoRenewing: false };
    default:
      return { status: 'pending', accessEndsAt: expiryTimeMillis, autoRenewing: false };
  }
}

// ─── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  // 1. Authenticate the user via JWT
  const authorization = request.headers.get('authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!token || !supabaseUrl || !serviceRoleKey) {
    return reply(401, { error: 'Unauthorized' });
  }

  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user) return reply(401, { error: 'Invalid session' });

  // 2. Parse request body
  let body: { purchaseToken?: string; productId?: string; basePlanId?: string };
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: 'Invalid JSON body' });
  }

  const { purchaseToken, productId, basePlanId } = body;
  if (!purchaseToken || !productId) {
    return reply(400, { error: 'Missing required fields: purchaseToken, productId' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // 3. Check if this purchase token is already linked to another user
  const { data: existing, error: existingError } = await admin
    .from('entitlements')
    .select('auth_user_id')
    .eq('purchase_token', purchaseToken)
    .maybeSingle();

  if (existingError) return reply(500, { error: 'Could not check existing entitlement' });

  if (existing && existing.auth_user_id !== user.id) {
    return reply(409, { error: 'purchase_already_linked' });
  }

  // 4. Validate purchase with Google Play Developer API
  let googleSub: Record<string, unknown>;
  try {
    const accessToken = await getGoogleAccessToken();
    googleSub = await getSubscriptionFromGoogle(accessToken, productId, purchaseToken) as Record<string, unknown>;
  } catch (err) {
    console.error('Google API verification failed:', err);
    return reply(502, { error: 'Could not verify purchase with Google' });
  }

  // 5. Map Google state to internal state
  const mapped = mapGoogleState(googleSub);
  const email = user.email?.trim().toLowerCase() ?? null;
  const now = new Date().toISOString();

  // 6. Upsert entitlement (idempotent by purchase_token)
  if (existing) {
    // Update existing entitlement
    const { error: updateError } = await admin
      .from('entitlements')
      .update({
        status: mapped.status,
        access_ends_at: mapped.accessEndsAt,
        auto_renewing: mapped.autoRenewing,
        email,
        updated_at: now,
      })
      .eq('purchase_token', purchaseToken);

    if (updateError) return reply(500, { error: 'Could not update entitlement' });
  } else {
    // Insert new entitlement
    const { error: insertError } = await admin
      .from('entitlements')
      .insert({
        auth_user_id: user.id,
        email,
        access_type: 'subscription',
        provider: 'google_play',
        product_id: productId,
        base_plan_id: basePlanId ?? null,
        purchase_token: purchaseToken,
        status: mapped.status,
        access_starts_at: now,
        access_ends_at: mapped.accessEndsAt,
        auto_renewing: mapped.autoRenewing,
      });

    if (insertError) return reply(500, { error: 'Could not create entitlement' });
  }

  // 7. Log event
  await admin.from('subscription_events').insert({
    auth_user_id: user.id,
    provider: 'google_play',
    event_type: 'purchase_verified',
    purchase_token: purchaseToken,
    product_id: productId,
    base_plan_id: basePlanId ?? null,
    payload: googleSub,
    processing_status: 'processed',
    processed_at: now,
  });

  // 8. Return access state
  return reply(200, {
    status: mapped.status,
    access_type: 'subscription',
    access_ends_at: mapped.accessEndsAt,
    auto_renewing: mapped.autoRenewing,
  });
});
