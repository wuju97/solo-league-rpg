// ============================================================
// SOLO LEAGUE RPG — Header gamer name
// Fills in the gamer name shown in the header, to the left of
// the Duel Chat / World Lore buttons, on every page. Also wraps
// it in a small SVG ring that fills blue as the player earns XP
// toward their next level, using the shared level_and_rank_for_xp()
// function so it always matches the real leveling curve.
// Load this after supabaseClient.js and profileHelper.js.
// ============================================================

(async function () {
  const { data } = await sb.auth.getSession();
  if (!data.session) return;
  const userId = data.session.user.id;

  const el = document.getElementById("header-gamer-name");
  if (!el) return;

  const name = await getMyGamerName();
  el.textContent = name;

  await buildXpRing();

  // Keep the ring live if XP changes while this page is open
  sb.channel("header-xp-ring-" + userId)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "characters", filter: `user_id=eq.${userId}` },
      () => buildXpRing()
    )
    .subscribe();

  async function buildXpRing() {
    const { data: character } = await sb
      .from("characters")
      .select("xp")
      .eq("user_id", userId)
      .maybeSingle();

    let progress = { level: 1, rank: "E", xp_into_level: 0, xp_for_next_level: 100 };
    if (character) {
      const { data: progressData } = await sb.rpc("level_and_rank_for_xp", { p_xp: character.xp || 0 });
      const fetched = Array.isArray(progressData) ? progressData[0] : progressData;
      if (fetched) progress = fetched;
    }

    const pct = progress.xp_for_next_level > 0
      ? Math.min(1, progress.xp_into_level / progress.xp_for_next_level)
      : 1; // level 100 cap — ring shows full

    const size = 26;
    const strokeWidth = 2.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - pct);

    let ring = document.getElementById("header-xp-ring");
    if (!ring) {
      // Build the wrapper once: [ring+level] [gamer name]
      const wrapper = document.createElement("span");
      wrapper.style.cssText = "display:inline-flex; align-items:center; gap:0.4rem;";

      const ringSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      ringSvg.setAttribute("id", "header-xp-ring");
      ringSvg.setAttribute("width", size);
      ringSvg.setAttribute("height", size);
      ringSvg.style.cssText = "transform:rotate(-90deg); flex-shrink:0;";
      ringSvg.innerHTML = `
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="${strokeWidth}"></circle>
        <circle id="header-xp-ring-fill" cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="#3b82f6" stroke-width="${strokeWidth}"
          stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}" stroke-linecap="round"
          style="transition: stroke-dashoffset 0.6s ease;"></circle>
        <text id="header-xp-ring-level" x="${size/2}" y="${size/2}" fill="var(--gold-bright)" font-size="9" font-family="'JetBrains Mono', monospace"
          text-anchor="middle" dominant-baseline="central" transform="rotate(90 ${size/2} ${size/2})">${progress.level}</text>
      `;

      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(ringSvg);
      wrapper.appendChild(el);
      ring = ringSvg;
    }

    const fillCircle = document.getElementById("header-xp-ring-fill");
    const levelText = document.getElementById("header-xp-ring-level");
    if (fillCircle) fillCircle.setAttribute("stroke-dashoffset", offset);
    if (levelText) levelText.textContent = progress.level;

    el.title = `Level ${progress.level} (${progress.rank}-Rank) — ${progress.xp_into_level} / ${progress.xp_for_next_level} XP to next level`;
  }
})();
