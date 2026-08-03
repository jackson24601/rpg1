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

export function buildEncounter(enemyTypeId, count = 1) {
  const foes = [];
  for (let i = 0; i < count; i += 1) {
    const foe = createCombatEnemy(enemyTypeId);
    if (foe) {
      if (count > 1) foe.name = `${foe.name} ${i + 1}`;
      foes.push(foe);
    }
  }
  return foes;
}
