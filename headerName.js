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

    // Sized to comfortably wrap a real avatar image, not just a
    // level number — the previous ring only needed to fit two
    // digits of text.
    const size = 36;
    const strokeWidth = 2.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - pct);

    let ring = document.getElementById("header-xp-ring");
    if (!ring) {
      // Build the wrapper once: [ring with avatar centered inside] [gamer name]
      const wrapper = document.createElement("span");
      wrapper.style.cssText = "display:inline-flex; align-items:center; gap:0.4rem;";

      const ringWrap = document.createElement("span");
      ringWrap.style.cssText = `position:relative; width:${size}px; height:${size}px; flex-shrink:0; display:inline-block;`;

      const ringSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      ringSvg.setAttribute("id", "header-xp-ring");
      ringSvg.setAttribute("width", size);
      ringSvg.setAttribute("height", size);
      ringSvg.style.cssText = "position:absolute; inset:0; transform:rotate(-90deg);";
      ringSvg.innerHTML = `
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="${strokeWidth}"></circle>
        <circle id="header-xp-ring-fill" cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="#3b82f6" stroke-width="${strokeWidth}"
          stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}" stroke-linecap="round"
          style="transition: stroke-dashoffset 0.6s ease;"></circle>
      `;

      // The avatar image already exists in the header (populated by
      // profileHelper.js, which this file already awaits via
      // getMyGamerName() above) -- move that same element inside the
      // ring instead of fetching avatar data a second time.
      const avatarImg = document.getElementById("header-avatar");
      const avatarInset = strokeWidth + 2;
      const avatarSize = size - avatarInset * 2;
      if (avatarImg) {
        // An <img> with an empty src can show a broken-image icon in
        // some browsers -- remove the attribute entirely when no
        // avatar's been set, so it's just a plain background-colored
        // circle instead.
        if (!avatarImg.getAttribute("src")) avatarImg.removeAttribute("src");
        avatarImg.style.cssText = `position:absolute; top:${avatarInset}px; left:${avatarInset}px; width:${avatarSize}px; height:${avatarSize}px; border-radius:50%; object-fit:cover; background:var(--panel-raised); display:block;`;
      }

      // Small, visible level badge -- the ring's fill shows XP
      // progress, but the level number itself had been dropped
      // entirely (only living in the hover tooltip below) since the
      // ring was resized to wrap an avatar instead of text directly.
      const levelBadge = document.createElement("span");
      levelBadge.id = "header-xp-level-badge";
      levelBadge.style.cssText = "position:absolute; bottom:-3px; right:-3px; min-width:13px; height:13px; padding:0 2px; border-radius:7px; background:transparent; border:1px solid #fff; color:#fff; font-size:0.7rem; font-weight:700; line-height:11px; text-align:center; box-shadow:0 0 0 2px var(--void);";

      el.parentNode.insertBefore(wrapper, el);
      ringWrap.appendChild(ringSvg);
      if (avatarImg) ringWrap.appendChild(avatarImg);
      ringWrap.appendChild(levelBadge);
      wrapper.appendChild(ringWrap);
      wrapper.appendChild(el);
      ring = ringSvg;
    }

    const levelBadgeEl = document.getElementById("header-xp-level-badge");
    if (levelBadgeEl) levelBadgeEl.textContent = progress.level;

    const fillCircle = document.getElementById("header-xp-ring-fill");
    if (fillCircle) fillCircle.setAttribute("stroke-dashoffset", offset);

    el.title = `Level ${progress.level} (${progress.rank}-Rank) — ${progress.xp_into_level} / ${progress.xp_for_next_level} XP to next level`;
  }
})();
