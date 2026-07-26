# WEAPONS & EQUIPMENT RULES

(The 72 named weapons themselves — their names, prices, cities, stats, flavor text —
are Type 1 content, stored in the `weapon_items` database table. This file covers the
general mechanics that make any weapon actually function, regardless of which one.)

## Equipping
One weapon equipped at a time per character. Equipping a new (owned) weapon instantly
swaps out the old one — no cooldown, no cost, as long as it's already owned.

## Acquisition
Two paths to own a weapon: buy it outright with gold at its listed Buy Price, or
craft it from its recipe (see Crafting below). Both should be equally valid;
crafting is not meant to be strictly cheaper or a "trap" option — it should offer a
different tradeoff (time/material gathering vs. flat gold cost).

## Selling
Selling a weapon back removes it from Inventory and returns its Sell Price in gold
(roughly half of Buy Price, per the data already stored). Only sell weapons the
character isn't currently equipping.

## Tiers
Common → Rare → Epic → Legendary Craft, ascending in power and price. Tier is a
guide to relative strength, not a hard gate — classes can use lower-tier weapons
they've outgrown for flavor/collection reasons without penalty.

## Class Restrictions
Each weapon lists which classes can use it. A character can only equip a weapon
whose class list includes their own class.

## Passives
Every weapon has exactly one **visible passive** — always active, no trigger
condition needed to know about it (though the effect itself often has its own
trigger, e.g. "10% chance on basic attack"). Passive effects should resolve
automatically during combat resolution, checked whenever their trigger condition is
met (on attack, on block, on HP threshold, etc.) — the player never manually
activates a passive.

## Hidden Passives
Some weapons (not all) have a second passive that isn't shown to the wielder or
their opponent until it has actually triggered once in combat — mirroring the Class
Hidden Passive reveal mechanic (see `rules/` class ability design). Once revealed for
a given weapon, it should stay revealed for that player going forward (no need to
re-discover it every duel).

## Crafting
Each weapon's recipe lists specific materials and quantities. Some recipes require
an existing lower-tier weapon as an ingredient (e.g. Royal Longsword → Lion
Greatsword), meaning crafting can consume an owned weapon rather than just raw
materials — effectively an upgrade-in-place. Crafting should happen at the specific
named forge/workshop location listed per weapon (not craftable anywhere).

## Upgrade Paths
Weapons form chains (e.g. Royal Longsword → Knight Longsword → Lionblade). Each step
up requires crafting with the previous weapon as an ingredient. The final step in
several chains is a Legendary Kingdom Relic — these are the same Legendary Weapons
already gated behind the World Secrets/Artifacts discovery system, not simply
buyable/craftable at endgame. So the top of a weapon's upgrade chain should route
into that existing discovery mechanic rather than a normal crafting recipe.

## Materials
Materials are gathered from specific named locations (mines, dungeons, boss drops,
questline rewards) per the `material_locations` table — not purchasable directly in
a shop. Some materials are tied to defeating a specific creature or boss (e.g.
"Dragon Steel — forged after defeating an Elder Dragon"), meaning the Crafting engine
depends on the Creature/Combat engines existing first for those specific items.

## Conditional Passives Referencing "Enemy Type" (e.g. "against armored enemies",
## "against Shadow enemies", "against Bosses")
These conditions don't apply to PvP — a duel opponent is just another player, not a
typed "enemy." They're deferred until real PvE combat exists (Duel Chat → PvE tab,
currently a placeholder). Once monsters/bosses exist with actual armor and damage
types (depends on the Creature Engine, `rules/Creatures.md`), these conditions
should check the monster's type directly. Until then, they simply never trigger in
PvP duels — they're not approximated or faked, just correctly inert.

## Kingdom-Specific Shop Access (depends on Location Engine — not yet enforced)
Any kingdom-specific shop — Kingdom Armory weapons, and each kingdom's NPC
Specialty market — should only be purchasable while the player is physically
located in that kingdom, not from anywhere in the world. The only other way to
acquire an item from a kingdom-specific shop should be:
- Buying directly from the specific NPC who runs it (in person, in that kingdom), or
- As a reward from a quest that NPC or kingdom offers (the quest itself can hand out
  the item — the player doesn't separately "buy" it in that case).

This applies to: Kingdom Armory (Shop → Kingdom Armory tab) and Kingdom Specialties
(Shop → NPC Shops → Kingdom Specialties section). It does **not** apply to Universal
Shops (Weapon Smith, Armor Smith, Potion Shop, etc.) — those are explicitly available
in every major city regardless of which kingdom the player is in.

This depends entirely on the Player Location Engine existing first (not yet built).
Until then, kingdom-specific shop items are purchasable from anywhere as a
placeholder, and the UI carries a visible note saying so in both locations.

## Kingdom Identity
Each kingdom's weapons share a consistent mechanical theme (Valoria = defense/honor,
Frosthaven = Chill/endurance, Eldergrove = healing/poison, Pyrath = fire/burst,
Aetheria = mana/elemental, Azure Reach = mobility/positioning, Khar'Duun = holy/relic,
Blackfen = poison/bleed/attrition, Mordrath = shadow/fear/debuff). New weapons added
to a kingdom later should stay consistent with its established identity rather than
introducing mechanics that belong to a different kingdom.
