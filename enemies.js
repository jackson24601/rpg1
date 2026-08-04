/** Overworld enemy types and spawn rules. */

import { TERRAIN } from "./map-data.js";
import { WALK_BOUNDS, SPRITE_W, SPRITE_H, SCENE_W, SCENE_H } from "./scene-render.js";

/** Terrains where Goblins may appear. */
export const GOBLIN_TERRAINS = new Set([TERRAIN.forest, TERRAIN.meadow]);
/** Terrains where Orcs may appear. */
export const ORC_TERRAINS = new Set([TERRAIN.forest]);

export const ENEMY_TYPES = {
  goblin: {
    id: "goblin",
    name: "Goblin",
    src: "assets/enemies/goblin.png",
    /** Matches party walk speed (set by game). */
    speed: null,
  },
  orc: {
    id: "orc",
    name: "Orc",
    src: "assets/enemies/orc.png",
    speed: null,
  },
};

/** Chance a Goblin is scheduled shortly after entering a valid scene. */
export const EARLY_SPAWN_CHANCE = 0.5;
/** Early spawn lands somewhere in this window after entry (ms). */
export const EARLY_SPAWN_WINDOW_MS = 1000;
/** If still alone this long, a Goblin is guaranteed (ms). */
export const FORCED_SPAWN_MS = 30_000;

/** Orcs: after this delay, 50% chance one appears and chases the party. */
export const ORC_SPAWN_DELAY_MS = 2000;
export const ORC_SPAWN_CHANCE = 0.5;

let nextEnemyId = 1;

export function canSpawnGoblins(cell) {
  return Boolean(
    cell &&
      !cell.special &&
      !cell.noSpawn &&
      GOBLIN_TERRAINS.has(cell.terrain)
  );
}

export function canSpawnOrcs(cell) {
  return Boolean(
    cell &&
      !cell.special &&
      !cell.noSpawn &&
      ORC_TERRAINS.has(cell.terrain)
  );
}

export function createGoblin(x, y, facing = "down") {
  return {
    id: `enemy-${nextEnemyId++}`,
    type: "goblin",
    name: ENEMY_TYPES.goblin.name,
    src: ENEMY_TYPES.goblin.src,
    x,
    y,
    facing,
  };
}

export function createOrc(x, y, facing = "down") {
  return {
    id: `enemy-${nextEnemyId++}`,
    type: "orc",
    name: ENEMY_TYPES.orc.name,
    src: ENEMY_TYPES.orc.src,
    x,
    y,
    facing,
  };
}

/**
 * Pick a spawn point on the walkable floor, away from the party.
 */
export function pickSpawnAwayFrom(partyPos, minDist = 70) {
  const { minX, maxX, minY, maxY } = WALK_BOUNDS;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    const dx = x - partyPos.x;
    const dy = y - partyPos.y;
    if (Math.hypot(dx, dy) >= minDist) {
      return { x, y };
    }
  }
  // Fallback: opposite corner from the party
  const left = partyPos.x > SCENE_W / 2;
  const top = partyPos.y > (minY + maxY) / 2;
  return {
    x: left ? minX + 8 : maxX - 8,
    y: top ? minY + 8 : maxY - 8,
  };
}

export function clampEnemyPos(x, y) {
  return {
    x: Math.min(WALK_BOUNDS.maxX, Math.max(WALK_BOUNDS.minX, x)),
    y: Math.min(WALK_BOUNDS.maxY, Math.max(WALK_BOUNDS.minY, y)),
  };
}

/**
 * Step a chasing enemy toward the party at `speed` px/s.
 */
export function chaseStep(enemy, target, speed, dt) {
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return enemy;

  const step = speed * dt;
  const nx = enemy.x + (dx / dist) * Math.min(step, dist);
  const ny = enemy.y + (dy / dist) * Math.min(step, dist);
  const clamped = clampEnemyPos(nx, ny);

  let facing = enemy.facing;
  if (Math.abs(dx) > Math.abs(dy)) {
    facing = dx < 0 ? "left" : "right";
  } else if (dy !== 0) {
    facing = dy < 0 ? "up" : "down";
  }

  return { ...enemy, x: clamped.x, y: clamped.y, facing };
}

void SPRITE_W;
void SPRITE_H;
void SCENE_H;
