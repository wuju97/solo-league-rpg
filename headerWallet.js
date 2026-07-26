// ============================================================
// SOLO LEAGUE RPG — Header Wallet
// Shows Gold and AP in the header on every page, and keeps it
// live-updated via realtime so it's always accurate even after
// spending AP or converting to Gold elsewhere.
// Load this after supabaseClient.js and profileHelper.js.
// ============================================================

(async function () {
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) return;
  const userId = sessionData.session.user.id;

  const el = document.getElementById("header-wallet");
  if (!el) return;

  function render(character) {
    if (!character) {
      el.textContent = "0 Gold  •  0 AP";
      return;
    }
    el.textContent = `${character.gold ?? 0} Gold  •  ${character.attribute_points ?? 0} AP`;
  }

  const { data: character } = await sb
    .from("characters")
    .select("gold, attribute_points")
    .eq("user_id", userId)
    .maybeSingle();

  render(character);

  // Keep it live if gold/AP changes while this page is open —
  // covers both updates (spending AP, earning gold) and the
  // character being created for the first time
  sb.channel("header-wallet-" + userId)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "characters", filter: `user_id=eq.${userId}` },
      (payload) => render(payload.new)
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "characters", filter: `user_id=eq.${userId}` },
      (payload) => render(payload.new)
    )
    .subscribe();
})();
