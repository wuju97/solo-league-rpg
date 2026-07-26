// ============================================================
// SOLO LEAGUE RPG — Audio Manager
// Handles sound effects (tab navigation, notifications) and music
// (battle music, login/ambient music) using files the player
// uploads in Settings -> Music & Sound Effects. SFX fall back to
// synthesized tones (Web Audio API) when no file is uploaded, so
// there's always feedback even before anyone uploads anything.
// Load this after supabaseClient.js on every page.
// ============================================================

const SoloLeagueAudio = (function () {
  let ctx = null;
  // Plays automatically for every player by default -- upload your
  // own track in Settings to override it, same as before.
  const DEFAULT_AMBIENT_URL = "default-ambient.mp3";

  // Some hosts (Vercel, by default) serve clean URLs with .html
  // stripped -- "/world" instead of "/world.html". Checking for
  // either means this works locally (Live Server, full .html path)
  // and in production (clean URL) without needing to know which
  // one's actually in effect.
  function isWorldMapPage(){
    const path = window.location.pathname;
    return path.endsWith("world.html") || path.endsWith("/world") || path === "/world";
  }
  let prefs = {
    music_enabled: true, sfx_enabled: true, music_volume: 50, sfx_volume: 70,
    login_music_enabled: true, login_music_volume: 40,
    battle_music_url: null, sfx_custom_url: null, login_music_url: null,
  };
  let musicElement = null;
  let ambientElement = null;
  let ambientPausedForBattle = false;

  function getContext() {
    if (!ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioContextClass();
    }
    return ctx;
  }

  async function loadPrefs() {
    const { data: sessionData } = await sb.auth.getSession();
    if (!sessionData.session) return;
    const { data } = await sb.rpc("get_or_create_preferences");
    const p = Array.isArray(data) ? data[0] : data;
    if (p) prefs = p;
  }

  function tone(freq, durationMs, type = "sine", volumeMult = 1) {
    if (!prefs.sfx_enabled) return;
    try {
      const audioCtx = getContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const vol = (prefs.sfx_volume / 100) * 0.15 * volumeMult;
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + durationMs / 1000);
    } catch (e) {
      // Web Audio can fail before any user gesture on the page — skip silently
    }
  }

  function playCustomSfx() {
    if (!prefs.sfx_enabled || !prefs.sfx_custom_url) return false;
    try {
      const audio = new Audio(prefs.sfx_custom_url);
      audio.volume = prefs.sfx_volume / 100;
      audio.play().catch(() => {});
      return true;
    } catch (e) {
      return false;
    }
  }

  function startAmbient() {
    if (!prefs.login_music_enabled) return;
    if (ambientElement) return;
    // Ambient music only ever plays on the World Map -- every
    // other page stays silent for this track, and every time World
    // Map loads fresh (from anywhere else) it starts over from 0:00.
    if (!isWorldMapPage()) return;
    const trackUrl = prefs.login_music_url || DEFAULT_AMBIENT_URL;
    ambientElement = new Audio(trackUrl);
    ambientElement.loop = true;
    ambientElement.volume = prefs.login_music_volume / 100;
    ambientElement.play().catch(() => {}); // the persistent click listener below handles retrying
  }

  function stopAmbient() {
    if (ambientElement) {
      ambientElement.pause();
      ambientElement = null;
    }
  }

  // Browsers block audio autoplay until a real user gesture happens
  // on the page. A single one-shot retry isn't reliable -- if that
  // one attempt also gets blocked (timing edge cases), there was
  // previously no further recovery until a full page reload. This
  // listener stays active permanently and checks on every click
  // whether ambient music SHOULD be playing but isn't, fixing it
  // whenever that's true rather than only once.
  document.addEventListener("click", () => {
    // World Map's ambient track is controlled only by its own
    // "I solemnly swear" button -- no other click on that page
    // should start or resume it.
    if (isWorldMapPage()) return;
    if (prefs.login_music_enabled && ambientElement && ambientElement.paused && !ambientPausedForBattle) {
      ambientElement.play().catch(() => {});
    }
  });

  return {
    init() {
      // Must call play() synchronously, in the same tick as the
      // click itself -- awaiting loadPrefs() first (a network
      // call) breaks the browser's "this was a real user click"
      // window, and play() gets rejected even inside a click
      // handler. Start immediately with whatever prefs are already
      // known (defaults on a first visit), then correct the volume
      // or pause it once the real saved prefs come back.
      startAmbient();
      loadPrefs().then(() => {
        if (ambientElement) {
          ambientElement.volume = prefs.login_music_volume / 100;
          if (!prefs.login_music_enabled) stopAmbient();
        }
      });
    },
    async refreshPrefs() {
      const wasLoginUrl = prefs.login_music_url;
      await loadPrefs();

      // Stop immediately if it just got disabled -- previously
      // this was never checked here at all, so disabling the
      // toggle had no actual effect on audio that was already
      // playing.
      if (!prefs.login_music_enabled && ambientElement){
        stopAmbient();
        return;
      }

      // if the ambient track changed, restart with the new one
      if (prefs.login_music_url !== wasLoginUrl && ambientElement) {
        stopAmbient();
      }
      startAmbient();
      if (ambientElement) ambientElement.volume = prefs.login_music_volume / 100;
    },
    playNavClick() {
      tone(720, 60, "sine", 0.6);
    },
    playNotification() {
      if (playCustomSfx()) return;
      tone(660, 90, "triangle", 0.8);
      setTimeout(() => tone(880, 120, "triangle", 0.8), 90);
    },
    playVictory() {
      [523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => tone(freq, 180, "triangle", 0.9), i * 110);
      });
    },
    playDefeat() {
      [392, 349, 311].forEach((freq, i) => {
        setTimeout(() => tone(freq, 220, "sine", 0.8), i * 140);
      });
    },
    playClick() {
      tone(500, 40, "square", 0.4);
    },
    playBattleMusic() {
      if (!prefs.music_enabled || !prefs.battle_music_url) return;
      if (musicElement) return;

      // pause ambient music while battle music plays, resume after
      if (ambientElement && !ambientElement.paused) {
        ambientElement.pause();
        ambientPausedForBattle = true;
      }

      musicElement = new Audio(prefs.battle_music_url);
      musicElement.loop = true;
      musicElement.volume = prefs.music_volume / 100;
      musicElement.play().catch(() => {});
    },
    stopBattleMusic() {
      if (musicElement) {
        musicElement.pause();
        musicElement = null;
      }
      if (ambientPausedForBattle && ambientElement) {
        ambientElement.play().catch(() => {});
        ambientPausedForBattle = false;
      }
    },
    getPrefs() {
      return prefs;
    },
  };
})();

// Explicitly attached here -- a top-level const does NOT
// automatically become a window property (unlike var), and several
// pages across the site reference window.SoloLeagueAudio directly.
// Without this line those calls silently do nothing: battle music
// never starting, victory/defeat sounds never playing, the SFX
// test button doing nothing, and volume/settings changes never
// live-refreshing on the current page.
window.SoloLeagueAudio = SoloLeagueAudio;

(async function () {
  // World Map controls its own ambient start via the "I solemnly
  // swear" button -- calling init() here too would attempt to
  // play immediately on page load, before any click has happened,
  // which the browser correctly rejects. Every other page still
  // gets its normal init. Checks both "/world.html" (local Live
  // Server) and "/world" (Vercel's default clean-URL stripping).
  const path = window.location.pathname;
  const onWorldMap = path.endsWith("world.html") || path.endsWith("/world") || path === "/world";
  if (!onWorldMap) {
    await SoloLeagueAudio.init();
  }

  // Play a soft click on every tab navigation click, site-wide, via
  // event delegation — no need to touch every individual tab's
  // click handler across every page.
  document.addEventListener("click", (evt) => {
    if (evt.target.closest(".page-tab-btn")) {
      SoloLeagueAudio.playNavClick();
    }
  });
})();
