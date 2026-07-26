# AETHERIS — GAME RULES (PRIVATE — NOT PUBLIC)

None of these files are linked anywhere on the website. This folder holds **Type 2
information only**: standing rules that dictate how the world and game behave,
permanently, once built — never content for a player to read.

## The split

- **Content (Type 1)** — what exists in the world. Characters, NPCs, locations,
  kingdoms, weapons, monsters, lore, items, shops, quests, dialogue, events. Lives in
  the actual database and on actual pages (World Lore, Character, Shop, etc.).
- **Rules (Type 2)** — how the website/game behaves. Lives here, as plain markdown,
  until the corresponding system is actually built — at which point it becomes real
  database functions and stops needing a spec at all.

## Files in this folder

- `NPC.md` — NPC Engine: memory, families, schedules, dialogue layers, quest pools
- `Creatures.md` — Creature Engine: AI, ecosystems, taming, evolution, research
- `Reputation.md` — Reputation Engine: how standing with kingdoms/factions is tracked
- `Guilds.md` — Guild Engine: organization growth, elections, hidden membership
- `Economy.md` — Item & Loot Engine: discovery philosophy, cursed/living items, sets

## Rule for future docs

Every new "how I want the world to work" doc gets sorted into the right file here —
existing or new. If it's genuinely a new domain (Combat, Travel, Time, Death), it gets
its own file. Nothing gets dumped into World Lore or any player-facing page.

**Note:** Combat has its own evolving design log tracked directly in conversation
(it's large enough and already mid-build), and anything with a working database
function backing it (duel resolution, discovery odds, momentum thresholds, etc.) is
real running code now, not a spec entry — specs are only for what's *not yet built*.
