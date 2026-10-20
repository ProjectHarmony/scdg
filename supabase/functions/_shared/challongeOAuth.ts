type SupabaseAdmin = ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2')['createClient']>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function encryptionKey() {
  const secret = Deno.env.get('CHALLONGE_TOKEN_ENCRYPTION_KEY')
    || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    || Deno.env.get('CHALLONGE_CLIENT_SECRET');
  if (!secret) throw new Error('A Challonge token encryption key is not configured.');
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptToken(token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(), encoder.encode(token));
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

export async function decryptToken(value: string) {
  const [ivValue, encryptedValue] = value.split('.');
  if (!ivValue || !encryptedValue) throw new Error('Stored Challonge token is invalid.');
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(ivValue) },
      await encryptionKey(),
      base64ToBytes(encryptedValue),
    );
    return decoder.decode(decrypted);
  } catch {
    throw new Error('The stored Challonge token is no longer valid. Reconnect Challonge, then try again.');
  }
}

export async function requestTokens(parameters: Record<string, string>) {
  const clientId = Deno.env.get('CHALLONGE_CLIENT_ID');
  const clientSecret = Deno.env.get('CHALLONGE_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Challonge OAuth secrets are not configured.');

  const response = await fetch('https://api.challonge.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...parameters }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || 'Challonge token exchange failed.');
  }
  return payload;
}

export async function saveConnection(admin: SupabaseAdmin, userId: string, tokens: Record<string, unknown>, user?: Record<string, unknown>) {
  const expiresIn = Number(tokens.expires_in || 604800);
  const payload = {
    user_id: userId,
    challonge_user_id: user?.id ? String(user.id) : null,
    challonge_username: String(user?.username || ''),
    access_token_encrypted: await encryptToken(String(tokens.access_token)),
    token_type: String(tokens.token_type || 'Bearer'),
    scope: String(tokens.scope || ''),
    token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
  if (tokens.refresh_token) {
    Object.assign(payload, { refresh_token_encrypted: await encryptToken(String(tokens.refresh_token)) });
  }
  const { error } = await admin.from('scoring_challonge_connections').upsert(payload, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function getAccessToken(admin: SupabaseAdmin, userId: string) {
  const { data: connection, error } = await admin
    .from('scoring_challonge_connections')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error || !connection) throw new Error('Connect your Challonge account first.');

  if (new Date(connection.token_expires_at).getTime() > Date.now() + 60_000) {
    return decryptToken(connection.access_token_encrypted);
  }
  if (!connection.refresh_token_encrypted) throw new Error('Reconnect Challonge to renew access.');

  const storedRefreshToken = await decryptToken(connection.refresh_token_encrypted);
  const tokens = await requestTokens({
    grant_type: 'refresh_token',
    refresh_token: storedRefreshToken,
  });
  if (!tokens.refresh_token) tokens.refresh_token = storedRefreshToken;
  await saveConnection(admin, userId, tokens, {
    id: connection.challonge_user_id,
    username: connection.challonge_username,
  });
  return String(tokens.access_token);
}

export async function challongeRequest(path: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.challonge.com/v2.1${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization-Type': 'v2',
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const details = payload?.errors?.map?.((item: Record<string, string>) => item.detail || item.title).filter(Boolean).join(', ');
    throw new Error(details || payload?.error_description || payload?.error || `Challonge returned ${response.status}.`);
  }
  return payload;
}
