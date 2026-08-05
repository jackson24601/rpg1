/**
 * Town grid from the design sheet (3×3, column x / row y).
 *
 *   Hero's Hall | Road | Armory
 *   Grocery     | Road | Magic Shop
 *   (wall)      | Entrance | (wall)
 *
 * The party always arrives on Entrance. Buildings open interiors
 * when entered from an adjacent road.
 */

export const TOWN_COLS = 3;
export const TOWN_ROWS = 3;

/** Overworld map cell that leads into town. */
export const OVERWORLD_TOWN = { x: 2, y: 11 };

/** Outdoor spawn when entering from the overworld. */
export const TOWN_ENTRANCE = { x: 1, y: 2 };

/**
 * @typedef {"entrance"|"road"|"building"|"blocked"} TownCellKind
 * @typedef {{
 *   id: string,
 *   name: string,
 *   kind: TownCellKind,
 *   interior?: string,
 *   facades?: Array<{ side: "west"|"east"|"north"|"south", buildingId: string, label: string }>,
 *   outdoorReturn?: { x: number, y: number, fromDx: number, fromDy: number },
 * }} TownCell
 */

/** @type {Record<string, TownCell>} */
export const TOWN_CELLS = {
  "0,0": {
    id: "heroes-hall",
    name: "Hero's Hall",
    kind: "building",
    interior: "heroes-hall",
    outdoorReturn: { x: 1, y: 0, fromDx: -1, fromDy: 0 },
  },
  "1,0": {
    id: "road-north",
    name: "Town Road",
    kind: "road",
    facades: [
      { side: "west", buildingId: "heroes-hall", label: "Hero's Hall" },
      { side: "east", buildingId: "armory", label: "Armory" },
    ],
  },
  "2,0": {
    id: "armory",
    name: "Armory",
    kind: "building",
    interior: "armory",
    outdoorReturn: { x: 1, y: 0, fromDx: 1, fromDy: 0 },
  },
  "0,1": {
    id: "grocery",
    name: "Grocery",
    kind: "building",
    interior: "grocery",
    outdoorReturn: { x: 1, y: 1, fromDx: -1, fromDy: 0 },
  },
  "1,1": {
    id: "road-mid",
    name: "Town Road",
    kind: "road",
    facades: [
      { side: "west", buildingId: "grocery", label: "Grocery" },
      { side: "east", buildingId: "magic-shop", label: "Magic Shop" },
    ],
  },
  "2,1": {
    id: "magic-shop",
    name: "Magic Shop",
    kind: "building",
    interior: "magic-shop",
    outdoorReturn: { x: 1, y: 1, fromDx: 1, fromDy: 0 },
  },
  "0,2": {
    id: "wall-sw",
    name: "Town Wall",
    kind: "blocked",
  },
  "1,2": {
    id: "entrance",
    name: "Town Square",
    kind: "entrance",
  },
  "2,2": {
    id: "wall-se",
    name: "Town Wall",
    kind: "blocked",
  },
};

export function townCellAt(x, y) {
  if (x < 0 || y < 0 || x >= TOWN_COLS || y >= TOWN_ROWS) return null;
  return TOWN_CELLS[`${x},${y}`] || null;
}

export function isOutdoorWalkable(cell) {
  return Boolean(cell && (cell.kind === "road" || cell.kind === "entrance"));
}

export function isBuilding(cell) {
  return Boolean(cell && cell.kind === "building" && cell.interior);
}

/** Shop / hall interior definitions for themed stock and keepers. */
export const INTERIORS = {
  grocery: {
    id: "grocery",
    name: "Grocery",
    kind: "shop",
    keeperSprite: "bard",
    keeperName: "Grocer",
    stock: ["Bread", "Cheese", "Apples", "Dried Meat", "Herbs"],
  },
  armory: {
    id: "armory",
    name: "Armory",
    kind: "shop",
    keeperSprite: "fighter",
    keeperName: "Armorer",
    stock: ["Sword", "Shield", "Helm", "Chain Mail", "Spear"],
  },
  "magic-shop": {
    id: "magic-shop",
    name: "Magic Shop",
    kind: "shop",
    keeperSprite: "wizard",
    keeperName: "Mage",
    stock: ["Mana Vial", "Crystal", "Staff", "Scroll", "Rune Stone"],
  },
  "heroes-hall": {
    id: "heroes-hall",
    name: "Hero's Hall",
    kind: "tavern",
    keeperSprite: "barbarian",
    keeperName: "Barkeep",
    patrons: [
      { spriteId: "rogue", x: 56, y: 118, facing: "right" },
      { spriteId: "ranger", x: 110, y: 130, facing: "left" },
      { spriteId: "cleric", x: 200, y: 122, facing: "left" },
      { spriteId: "monk", x: 248, y: 136, facing: "right" },
      { spriteId: "sorcerer", x: 168, y: 108, facing: "down" },
    ],
  },
};
