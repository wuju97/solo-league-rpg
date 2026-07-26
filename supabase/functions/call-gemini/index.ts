// ============================================================
// SOLO LEAGUE RPG — call-gemini Edge Function
//
// One shared proxy for every AI feature on the site. Looks up the
// CALLER's own Gemini keys (never trusts anything the browser
// sends for the key itself), tries Gemini API Key 1, and
// automatically falls back to Key 2 if Key 1 is rate-limited.
// Optionally grounds the prompt with AI Memory (Information and/or
// Instructions from shared_site_settings) so answers stay accurate
// to your actual world and site instead of hallucinating.
//
// Always returns HTTP 200, even for error cases, with
// { error: "..." } in the body instead of a non-2xx status --
// that's what makes real error messages actually reach the browser.
//
// Also handles CORS explicitly (the OPTIONS preflight browsers
// send before the real request, plus Access-Control headers on
// every response) -- without this, browser-based calls can fail
// silently with a generic network error and no useful message,
// which is what was actually happening here.
//
// DEPLOY: same process as fetch-riot-match —
//   npx supabase functions deploy call-gemini
// (run from the folder containing supabase/functions/call-gemini/)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_MODEL = "gemini-2.5-flash";

// Computes the next midnight in Pacific Time, correctly accounting
// for DST, without needing a timezone library. Works by measuring
// the current UTC-vs-Pacific offset live (via Intl), rather than
// hardcoding -7 or -8, since that offset changes twice a year.
function nextPacificMidnightUTC(): Date {
  const now = new Date();
  const utcMillis = new Date(now.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  const ptMillis = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })).getTime();
  const offsetMinutes = Math.round((utcMillis - ptMillis) / 60000); // how far PT is behind UTC right now

  const ptDateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now); // "YYYY-MM-DD" as seen in Pacific time
  const [y, m, d] = ptDateParts.split("-").map(Number);

  // Midnight tomorrow in Pacific time, expressed as a UTC instant
  return new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) + offsetMinutes * 60000);
}

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

async function callGeminiWithKey(apiKey: string, systemPrompt: string, userPrompt: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 1500, thinkingConfig: { thinkingBudget: 0 } },
      }),
    }
  );
  return res;
}

Deno.serve(async (req) => {
  // Browsers send an OPTIONS preflight request before the real POST
  // whenever custom headers (like Authorization) are involved --
  // must answer it directly with CORS headers, or the browser blocks
  // the real request before it's ever sent, with no useful error.
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

    const { purpose, prompt, groundWith } = await req.json();
    if (!prompt) {
      return ok({ error: "No prompt provided." });
    }

    // Look up the CALLER's own keys -- never anyone else's
    const { data: keys } = await supabase
      .from("user_api_keys")
      .select("gemini_api_key_1, gemini_api_key_2")
      .eq("user_id", userId)
      .maybeSingle();

    if (!keys || (!keys.gemini_api_key_1 && !keys.gemini_api_key_2)) {
      return ok({ error: "No Gemini API key set. Add one in Settings -> API -> Gemini API Key 1." });
    }

    // Optionally ground the prompt with AI Memory
    let systemPrompt = `You are an assistant for the browser RPG "Solo League RPG". Purpose: ${purpose || "general"}. Keep responses concise and in-character where appropriate. Never break the fourth wall about being an AI unless directly asked.`;
    if (groundWith === "information" || groundWith === "both") {
      const { data: shared } = await supabase.from("shared_site_settings").select("ai_memory_information").maybeSingle();
      if (shared?.ai_memory_information) systemPrompt += `\n\nWORLD LORE REFERENCE:\n${shared.ai_memory_information}`;
    }
    if (groundWith === "instructions" || groundWith === "both") {
      const { data: shared } = await supabase.from("shared_site_settings").select("ai_memory_instructions").maybeSingle();
      if (shared?.ai_memory_instructions) systemPrompt += `\n\nHOW THE SITE WORKS REFERENCE:\n${shared.ai_memory_instructions}`;
    }

    // Try Key 1, fall back to Key 2 on rate limit (429) or missing Key 1
    const keysToTry = [
      { key: keys.gemini_api_key_1, column: "gemini_1_rate_limited_until" },
      { key: keys.gemini_api_key_2, column: "gemini_2_rate_limited_until" },
    ].filter(k => k.key);
    let lastError = "";
    let rateLimitedUntil = null;

    for (const { key: apiKey, column } of keysToTry) {
      const res = await callGeminiWithKey(apiKey, systemPrompt, prompt);
      if (res.ok) {
        const data = await res.json();
        const candidate = data?.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;
        const finishReason = candidate?.finishReason;

        if (text && finishReason === "STOP") {
          return ok({ text });
        }
        if (text && finishReason && finishReason !== "STOP") {
          // Got SOME text back, but Gemini stopped for a reason other
          // than naturally finishing -- surface that instead of
          // silently returning a truncated response as if it were
          // complete. Common values: MAX_TOKENS (still too long even
          // at the raised limit), SAFETY (content filtering), RECITATION.
          return ok({ text, warning: `Response may be incomplete (stopped early: ${finishReason}).` });
        }
        if (text) {
          return ok({ text }); // no finishReason field at all -- treat as complete
        }
        lastError = `Gemini returned no text (finishReason: ${finishReason || "unknown"}).`;
        continue;
      }
      if (res.status === 429) {
        const errBody = await res.text();
        lastError = `Rate limited: ${errBody}`;

        // Google's 429s come in two genuinely different flavors that
        // look identical (same status code, same retryDelay-looking
        // field) but need completely different handling:
        //   - Per-minute (RPM/TPM): short rolling window, the
        //     retryDelay field is accurate, wait that long and retry.
        //   - Per-day (RPD): the ENTIRE daily quota is exhausted.
        //     retryDelay here is just Google's generic short backoff
        //     suggestion -- retrying after it does nothing, since the
        //     daily cap doesn't refill until midnight Pacific Time.
        //     Using the misleading short delay was causing an endless
        //     retry loop that never actually recovers.
        let untilTime;
        let isDailyQuota = false;
        try {
          const parsed = JSON.parse(errBody);
          const violations = parsed?.error?.details?.find((d: any) => d["@type"]?.includes("QuotaFailure"))?.violations || [];
          isDailyQuota = violations.some((v: any) => (v.quotaId || "").includes("PerDay"));
        } catch (e) { /* fall through, treat as per-minute below */ }

        if (isDailyQuota) {
          untilTime = nextPacificMidnightUTC().toISOString();
        } else {
          let retrySeconds = 60; // sensible fallback if the field is missing
          try {
            const parsed = JSON.parse(errBody);
            const retryInfo = parsed?.error?.details?.find((d: any) => d["@type"]?.includes("RetryInfo"));
            const delayStr = retryInfo?.retryDelay; // e.g. "14s"
            if (delayStr) {
              const match = delayStr.match(/^([\d.]+)s$/);
              if (match) retrySeconds = Math.ceil(parseFloat(match[1]));
            }
          } catch (e) { /* fall back to the default above */ }
          untilTime = new Date(Date.now() + retrySeconds * 1000).toISOString();
        }

        await supabase.from("user_api_keys").update({ [column]: untilTime }).eq("user_id", userId);
        rateLimitedUntil = untilTime;
        continue; // try the next key
      }
      const errBody = await res.text();
      lastError = `Gemini error ${res.status}: ${errBody}`;
      break; // non-rate-limit error, don't bother trying key 2
    }

    return ok({
      error: `Couldn't get a response (${lastError || "no keys worked"}). If this was a rate limit, wait a minute and try again.`,
      rateLimitedUntil,
    });

  } catch (err) {
    return ok({ error: String(err) });
  }
});
