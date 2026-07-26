WEBSITE GUIDE — paste this into Settings → AI Memory → Website Guide.
Covers what every tab, feature, and button on the site actually
does, so the Loremaster (or any future AI feature) can answer
questions about using the site itself, separate from world lore.

=== NAVIGATION ===
Left sidebar: Dashboard, Player, Battle Log, Settings, Gameplay,
KDA/XP, Top Clips. Right sidebar: Leaderboards, World Map, Guild,
Duel Trade, Shop, Mail, Party. Header: gamer name, Gold/AP wallet,
Duel Chat button, World Lore button.

=== DASHBOARD (index.html) ===
The landing page after login. Shows League Summary (matches played,
win rate, streak, last match KDA), Character Summary (level, class,
rank) with a link to the Player tab, Today's Kingdom News (an
AI-generated daily blurb, refreshable), and placeholders for World
Event and Daily Missions. A one-time Welcome modal appears on a
true browser refresh (not on regular navigation) introducing new
players to the game.

=== PLAYER (character.html) ===
Subtabs: Overview, Player Card, Stats, Attributes, Inventory,
Class, Progression.
- Player Card: shows your class's 3 fixed abilities (always
  included in every fight) plus "Your Cards" — every creature
  ability card you've earned, grouped by rank (SS down to E).
- Inventory: only shop-purchased Weapons, Armor, and Consumables,
  grouped by category. Does not show Legendary items or Ancient
  Artifacts — those come from a separate discovery system.
- Class: pick your class from all 10 real options, each with
  different stats and one passive. Class becomes permanent
  (locked) the moment you enter your first political hierarchy
  fight (Warriors through Champion) — Primordial and creature
  fights don't lock it.
- Progression: live rank/level/XP, kingdoms unlocked, current
  hierarchy progress, and PvG (Primordial) objective checklist.

=== BATTLE LOG ===
History of past fights and their outcomes.

=== SETTINGS ===
Includes Theme/Display, Music & Sound Effects (mute, volume,
upload your own ambient track — default plays automatically on
World Map only), API Keys (personal Gemini and Riot keys, never
shared between players), AI Memory (see below), and Content Tools
(a private drafting aid, not player-facing).

=== AI MEMORY (in Settings) ===
Three subtabs, all shared site-wide (same for every player):
- Information: the world's actual content — lore, kingdoms,
  characters, items.
- Instructions: how systems work — game rules and mechanics.
- Website Guide: this document — what the site's features do.
Edited by whoever manages the site; every AI feature (Loremaster,
Battle Narration, Daily Kingdom News, etc.) is grounded in these.

=== GAMEPLAY ===
Two subtabs: Game Rules (full mechanics reference — combat, cards,
classes, gear, progression, losses, the mystery mini-games) and
Game Objective (the short-to-endgame arc, including PvG).

=== KDA/XP ===
Riot API-based League match syncing. Auto-imports your recent
League matches (KDA, win/loss) which can optionally feed into XP
gain, alongside all the other ways to earn XP in-game.

=== TOP CLIPS ===
Google Drive-integrated highlight clips.

=== LEADERBOARDS ===
Site-wide rankings.

=== WORLD MAP ===
The core gameplay hub. A translucent overlay with an "I solemnly
swear I'm up to something" button sits over the map on load —
clicking it reveals the map and starts the default ambient music
track (restarts from 0:00 every time you arrive here from
elsewhere; keeps playing uninterrupted through anything you click
within this page).
- Kingdom markers: click a kingdom name to see its hierarchy
  ladder (Warriors through Champion/Monarch) and challenge NPCs
  there, provided you're physically in that kingdom.
- Shop markers (weapon/armor/consumable icons per kingdom): click
  to open a popup shop, browse items, and buy if you're currently
  in that kingdom.
- Whisper markers (small "!" icons): daily AI-generated gossip per
  kingdom, refreshed once per day site-wide.
- Roam / Travel the Roads: random encounters, weighted by rarity.
  Travel the Roads may also offer a traveler with three mini-games
  instead of a fight — PKMN (real Pokemon), NRTO (real Naruto
  characters), LOL (real League champions) — each a Wordle-style
  guessing game with rank/autocomplete-assisted input, paying gold
  on a correct solve.
- Targeted Hunts: track a specific creature once partially
  learned.
- Challenging a kingdom's Primordial God (endgame, requires all 9
  kingdoms conquered, all 9 Champions defeated, every SS creature
  defeated at least once) opens from the kingdom's name once
  eligible.
- Defeating a Champion triggers a 3-card mystery reward pick (gold,
  more gold, or one of that Champion's real abilities).

=== GUILD ===
Four subtabs: Guild, Guild Bosses, Guild Quests, Guild Shop.

=== DUEL TRADE ===
Two things live here, kept separate on purpose: challenging other
players to a duel (with an optional wager — gold, AP, items, and/or
cards, escrowed on lock-in and paid out entirely to the winner when
the duel ends), and general gift-style trading (offer gold, AP, any
number of items, and any number of ability cards — rank-sorted,
same style as the Player Card tab — to another player by gamer
name; they can Accept or Reject).

=== SHOP ===
Browse-only catalog mirror of what's purchasable across kingdoms —
actual buying happens via World Map's kingdom shop popups.

=== MAIL ===
Subtabs: NPC Letters, Guild Invitations, Auction Sales,
Announcements.

=== PARTY ===
Subtabs: Friends (add by gamer name, view list), Party (form a
party, invite others by gamer name — accepting brings the invited
player into your kingdom, keeping their own class/rank/cards/gear;
party members can pick from each other's owned cards when building
a fight loadout), Invites (accept/reject incoming party invites),
Shared Quests.

=== DUEL CHAT (pvp-chat.html) ===
Tabs: PvP (live duels), PvE (subtabs: vs Creature, vs Characters —
houses all creature and hierarchy card-battle fights), PvG
(Primordial challenge tracker and objectives). Every fight shows a
full-screen win/loss banner with real details (XP, gold, level/rank
changes) and a manual Next button — no auto-redirect. A duel's Prep
screen includes a real Cancel Duel option that refunds any locked
bet.

=== WORLD LORE (world-chat.html) ===
The full written story: World History, the Nine Kingdoms, Cities,
Politics, Primordial Gods, Characters, Creatures. Legendary
Artifacts, Timeline, and Books & Journals exist as tabs but are not
yet written.
