/**
 * Playable class definitions and combat attributes.
 *
 * Combat rules (shared):
 * - Hit Points: at 0 the character dies.
 * - Attack / Defend: chance of success out of 10
 *   (10 = guaranteed, 7 = 70%, etc.).
 * - Stamina: at 0 the character skips their next turn.
 *   Characters lose STAMINA_LOSS_PER_ROUND each combat round;
 *   spells may restore stamina.
 * - Intelligence: required to cast spells (MIN_INTELLIGENCE_TO_CAST+).
 * - attackType / defendType: labels for the action buttons on that
 *   character's turn (e.g. "Slash", "Parry").
 * - spells: optional spell labels offered on that character's turn.
 */

export const STAMINA_LOSS_PER_ROUND = 0.5;
export const MIN_INTELLIGENCE_TO_CAST = 7;
/** Attack and Defend rolls succeed if random(1..SCALE) <= rating. */
export const SUCCESS_SCALE = 10;

/**
 * @typedef {object} CharacterClass
 * @property {string} id
 * @property {string} name
 * @property {string} blurb
 * @property {string} detail
 * @property {number} [hitPoints]
 * @property {number} [attack]      0–10 hit chance rating
 * @property {number} [defend]      0–10 defense chance rating
 * @property {number} [stamina]
 * @property {number} [intelligence]
 * @property {string} [attackType]  combat button label
 * @property {string} [defendType]  combat button label
 * @property {string[]} [spells]    spell button labels
 */

/** @type {CharacterClass[]} */
export const CLASSES = [
  {
    id: "barbarian",
    name: "Barbarian",
    blurb: "Rage-powered melee fighter and durable tank.",
    detail:
      "Barbarian — Rage-powered melee fighter, tank with high damage resistance.",
    hitPoints: 100,
    attack: 10,
    defend: 5,
    stamina: 8,
    intelligence: 1,
    attackType: "Slash",
    defendType: "Parry",
    spells: [],
  },
  {
    id: "fighter",
    name: "Fighter",
    blurb: "Versatile warrior packed with combat maneuvers.",
    detail:
      "Fighter — Versatile warrior, lots of attacks and combat maneuvers.",
  },
  {
    id: "paladin",
    name: "Paladin",
    blurb: "Holy warrior with healing and divine smite.",
    detail:
      "Paladin — Holy warrior with spellcasting and healing, plus divine smite damage.",
  },
  {
    id: "ranger",
    name: "Ranger",
    blurb: "Archer-tracker hybrid with light magic.",
    detail:
      "Ranger — Archer/tracker hybrid, ranged combat with some spellcasting.",
  },
  {
    id: "wizard",
    name: "Wizard",
    blurb: "Book-learned caster with vast spell variety.",
    detail:
      "Wizard — Book-learned spellcaster, wide spell variety, squishy but powerful.",
  },
  {
    id: "sorcerer",
    name: "Sorcerer",
    blurb: "Innate magic with flexible casting.",
    detail:
      "Sorcerer — Innate spellcaster (magic in their blood), fewer spells but more flexibility.",
  },
  {
    id: "cleric",
    name: "Cleric",
    blurb: "Divine healer with solid battlefield presence.",
    detail: "Cleric — Divine spellcaster, healer, moderate combat ability.",
  },
  {
    id: "druid",
    name: "Druid",
    blurb: "Nature magic, wildshape, and healing.",
    detail:
      "Druid — Nature spellcaster, can wildshape into animals, healer.",
  },
  {
    id: "rogue",
    name: "Rogue",
    blurb: "Sneaky burst damage and skill mastery.",
    detail:
      "Rogue — Sneaky damage dealer, best at skills and non-magical tricks, high burst damage.",
  },
  {
    id: "monk",
    name: "Monk",
    blurb: "Swift martial artist with deadly unarmed strikes.",
    detail:
      "Monk — Martial artist, fast movement, impressive unarmed combat.",
  },
  {
    id: "bard",
    name: "Bard",
    blurb: "Charming buffer, skill monkey, and support caster.",
    detail:
      "Bard — Jack-of-all-trades spellcaster, skill monkey, buffer/debuffer with charm magic.",
  },
  {
    id: "warlock",
    name: "Warlock",
    blurb: "Pact-bound blaster with unique invocations.",
    detail:
      "Warlock — Makes a pact with a powerful entity, unique invocation system, spell blasting.",
  },
];

const byId = new Map(CLASSES.map((cls) => [cls.id, cls]));

export function getCharacterClass(id) {
  return byId.get(id) || null;
}

export function hasCombatStats(cls) {
  return Boolean(
    cls &&
      typeof cls.hitPoints === "number" &&
      typeof cls.attack === "number" &&
      typeof cls.defend === "number" &&
      typeof cls.stamina === "number" &&
      typeof cls.intelligence === "number"
  );
}

export function canCastSpells(cls) {
  return Boolean(
    cls &&
      typeof cls.intelligence === "number" &&
      cls.intelligence >= MIN_INTELLIGENCE_TO_CAST &&
      Array.isArray(cls.spells) &&
      cls.spells.length > 0
  );
}

/** Chance of success for an Attack or Defend rating (0–1). */
export function successChance(rating) {
  const value = Number(rating);
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value / SUCCESS_SCALE));
}

/**
 * Fresh combatant state cloned from a class definition.
 * Used when battle starts — not yet wired into encounters.
 */
export function createCombatant(classId) {
  const cls = getCharacterClass(classId);
  if (!cls || !hasCombatStats(cls)) return null;
  return {
    id: cls.id,
    name: cls.name,
    maxHitPoints: cls.hitPoints,
    hitPoints: cls.hitPoints,
    attack: cls.attack,
    defend: cls.defend,
    maxStamina: cls.stamina,
    stamina: cls.stamina,
    intelligence: cls.intelligence,
    attackType: cls.attackType,
    defendType: cls.defendType,
    spells: [...(cls.spells || [])],
    canCast: canCastSpells(cls),
    alive: true,
  };
}

/** Short multi-line summary for party-select / HUD. */
export function formatCombatStats(cls) {
  if (!hasCombatStats(cls)) {
    return `${cls.detail}\n\nCombat stats coming soon.`;
  }

  const spellLine =
    cls.spells && cls.spells.length
      ? `Spells: ${cls.spells.join(", ")}`
      : cls.intelligence >= MIN_INTELLIGENCE_TO_CAST
        ? "Spells: none"
        : `Spells: none (needs Intelligence ${MIN_INTELLIGENCE_TO_CAST}+ to cast)`;

  return [
    cls.detail,
    "",
    `HP ${cls.hitPoints}  ·  Attack ${cls.attack}/${SUCCESS_SCALE}  ·  Defend ${cls.defend}/${SUCCESS_SCALE}`,
    `Stamina ${cls.stamina}  ·  Intelligence ${cls.intelligence}`,
    `Attack: ${cls.attackType}  ·  Defend: ${cls.defendType}`,
    spellLine,
  ].join("\n");
}
