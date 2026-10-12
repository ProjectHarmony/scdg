import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { challongeRequest, getAccessToken } from '../_shared/challongeOAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchTournamentPages(accessToken: string, communityId = '') {
  const tournaments = [];
  for (let page = 1; ; page += 1) {
    const params = new URLSearchParams({
      state: 'in_progress',
      type: 'swiss',
      page: String(page),
      per_page: '100',
    });
    if (communityId) params.set('community_id', communityId);
    const payload = await challongeRequest(`/tournaments.json?${params}`, accessToken);
    const rows = payload?.data || [];
    tournaments.push(...rows.map((row: Record<string, unknown>) => {
      const attributes = row.attributes as Record<string, unknown>;
      return {
        id: String(row.id),
        name: String(attributes?.name || 'Untitled Tournament'),
        url: String(attributes?.url || ''),
        state: String(attributes?.state || 'in_progress'),
        tournamentType: String(attributes?.tournament_type || ''),
        communityId,
      };
    }));
    if (rows.length < 100) break;
  }
  return tournaments;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Authentication required.' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Invalid session.' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
    if (profile?.role !== 'admin') return json({ error: 'Admin access required.' }, 403);

    const accessToken = await getAccessToken(admin, userData.user.id);
    const tournaments = await fetchTournamentPages(accessToken);
    const warnings = [];

    try {
      const communityPayload = await challongeRequest('/communities.json', accessToken);
      const communityRows = Array.isArray(communityPayload?.data)
        ? communityPayload.data
        : communityPayload?.data ? [communityPayload.data] : [];
      for (const community of communityRows) {
        const attributes = community.attributes || {};
        const communityId = String(attributes.identifier || attributes.permalink || community.id || '');
        if (!communityId) continue;
        tournaments.push(...await fetchTournamentPages(accessToken, communityId));
      }
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : 'Community tournaments could not be loaded.');
    }

    const unique = [...new Map(tournaments.map(item => [`${item.communityId}:${item.id}`, item])).values()];
    return json({ tournaments: unique, warnings });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not load Challonge tournaments.' }, 400);
  }
});
