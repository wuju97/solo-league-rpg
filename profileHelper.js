// ============================================================
// SOLO LEAGUE RPG — Profile helper
// Shared functions any page can use to get or set the current
// player's gamer name. Load this after supabaseClient.js.
// ============================================================

// Returns the current player's gamer name.
// If they haven't set one yet, falls back to the part of their
// email before the @ (so something reasonable always shows).
async function getMyGamerName() {
  try {
    const { data: userData } = await sb.auth.getUser();
    const user = userData?.user;
    if (!user) return null;

    // Piggybacked here since this function already runs once on
    // every authenticated page load -- no need to touch every
    // individual page just to track presence.
    sb.rpc("update_my_last_seen").then(() => {});

    const { data, error } = await sb
      .from("profiles")
      .select("gamer_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    // Populate the header avatar if this page has one -- gated on
    // the element existing so pages without it (or any future page
    // that doesn't include this markup) don't error out.
    const avatarEl = document.getElementById("header-avatar");
    if (avatarEl && data?.avatar_url) {
      avatarEl.src = data.avatar_url;
      avatarEl.style.display = "inline-block";
    }

    if (!error && data && data.gamer_name) {
      return data.gamer_name;
    }
    // No profile row yet, or something went wrong reading it —
    // fall back to the email prefix so the header never goes blank.
    return user.email.split("@")[0];
  } catch (err) {
    console.error("getMyGamerName failed:", err);
    return "Adventurer";
  }
}

// Saves (creates or updates) the current player's gamer name.
// Returns { error } — error is null on success.
async function saveMyGamerName(newName) {
  const { data: userData } = await sb.auth.getUser();
  const user = userData?.user;
  if (!user) return { error: "Not logged in" };

  const { error } = await sb
    .from("profiles")
    .upsert({ user_id: user.id, gamer_name: newName });

  return { error };
}
