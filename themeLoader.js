// ============================================================
// SOLO LEAGUE RPG — Theme Loader
// The instant application (no lag) happens via a tiny inline
// script in every page's <head>, reading from localStorage. This
// file's job is different: sync with the actual saved value in
// Supabase in the background, and update localStorage if it's
// changed (e.g. you changed a setting on another device). This
// runs after the instant-apply script, so there's no flash of the
// wrong theme even while this fetch is in flight.
// ============================================================

(async function () {
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) return;

  const { data: prefs } = await sb.rpc("get_or_create_preferences");
  const p = Array.isArray(prefs) ? prefs[0] : prefs;
  if (!p) return;

  const theme = p.theme || "dark_fantasy";
  const fontSize = p.font_size || "medium";
  const density = p.ui_density || "comfortable";
  const reduceMotion = !!p.reduce_motion;

  // Update the cache so the NEXT page load is instant and correct
  try {
    localStorage.setItem("slrpg_theme", theme);
    localStorage.setItem("slrpg_font_size", fontSize);
    localStorage.setItem("slrpg_density", density);
    localStorage.setItem("slrpg_reduce_motion", String(reduceMotion));
  } catch (e) {}

  // Apply now too, in case this differs from what the cache had
  // (e.g. first login on this device, or changed elsewhere)
  if (theme !== "dark_fantasy") document.documentElement.setAttribute("data-theme", theme);
  else document.documentElement.removeAttribute("data-theme");

  if (fontSize !== "medium") document.documentElement.setAttribute("data-font-size", fontSize);
  else document.documentElement.removeAttribute("data-font-size");

  if (density !== "comfortable") document.documentElement.setAttribute("data-density", density);
  else document.documentElement.removeAttribute("data-density");

  if (reduceMotion) document.documentElement.setAttribute("data-reduce-motion", "true");
  else document.documentElement.removeAttribute("data-reduce-motion");
})();
