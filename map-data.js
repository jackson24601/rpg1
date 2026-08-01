/** 24×8 overworld grid from the design sheet (row-major, top → bottom). */
export const COLS = 8;
export const ROWS = 24;

export const TERRAIN = {
  mountain: "mountain",
  plains: "plains",
  forest: "forest",
  meadow: "meadow",
  swamp: "swamp",
  special: "special",
};

/** Special / landmark cells — rendered as red scenes. */
/** Keys are "x,y" (column, row). */
export const SPECIALS = {
  "7,0": "Dragon Castle",
  "2,2": "Temple of Peace",
  "5,2": "Outlaw Hideout",
  "0,10": "Mines of Tyrol",
  "2,11": "TOWN",
  "3,11": "Initial Sequence",
  "2,18": "Abandoned Ruins",
  "5,18": "Witches' Lair",
};

export const START = { x: 3, y: 11 };

/**
 * Base terrain for every cell. Specials override the visual to red
 * but remain walkable; mountains are impassable.
 */
const RAW = [
  ["M", "M", "M", "M", "M", "M", "M", "S"], // Dragon Castle
  ["M", "P", "P", "P", "P", "P", "P", "M"],
  ["M", "P", "S", "P", "P", "S", "P", "M"], // Temple, Outlaw
  ["M", "P", "P", "P", "P", "P", "P", "M"],
  ["M", "P", "P", "P", "P", "P", "P", "M"],
  ["M", "P", "P", "P", "P", "P", "P", "M"],
  ["M", "F", "F", "F", "F", "F", "P", "M"],
  ["M", "F", "F", "F", "F", "F", "P", "M"],
  ["M", "F", "F", "E", "F", "F", "F", "M"],
  ["M", "F", "F", "E", "F", "F", "F", "M"],
  ["S", "F", "E", "E", "E", "F", "F", "M"], // Mines of Tyrol
  ["M", "F", "S", "S", "E", "F", "F", "M"], // TOWN, Initial Sequence
  ["M", "F", "E", "E", "E", "F", "F", "M"],
  ["M", "F", "F", "F", "F", "F", "F", "M"],
  ["M", "F", "F", "F", "F", "F", "F", "M"],
  ["M", "F", "F", "F", "F", "F", "F", "M"],
  ["M", "F", "F", "F", "W", "W", "W", "M"],
  ["M", "F", "F", "F", "W", "W", "W", "M"],
  ["M", "F", "S", "F", "W", "S", "W", "M"], // Abandoned Ruins, Witches' Lair
  ["M", "F", "F", "F", "W", "W", "W", "M"],
  ["M", "F", "P", "P", "W", "W", "W", "M"],
  ["M", "F", "P", "P", "P", "P", "P", "M"],
  ["M", "F", "P", "P", "P", "P", "P", "M"],
  ["M", "M", "M", "M", "M", "M", "M", "M"],
];

const CODE = {
  M: TERRAIN.mountain,
  P: TERRAIN.plains,
  F: TERRAIN.forest,
  E: TERRAIN.meadow,
  W: TERRAIN.swamp,
  S: TERRAIN.special,
};

export function buildMap() {
  const cells = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const key = `${x},${y}`;
      const code = RAW[y][x];
      const specialName = SPECIALS[key] || null;
      const terrain = specialName || code === "S" ? TERRAIN.special : CODE[code];
      const resolvedName =
        specialName || (terrain === TERRAIN.special ? "Landmark" : labelFor(terrain));
      cells.push({
        x,
        y,
        terrain,
        name: resolvedName,
        walkable: terrain !== TERRAIN.mountain,
        special: terrain === TERRAIN.special,
      });
    }
  }
  return cells;
}

function labelFor(terrain) {
  switch (terrain) {
    case TERRAIN.mountain:
      return "Mountains";
    case TERRAIN.plains:
      return "Plains";
    case TERRAIN.forest:
      return "Forest";
    case TERRAIN.meadow:
      return "Meadow";
    case TERRAIN.swamp:
      return "Swamp";
    default:
      return "Unknown";
  }
}

export function cellAt(cells, x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
  return cells[y * COLS + x];
}
