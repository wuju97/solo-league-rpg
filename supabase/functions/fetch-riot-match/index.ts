// ============================================================
// SOLO LEAGUE RPG — fetch-riot-match Edge Function
//
// Looks up the CALLER's own Riot API key, Riot ID, and region from
// user_api_keys (using their own login session — never trusts
// anything the browser sends for the key itself), calls Riot's API
// server-side, and returns their most recent match's KDA if it
// hasn't already been processed. This is what keeps the Riot key
// out of the browser entirely.
//
// DEPLOY: see the instructions at the bottom of this file.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Riot's Account-V1 and Match-V5 APIs use continent clusters, not
// the platform regions (na1, euw1, kr, ...) players normally type.
// Map the common platform regions to their continent cluster here.
const REGION_TO_CONTINENT: Record<string, string> = {
  na1: "americas", br1: "americas", la1: "americas", la2: "americas", oc1: "americas",
  euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe",
  kr: "asia", jp1: "asia",
  vn2: "sea", ph2: "sea", sg2: "sea", th2: "sea", tw2: "sea", id1: "sea",
};

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated." }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Not authenticated." }), { status: 401 });
    }
    const userId = userData.user.id;

    const { data: keys, error: keysError } = await supabase
      .from("user_api_keys")
      .select("lol_api_key, riot_game_name, riot_tag_line, riot_region, last_processed_match_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (keysError || !keys) {
      return new Response(JSON.stringify({ error: "No Riot API settings found. Set them in Settings -> API -> LoL API Key first." }), { status: 400 });
    }
    if (!keys.lol_api_key || !keys.riot_game_name || !keys.riot_tag_line) {
      return new Response(JSON.stringify({ error: "Riot API key and Riot ID (name + tag) must all be set first." }), { status: 400 });
    }

    const continent = REGION_TO_CONTINENT[keys.riot_region] || "americas";
    const riotHeaders = { "X-Riot-Token": keys.lol_api_key };

    // 1. Resolve PUUID from Riot ID (gameName#tagLine)
    const accountRes = await fetch(
      `https://${continent}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(keys.riot_game_name)}/${encodeURIComponent(keys.riot_tag_line)}`,
      { headers: riotHeaders }
    );
    if (!accountRes.ok) {
      return new Response(JSON.stringify({ error: `Couldn't find that Riot ID (${accountRes.status}). Check the name, tag, and that your key hasn't expired.` }), { status: 400 });
    }
    const account = await accountRes.json();
    const puuid = account.puuid;

    // 2. Get the most recent match ID
    const matchListRes = await fetch(
      `https://${continent}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=1`,
      { headers: riotHeaders }
    );
    if (!matchListRes.ok) {
      return new Response(JSON.stringify({ error: `Couldn't fetch match history (${matchListRes.status}).` }), { status: 400 });
    }
    const matchIds = await matchListRes.json();
    if (!matchIds || matchIds.length === 0) {
      return new Response(JSON.stringify({ error: "No matches found for this Riot ID." }), { status: 404 });
    }
    const latestMatchId = matchIds[0];

    if (latestMatchId === keys.last_processed_match_id) {
      return new Response(JSON.stringify({ newMatch: false, message: "No new match since last check." }), { status: 200 });
    }

    // 3. Get match details, find this player's participant entry
    const matchRes = await fetch(
      `https://${continent}.api.riotgames.com/lol/match/v5/matches/${latestMatchId}`,
      { headers: riotHeaders }
    );
    if (!matchRes.ok) {
      return new Response(JSON.stringify({ error: `Couldn't fetch match details (${matchRes.status}).` }), { status: 400 });
    }
    const match = await matchRes.json();
    const participant = match.info.participants.find((p: any) => p.puuid === puuid);
    if (!participant) {
      return new Response(JSON.stringify({ error: "Couldn't find you in that match's data." }), { status: 500 });
    }

    // 4. Mark this match as processed so it's never double-counted
    await supabase
      .from("user_api_keys")
      .update({ last_processed_match_id: latestMatchId })
      .eq("user_id", userId);

    return new Response(JSON.stringify({
      newMatch: true,
      matchId: latestMatchId,
      kills: participant.kills,
      deaths: participant.deaths,
      assists: participant.assists,
      won: participant.win,
      // Riot doesn't have a clean single "MVP" flag; approximated
      // as this player having this match's highest kill participation.
      // Not perfect -- flagged as an approximation, adjust in the UI if it's wrong.
      championName: participant.championName,
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

// ============================================================
// DEPLOYMENT INSTRUCTIONS
//
// 1. Install the Supabase CLI (one-time):
//      npm install -g supabase
//
// 2. Log in (one-time, opens a browser to authorize):
//      supabase login
//
// 3. Link this function to your project (one-time -- find your
//    project ref in the Supabase dashboard URL, looks like
//    https://supabase.com/dashboard/project/XXXXXXXX):
//      supabase link --project-ref XXXXXXXX
//
// 4. From the folder containing this file's PARENT directory
//    (i.e. the folder that contains "fetch-riot-match/"), deploy:
//      supabase functions deploy fetch-riot-match
//
// That's it -- the function is now live at:
//   https://XXXXXXXX.supabase.co/functions/v1/fetch-riot-match
//
// No environment variables need to be set manually -- SUPABASE_URL
// and SUPABASE_ANON_KEY are automatically available inside every
// Edge Function.
// ============================================================
