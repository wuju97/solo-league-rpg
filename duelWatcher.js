// ============================================================
// SOLO LEAGUE RPG — Duel Watcher
// Runs on every page. Jobs:
//   1. Shows a number badge next to "Duel Trade" in the sidebar
//      for how many pending challenges you have.
//   2. If any of your duels becomes active (someone accepted your
//      challenge, or you accepted theirs), automatically sends you
//      to Duel Chat where the battle happens — no manual refresh
//      or clicking around needed.
//   3. Shows a persistent "fight in progress" badge on the Duel
//      Chat nav button if you have an active PvE or Boss battle
//      you walked away from mid-fight — doesn't force-redirect you
//      (unlike an active PvP duel), just keeps reminding you it's
//      still waiting, since you may have left on purpose to check
//      something.
// Load this after supabaseClient.js and profileHelper.js.
// ============================================================

(async function () {
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) return;
  const userId = sessionData.session.user.id;

  // ---- 1. pending challenge badge ----
  async function refreshBadge() {
    const { data: pending } = await sb
      .from("duels")
      .select("id")
      .eq("status", "pending")
      .eq("opponent_id", userId);

    const count = pending ? pending.length : 0;
    const navLink = document.querySelector('a.nav-item[href="duel-trade.html"]');
    if (!navLink) return;

    let badge = navLink.querySelector(".duel-badge");
    if (count > 0) {
      if (!badge) {
        navLink.style.position = "relative";
        badge = document.createElement("span");
        badge.className = "duel-badge";
        badge.style.cssText =
          "position:absolute; top:4px; right:6px; " +
          "background:var(--crimson-bright); color:#fff; " +
          "font-family:'JetBrains Mono',monospace; font-size:0.65rem; " +
          "min-width:16px; height:16px; border-radius:8px; display:flex; " +
          "align-items:center; justify-content:center; padding:0 3px; z-index:10;";
        navLink.appendChild(badge);
        if (window.SoloLeagueAudio) window.SoloLeagueAudio.playNotification();
      }
      badge.textContent = count > 9 ? "9+" : count;
    } else if (badge) {
      badge.remove();
    }
  }

  refreshBadge();

  // ---- 2. auto-redirect when a duel of mine goes active ----
  // Skip this check if we're already on the duel page — no point
  // redirecting to where we already are.
  const onPvpChat = window.location.pathname.endsWith("pvp-chat.html");

  if (!onPvpChat) {
    const { data: activeDuel } = await sb
      .from("duels")
      .select("id")
      .in("status", ["active", "prep"])
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .limit(1)
      .maybeSingle();

    if (activeDuel) {
      window.location.href = "pvp-chat.html?duel=" + activeDuel.id;
      return;
    }
  }

  // ---- 3. persistent "fight in progress" badge for PvE/Boss ----
  async function refreshPveBadge() {
    const duelChatLink = document.querySelector('a.chat-btn.pvp[href="pvp-chat.html"]');
    if (!duelChatLink) return;

    // Checks the real tables this project actually uses --
    // battle_instances/battle_participants for solo PvE, boss_battles
    // for boss fights. Two independent queries rather than one
    // embedded join, since that depends on Supabase's schema cache
    // having the foreign key relationship registered, which isn't
    // guaranteed. (No cleanup call here -- the old
    // cleanup_abandoned_pve_battles function doesn't exist for this
    // battle system; a battle staying "active" if someone abandons
    // it is a pre-existing gap, not something this fix introduces.)
    const [{ data: myBattleRows }, { data: activeBoss }] = await Promise.all([
      sb.from("battle_participants").select("battle_id").eq("user_id", userId),
      sb.from("boss_battles").select("id").eq("player_id", userId).eq("status", "active").limit(1).maybeSingle(),
    ]);

    let hasActivePve = false;
    const myBattleIds = (myBattleRows || []).map(r => r.battle_id);
    if (myBattleIds.length > 0){
      const { data: activeInstance } = await sb.from("battle_instances").select("id").in("id", myBattleIds).eq("status", "active").limit(1).maybeSingle();
      hasActivePve = !!activeInstance;
    }

    const hasActiveFight = (hasActivePve || !!activeBoss) && !onPvpChat;

    let badge = duelChatLink.querySelector(".pve-fight-badge");
    if (hasActiveFight) {
      if (!badge) {
        duelChatLink.style.position = "relative";
        badge = document.createElement("span");
        badge.className = "pve-fight-badge";
        badge.title = "You have a fight in progress — click to return";
        badge.style.cssText =
          "position:absolute; top:-4px; right:-4px; width:10px; height:10px; " +
          "background:var(--crimson-bright); border-radius:50%; " +
          "box-shadow:0 0 4px var(--crimson-bright); animation:pveFightPulse 1.2s ease-in-out infinite; z-index:10;";
        duelChatLink.appendChild(badge);

        if (!document.getElementById("pve-fight-pulse-style")) {
          const style = document.createElement("style");
          style.id = "pve-fight-pulse-style";
          style.textContent = "@keyframes pveFightPulse{0%,100%{opacity:1;}50%{opacity:0.35;}}";
          document.head.appendChild(style);
        }
      }
    } else if (badge) {
      badge.remove();
    }
  }

  refreshPveBadge();
  if (!onPvpChat) {
    setInterval(refreshPveBadge, 15000);
  }

  // Live updates: if any duel involving me changes, recheck
  sb.channel("duel-watcher-" + userId)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "duels", filter: `challenger_id=eq.${userId}` },
      (payload) => handleDuelChange(payload.new)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "duels", filter: `opponent_id=eq.${userId}` },
      (payload) => handleDuelChange(payload.new)
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "duels", filter: `opponent_id=eq.${userId}` },
      () => refreshBadge()
    )
    .subscribe();

  function handleDuelChange(duel) {
    refreshBadge();
    if ((duel.status === "active" || duel.status === "prep") && !window.location.pathname.endsWith("pvp-chat.html")) {
      window.location.href = "pvp-chat.html?duel=" + duel.id;
    }
  }
})();
