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
 * - attackTypes / defendType: labels for the action buttons on that
 *   character's turn (e.g. ["Slash", "Thrust"], "Parry").
 * - spells: optional spell ids offered on that character's turn
 *   (see SPELLS for names and effects).
 */

export const STAMINA_LOSS_PER_ROUND = 0.5;
export const MIN_INTELLIGENCE_TO_CAST = 7;
/** Attack and Defend rolls succeed if random(1..SCALE) <= rating. */
export const SUCCESS_SCALE = 10;

/**
 * @typedef {object} SpellDef
 * @property {string} id
 * @property {string} name          button label in combat
 * @property {string} description
 * @property {{ type: string, amount?: number, multiplier?: number, turns?: number }} effect
 */

/** @type {Record<string, SpellDef>} */
export const SPELLS = {
  "holy-restoration": {
    id: "holy-restoration",
    name: "Holy Restoration",
    description:
      "Restore 5 hit points to the caster. Cannot exceed maximum hit points.",
    effect: { type: "healSelf", amount: 5 },
  },
  "lightning-strike": {
    id: "lightning-strike",
    name: "Lightning Strike",
    description: "Deal 5 damage to a chosen target.",
    effect: { type: "damageTarget", amount: 5 },
  },
  fireball: {
    id: "fireball",
    name: "Fireball",
    description: "Deal 5 damage to a chosen target.",
    effect: { type: "damageTarget", amount: 5 },
  },
  shield: {
    id: "shield",
    name: "Shield",
    description:
      "Reduce all damage dealt by enemies on the following turn by 50%.",
    effect: { type: "enemyDamageReduceNextTurn", multiplier: 0.5 },
  },
  "acid-rain": {
    id: "acid-rain",
    name: "Acid Rain",
    description: "Deal 2 damage to all opponents.",
    effect: { type: "damageAllOpponents", amount: 2 },
  },
  "hold-fast": {
    id: "hold-fast",
    name: "Hold Fast",
    description: "Chosen opponent cannot attack on their next turn.",
    effect: { type: "preventTargetAttackNextTurn" },
  },
  "healing-touch": {
    id: "healing-touch",
    name: "Healing Touch",
    description:
      "Restore 5 hit points to a chosen character. Cannot exceed maximum hit points.",
    effect: { type: "healTarget", amount: 5 },
  },
  "divine-protection": {
    id: "divine-protection",
    name: "Divine Protection",
    description:
      "For the next two turns, the chosen character cannot receive damage.",
    effect: { type: "preventTargetDamageTurns", turns: 2 },
  },
  restore: {
    id: "restore",
    name: "Restore",
    description: "Restore a chosen character's stamina to full.",
    effect: { type: "restoreStaminaFull" },
  },
  "verdant-shield": {
    id: "verdant-shield",
    name: "Verdant Shield",
    description:
      "Any damage dealt next turn to any character is reduced by 25%.",
    effect: { type: "allDamageTakenReduceNextTurn", multiplier: 0.75 },
  },
};

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
 * @property {string[]} [attackTypes] combat attack button labels
 * @property {string} [defendType]    combat defend button label
 * @property {string[]} [spells]      spell ids from SPELLS
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
    attackTypes: ["Slash"],
    defendType: "Parry",
    spells: [],
  },
  {
    id: "fighter",
    name: "Fighter",
    blurb: "Versatile warrior packed with combat maneuvers.",
    detail:
      "Fighter — Versatile warrior, lots of attacks and combat maneuvers.",
    hitPoints: 85,
    attack: 7,
    defend: 8,
    stamina: 6,
    intelligence: 4,
    attackTypes: ["Slash", "Thrust"],
    defendType: "Parry",
    spells: [],
  },
  {
    id: "paladin",
    name: "Paladin",
    blurb: "Holy warrior with healing and divine smite.",
    detail:
      "Paladin — Holy warrior with spellcasting and healing, plus divine smite damage.",
    hitPoints: 85,
    attack: 7,
    defend: 8,
    stamina: 6,
    intelligence: 7,
    attackTypes: ["Thrust"],
    defendType: "Parry",
    spells: ["holy-restoration"],
  },
  {
    id: "ranger",
    name: "Ranger",
    blurb: "Archer-tracker hybrid with light magic.",
    detail:
      "Ranger — Archer/tracker hybrid, ranged combat with some spellcasting.",
    hitPoints: 60,
    attack: 7,
    defend: 7,
    stamina: 9,
    intelligence: 6,
    attackTypes: ["Fire Arrows"],
    defendType: "Dodge",
    spells: [],
  },
  {
    id: "wizard",
    name: "Wizard",
    blurb: "Book-learned caster with vast spell variety.",
    detail:
      "Wizard — Book-learned spellcaster, wide spell variety, squishy but powerful.",
    hitPoints: 50,
    attack: 2,
    defend: 2,
    stamina: 3,
    intelligence: 10,
    attackTypes: ["Strike"],
    defendType: "Dodge",
    spells: ["lightning-strike", "fireball", "shield"],
  },
  {
    id: "sorcerer",
    name: "Sorcerer",
    blurb: "Innate magic with flexible casting.",
    detail:
      "Sorcerer — Innate spellcaster (magic in their blood), fewer spells but more flexibility.",
    hitPoints: 50,
    attack: 2,
    defend: 2,
    stamina: 4,
    intelligence: 10,
    attackTypes: ["Strike"],
    defendType: "Dodge",
    spells: ["fireball", "acid-rain", "hold-fast"],
  },
  {
    id: "cleric",
    name: "Cleric",
    blurb: "Divine healer with solid battlefield presence.",
    detail: "Cleric — Divine spellcaster, healer, moderate combat ability.",
    hitPoints: 40,
    attack: 0,
    defend: 4,
    stamina: 4,
    intelligence: 10,
    attackTypes: ["Strike"],
    defendType: "Dodge",
    spells: ["healing-touch", "divine-protection"],
  },
  {
    id: "druid",
    name: "Druid",
    blurb: "Nature magic, wildshape, and healing.",
    detail:
      "Druid — Nature spellcaster, can wildshape into animals, healer.",
    hitPoints: 50,
    attack: 2,
    defend: 4,
    stamina: 7,
    intelligence: 10,
    attackTypes: ["Strike"],
    defendType: "Dodge",
    spells: ["restore", "verdant-shield"],
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
      typeof cls.stamina === "number"
  );
}

export function getIntelligence(cls) {
  return typeof cls?.intelligence === "number" ? cls.intelligence : null;
}

export function getSpell(spellId) {
  return SPELLS[spellId] || null;
}

export function getClassSpells(cls) {
  if (!cls || !Array.isArray(cls.spells)) return [];
  return cls.spells.map(getSpell).filter(Boolean);
}

export function canCastSpells(cls) {
  const intelligence = getIntelligence(cls);
  return Boolean(
    cls &&
      intelligence !== null &&
      intelligence >= MIN_INTELLIGENCE_TO_CAST &&
      getClassSpells(cls).length > 0
  );
}

/** Chance of success for an Attack or Defend rating (0–1). */
export function successChance(rating) {
  const value = Number(rating);
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value / SUCCESS_SCALE));
}

export function getAttackTypes(cls) {
  if (!cls) return [];
  if (Array.isArray(cls.attackTypes) && cls.attackTypes.length) {
    return [...cls.attackTypes];
  }
  if (typeof cls.attackType === "string" && cls.attackType) {
    return [cls.attackType];
  }
  return [];
}

/**
 * Apply a known spell. Returns a result describing the change.
 * Battle UI is not wired yet — this encodes the mechanical effect.
 *
 * @param {object} caster
 * @param {string} spellId
 * @param {{
 *   target?: object,
 *   opponents?: object[],
 *   battle?: {
 *     enemyDamageMultiplierNextTurn?: number,
 *     allDamageTakenMultiplierNextTurn?: number
 *   }
 * }} [context]
 */
export function applySpell(caster, spellId, context = {}) {
  const spell = getSpell(spellId);
  if (!caster || !spell) {
    return { ok: false, reason: "unknown-spell" };
  }
  if (
    typeof caster.intelligence !== "number" ||
    caster.intelligence < MIN_INTELLIGENCE_TO_CAST
  ) {
    return { ok: false, reason: "intelligence-too-low" };
  }

  if (spell.effect.type === "healSelf" || spell.effect.type === "healTarget") {
    const target =
      spell.effect.type === "healSelf" ? caster : context.target;
    if (!target || typeof target.hitPoints !== "number") {
      return {
        ok: false,
        reason: spell.effect.type === "healSelf" ? "unknown-spell" : "needs-target",
      };
    }
    const before = target.hitPoints;
    const max =
      typeof target.maxHitPoints === "number"
        ? target.maxHitPoints
        : target.hitPoints;
    const amount = Number(spell.effect.amount) || 0;
    target.hitPoints = Math.min(max, before + amount);
    return {
      ok: true,
      spellId: spell.id,
      name: spell.name,
      healed: target.hitPoints - before,
      targetId: target.id,
      hitPoints: target.hitPoints,
      maxHitPoints: max,
    };
  }

  if (spell.effect.type === "damageTarget") {
    const target = context.target;
    if (!target || typeof target.hitPoints !== "number") {
      return { ok: false, reason: "needs-target" };
    }
    const amount = Number(spell.effect.amount) || 0;
    const before = target.hitPoints;
    target.hitPoints = Math.max(0, before - amount);
    if (target.hitPoints <= 0) target.alive = false;
    return {
      ok: true,
      spellId: spell.id,
      name: spell.name,
      damage: before - target.hitPoints,
      targetId: target.id,
      targetHitPoints: target.hitPoints,
    };
  }

  if (spell.effect.type === "damageAllOpponents") {
    const opponents = context.opponents;
    if (!Array.isArray(opponents) || !opponents.length) {
      return { ok: false, reason: "needs-opponents" };
    }
    const amount = Number(spell.effect.amount) || 0;
    const hits = opponents.map((target) => {
      if (!target || typeof target.hitPoints !== "number") {
        return { targetId: target?.id, damage: 0 };
      }
      const before = target.hitPoints;
      target.hitPoints = Math.max(0, before - amount);
      if (target.hitPoints <= 0) target.alive = false;
      return {
        targetId: target.id,
        damage: before - target.hitPoints,
        targetHitPoints: target.hitPoints,
      };
    });
    return {
      ok: true,
      spellId: spell.id,
      name: spell.name,
      hits,
      totalDamage: hits.reduce((sum, hit) => sum + hit.damage, 0),
    };
  }

  if (spell.effect.type === "enemyDamageReduceNextTurn") {
    const battle = context.battle;
    if (!battle) {
      return { ok: false, reason: "needs-battle" };
    }
    const multiplier = Number(spell.effect.multiplier);
    battle.enemyDamageMultiplierNextTurn = Number.isFinite(multiplier)
      ? multiplier
      : 0.5;
    return {
      ok: true,
      spellId: spell.id,
      name: spell.name,
      enemyDamageMultiplierNextTurn: battle.enemyDamageMultiplierNextTurn,
    };
  }

  if (spell.effect.type === "preventTargetAttackNextTurn") {
    const target = context.target;
    if (!target) {
      return { ok: false, reason: "needs-target" };
    }
    target.cannotAttackNextTurn = true;
    return {
      ok: true,
      spellId: spell.id,
      name: spell.name,
      targetId: target.id,
      cannotAttackNextTurn: true,
    };
  }

  if (spell.effect.type === "preventTargetDamageTurns") {
    const target = context.target;
    if (!target) {
      return { ok: false, reason: "needs-target" };
    }
    const turns = Number(spell.effect.turns) || 0;
    target.damageImmuneTurns = Math.max(target.damageImmuneTurns || 0, turns);
    return {
      ok: true,
      spellId: spell.id,
      name: spell.name,
      targetId: target.id,
      damageImmuneTurns: target.damageImmuneTurns,
    };
  }

  if (spell.effect.type === "restoreStaminaFull") {
    const target = context.target;
    if (!target || typeof target.stamina !== "number") {
      return { ok: false, reason: "needs-target" };
    }
    const max =
      typeof target.maxStamina === "number" ? target.maxStamina : target.stamina;
    const before = target.stamina;
    target.stamina = max;
    return {
      ok: true,
      spellId: spell.id,
      name: spell.name,
      targetId: target.id,
      staminaRestored: target.stamina - before,
      stamina: target.stamina,
      maxStamina: max,
    };
  }

  if (spell.effect.type === "allDamageTakenReduceNextTurn") {
    const battle = context.battle;
    if (!battle) {
      return { ok: false, reason: "needs-battle" };
    }
    const multiplier = Number(spell.effect.multiplier);
    battle.allDamageTakenMultiplierNextTurn = Number.isFinite(multiplier)
      ? multiplier
      : 0.75;
    return {
      ok: true,
      spellId: spell.id,
      name: spell.name,
      allDamageTakenMultiplierNextTurn: battle.allDamageTakenMultiplierNextTurn,
    };
  }

  return { ok: false, reason: "unsupported-effect" };
}

export function createCombatant(classId) {
  const cls = getCharacterClass(classId);
  if (!cls || !hasCombatStats(cls)) return null;
  const attackTypes = getAttackTypes(cls);
  const spellDefs = getClassSpells(cls);
  return {
    id: cls.id,
    name: cls.name,
    maxHitPoints: cls.hitPoints,
    hitPoints: cls.hitPoints,
    attack: cls.attack,
    defend: cls.defend,
    maxStamina: cls.stamina,
    stamina: cls.stamina,
    intelligence: getIntelligence(cls),
    attackTypes,
    attackType: attackTypes[0] || null,
    defendType: cls.defendType,
    spells: spellDefs.map((s) => s.id),
    spellNames: spellDefs.map((s) => s.name),
    canCast: canCastSpells(cls),
    alive: true,
  };
}

/** Short multi-line summary for party-select / HUD. */
export function formatCombatStats(cls) {
  if (!hasCombatStats(cls)) {
    return `${cls.detail}\n\nCombat stats coming soon.`;
  }

  const attackTypes = getAttackTypes(cls);
  const spellDefs = getClassSpells(cls);
  let spellLine;
  if (spellDefs.length) {
    const names = spellDefs.map((s) => s.name).join(", ");
    const notes = spellDefs
      .map((s) => `  · ${s.name}: ${s.description}`)
      .join("\n");
    spellLine = `Spells: ${names}\n${notes}`;
  } else {
    const intelligence = getIntelligence(cls);
    if (intelligence === null) {
      spellLine = "Spells: none";
    } else if (intelligence >= MIN_INTELLIGENCE_TO_CAST) {
      spellLine = "Spells: none";
    } else {
      spellLine = `Spells: none (needs Intelligence ${MIN_INTELLIGENCE_TO_CAST}+ to cast)`;
    }
  }

  const intelligence = getIntelligence(cls);
  const intLabel = intelligence === null ? "—" : String(intelligence);

  return [
    cls.detail,
    "",
    `HP ${cls.hitPoints}  ·  Attack ${cls.attack}/${SUCCESS_SCALE}  ·  Defend ${cls.defend}/${SUCCESS_SCALE}`,
    `Stamina ${cls.stamina}  ·  Intelligence ${intLabel}`,
    `Attack: ${attackTypes.join(", ") || "—"}  ·  Defend: ${cls.defendType || "—"}`,
    spellLine,
  ].join("\n");
}
