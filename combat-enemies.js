/**
 * Enemy combatant definitions used in battle encounters.
 * Overworld chase sprites are separate (enemies.js).
 */

export const COMBAT_ENEMIES = {
  goblin: {
    id: "goblin",
    name: "Goblin",
    src: "assets/enemies/goblin.png",
    hitPoints: 5,
    /** Attack rating out of 10 (hit chance). */
    attack: 5,
    /** Damage dealt on a successful hit. Defaults to 1 if omitted. */
    attackDamage: 1,
    defend: null,
    stamina: null,
    intelligence: null,
    attackTypes: ["Club"],
    defendType: null,
    spells: [],
    skills: [],
    ai: "alwaysAttack",
  },
  orc: {
    id: "orc",
    name: "Orc",
    src: "assets/enemies/orc.png",
    hitPoints: 10,
    /** 75% chance to hit. */
    attack: 7.5,
    attackDamage: 2,
    defend: null,
    stamina: null,
    intelligence: null,
    attackTypes: ["Slash"],
    defendType: null,
    spells: [],
    skills: [],
    /** Always attack the living party member with the lowest HP. */
    ai: "alwaysAttackLowestHp",
  },
  hydra: {
    id: "hydra",
    name: "Hydra",
    src: "assets/enemies/hydra.png",
    hitPoints: 20,
    /** 75% chance to hit. */
    attack: 7.5,
    attackDamage: 5,
    defend: null,
    stamina: null,
    intelligence: null,
    attackTypes: ["Bite"],
    defendType: null,
    spells: [],
    skills: [],
    ai: "alwaysAttack",
    /** Flat gold awarded when the encounter is won. */
    goldDrop: 20,
  },
};

let nextCombatEnemyId = 1;

export function createCombatEnemy(typeId) {
  const template = COMBAT_ENEMIES[typeId];
  if (!template) return null;
  return {
    instanceId: `foe-${nextCombatEnemyId++}`,
    id: template.id,
    name: template.name,
    src: template.src,
    kind: "enemy",
    maxHitPoints: template.hitPoints,
    hitPoints: template.hitPoints,
    attack: template.attack,
    attackDamage: template.attackDamage ?? 1,
    defend: template.defend,
    maxStamina: template.stamina,
    stamina: template.stamina,
    intelligence: template.intelligence,
    attackTypes: [...template.attackTypes],
    attackType: template.attackTypes[0] || "Club",
    defendType: template.defendType,
    spells: [],
    skills: [],
    canCast: false,
    ai: template.ai,
    alive: true,
    defending: false,
    skipNextTurn: false,
  };
}

/** Roll a fair six-sided die (1–6). */
export function rollD6() {
  return 1 + Math.floor(Math.random() * 6);
}

/** Random integer from min to max inclusive. */
export function rollRange(min, max) {
  const lo = Math.floor(min);
  const hi = Math.floor(max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/**
 * Troop size at combat start.
 * Goblins: d6 (1–6). Orcs: 1–3. Hydras: always 1. Others: explicit count or 1.
 */
export function encounterCountFor(enemyTypeId, explicitCount) {
  if (enemyTypeId === "goblin") {
    return rollD6();
  }
  if (enemyTypeId === "orc") {
    return rollRange(1, 3);
  }
  if (enemyTypeId === "hydra") {
    return 1;
  }
  const n = Number(explicitCount);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

/** Gold awarded for defeating an encounter of this enemy type. */
export function goldDropFor(enemyTypeId) {
  const template = COMBAT_ENEMIES[enemyTypeId];
  if (template && typeof template.goldDrop === "number") {
    return template.goldDrop;
  }
  return null;
}

export function buildEncounter(enemyTypeId, count = 1) {
  const foes = [];
  const size = Math.max(1, Math.floor(count));
  for (let i = 0; i < size; i += 1) {
    const foe = createCombatEnemy(enemyTypeId);
    if (foe) {
      if (size > 1) foe.name = `${foe.name} ${i + 1}`;
      foes.push(foe);
    }
  }
  return foes;
}

/** Pick the living target with the lowest hit points (ties → first). */
export function pickLowestHpTarget(targets) {
  const living = (targets || []).filter((t) => t && t.alive && t.hitPoints > 0);
  if (!living.length) return null;
  return living.reduce((best, t) => (t.hitPoints < best.hitPoints ? t : best));
}
