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
    attack: 5,
    defend: null,
    stamina: null,
    intelligence: null,
    attackTypes: ["Club"],
    defendType: null,
    spells: [],
    skills: [],
    /** Placeholder AI — always attack for now. */
    ai: "alwaysAttack",
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

/**
 * Goblin encounters roll a d6 for troop size at combat start.
 * Other enemy types use the provided count (default 1).
 */
export function encounterCountFor(enemyTypeId, explicitCount) {
  if (enemyTypeId === "goblin") {
    return rollD6();
  }
  const n = Number(explicitCount);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
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
