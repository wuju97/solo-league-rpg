import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ACCOUNT_V1_CONTINENT: Record<string, string> = {
  na1: "americas", br1: "americas", la1: "americas", la2: "americas", oc1: "americas",
  euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe",
  kr: "asia", jp1: "asia", sg2: "asia",
};
const MATCH_V5_CONTINENT: Record<string, string> = {
  na1: "americas", br1: "americas", la1: "americas", la2: "americas", oc1: "americas",
  euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe",
  kr: "asia", jp1: "asia",
  sg2: "sea",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function ok(body: object) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return ok({ error: "Not authenticated." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return ok({ error: "Not authenticated." });
    }
    const userId = userData.user.id;

    const { data: keys, error: keysError } = await supabase
      .from("user_api_keys")
      .select("lol_api_key, riot_game_name, riot_tag_line, riot_region, last_processed_match_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (keysError || !keys) {
      return ok({ error: "No Riot API settings found. Set them in Settings -> API -> LoL API Key first." });
    }
    if (!keys.lol_api_key || !keys.riot_game_name || !keys.riot_tag_line) {
      return ok({ error: "Riot API key and Riot ID (name + tag) must all be set first." });
    }

    const accountContinent = ACCOUNT_V1_CONTINENT[keys.riot_region] || "americas";
    const matchContinent = MATCH_V5_CONTINENT[keys.riot_region] || "americas";
    const riotHeaders = { "X-Riot-Token": keys.lol_api_key };

    const accountRes = await fetch(
      `https://${accountContinent}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(keys.riot_game_name)}/${encodeURIComponent(keys.riot_tag_line)}`,
      { headers: riotHeaders }
    );
    if (!accountRes.ok) {
      const errBody = await accountRes.text();
      return ok({
        error: `Couldn't find that Riot ID (${accountRes.status}): ${errBody}. Check the name, tag, and that your key hasn't expired.`,
        debug: {
          urlUsed: `https://${accountContinent}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(keys.riot_game_name)}/${encodeURIComponent(keys.riot_tag_line)}`,
          gameNameStored: keys.riot_game_name,
          tagLineStored: keys.riot_tag_line,
          regionStored: keys.riot_region,
          continentUsed: accountContinent,
          keyLast6: keys.lol_api_key ? keys.lol_api_key.slice(-6) : null,
          keyLength: keys.lol_api_key ? keys.lol_api_key.length : 0,
        },
      });
    }
    const account = await accountRes.json();
    const puuid = account.puuid;

    const matchListRes = await fetch(
      `https://${matchContinent}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=1`,
      { headers: riotHeaders }
    );
    if (!matchListRes.ok) {
      const errBody = await matchListRes.text();
      return ok({ error: `Couldn't fetch match history (${matchListRes.status}): ${errBody}.` });
    }
    const matchIds = await matchListRes.json();
    if (!matchIds || matchIds.length === 0) {
      return ok({ error: "No matches found for this Riot ID." });
    }
    const latestMatchId = matchIds[0];

    if (latestMatchId === keys.last_processed_match_id) {
      return ok({ newMatch: false, message: "No new match since last check." });
    }

    const matchRes = await fetch(
      `https://${matchContinent}.api.riotgames.com/lol/match/v5/matches/${latestMatchId}`,
      { headers: riotHeaders }
    );
    if (!matchRes.ok) {
      const errBody = await matchRes.text();
      return ok({ error: `Couldn't fetch match details (${matchRes.status}): ${errBody}.` });
    }
    const match = await matchRes.json();
    const participant = match.info.participants.find((p: any) => p.puuid === puuid);
    if (!participant) {
      return ok({ error: "Couldn't find you in that match's data." });
    }

    await supabase
      .from("user_api_keys")
      .update({ last_processed_match_id: latestMatchId })
      .eq("user_id", userId);

    return ok({
      newMatch: true,
      matchId: latestMatchId,
      kills: participant.kills,
      deaths: participant.deaths,
      assists: participant.assists,
      won: participant.win,
      championName: participant.championName,
    });

  } catch (err) {
    return ok({ error: String(err) });
  }
});