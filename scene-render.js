import { cellAt, TERRAIN } from "./map-data.js";

export const SCENE_W = 320;
export const SCENE_H = 224;
export const SPRITE_W = 40;
export const SPRITE_H = 44;

const W = SCENE_W;
const H = SCENE_H;

/** Default resting spot in the mid-foreground. */
export const REST_POS = { x: 140, y: 138 };

/** Walkable bounds inside a scene (sprite top-left). */
export const WALK_BOUNDS = {
  minX: 4,
  maxX: SCENE_W - SPRITE_W - 4,
  minY: 72,
  maxY: SCENE_H - SPRITE_H - 6,
};

function neighborTerrain(cells, x, y, dx, dy) {
  const cell = cellAt(cells, x + dx, y + dy);
  return cell?.terrain ?? null;
}

function hash(x, y) {
  return ((x * 73856093) ^ (y * 19349663)) >>> 0;
}

function pick(seed, options) {
  return options[seed % options.length];
}

/** Build an SVGA-style scene SVG for one map cell. */
export function renderSceneSvg(
  cells,
  cell,
  partyLeaderId,
  facing = "down",
  spritePos = REST_POS
) {
  const { x, y, terrain, name, special } = cell;
  const n = neighborTerrain(cells, x, y, 0, -1);
  const e = neighborTerrain(cells, x, y, 1, 0);
  const s = neighborTerrain(cells, x, y, 0, 1);
  const w = neighborTerrain(cells, x, y, -1, 0);
  const seed = hash(x, y);

  const isInitialForest = name === "Initial Sequence";
  const layers = [];

  if (isInitialForest) {
    layers.push(skyLayer(TERRAIN.forest, false));
    layers.push(groundLayer(TERRAIN.forest));
    layers.push(deepForestScene(seed));
    layers.push(specialLandmark(name, seed));
  } else {
    layers.push(skyLayer(terrain, special));
    layers.push(groundLayer(terrain, special, seed));

    if (n === TERRAIN.mountain || (y === 0 && terrain !== TERRAIN.mountain)) {
      layers.push(mountainBand("north", seed));
    }
    if (s === TERRAIN.mountain) {
      layers.push(mountainBand("south", seed + 3));
    }
    if (w === TERRAIN.mountain || terrain === TERRAIN.mountain) {
      layers.push(mountainEdge("west", seed + 5));
    }
    if (e === TERRAIN.mountain || terrain === TERRAIN.mountain) {
      layers.push(mountainEdge("east", seed + 7));
    }

    if (terrain === TERRAIN.forest || n === TERRAIN.forest || e === TERRAIN.forest) {
      layers.push(forestCluster(seed, terrain === TERRAIN.forest ? "dense" : "edge"));
    }
    if (terrain === TERRAIN.meadow) {
      layers.push(meadowFlowers(seed));
    }
    if (terrain === TERRAIN.swamp || s === TERRAIN.swamp || e === TERRAIN.swamp) {
      layers.push(waterCorner(seed, terrain === TERRAIN.swamp));
    }
    if (terrain === TERRAIN.plains || terrain === TERRAIN.meadow) {
      layers.push(distantTrees(seed));
    }

    if (special) {
      layers.push(specialLandmark(name, seed));
    } else if (name === "Plains" && seed % 5 === 0) {
      layers.push(signpost(210, 120));
    }
  }

  // Party leader stands in the traversable mid-foreground
  if (partyLeaderId && terrain !== TERRAIN.mountain) {
    layers.push(partySprite(partyLeaderId, facing, spritePos.x, spritePos.y));
  }

  if (special) {
    layers.push(`
      <rect x="0" y="0" width="${W}" height="8" fill="#c62828"/>
      <rect x="0" y="${H - 8}" width="${W}" height="8" fill="#c62828"/>
      <rect x="0" y="0" width="8" height="${H}" fill="#c62828"/>
      <rect x="${W - 8}" y="0" width="8" height="${H}" fill="#c62828"/>
    `);
  }

  return `
    <svg class="scene-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeAttr(name)}">
      <defs>
        <linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#6eb6e8"/>
          <stop offset="100%" stop-color="#a8d8f5"/>
        </linearGradient>
        <linearGradient id="skySpecial" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#5a2040"/>
          <stop offset="100%" stop-color="#c46b4a"/>
        </linearGradient>
        <linearGradient id="skyForestDeep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1a3d28"/>
          <stop offset="55%" stop-color="#2f6b3a"/>
          <stop offset="100%" stop-color="#4a8a48"/>
        </linearGradient>
        <pattern id="grass" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#6dbd4e"/>
          <rect x="0" y="0" width="2" height="2" fill="#7dce5c"/>
          <rect x="4" y="3" width="2" height="2" fill="#5aa83f"/>
          <rect x="6" y="6" width="1" height="1" fill="#8ad868"/>
          <rect x="2" y="5" width="1" height="1" fill="#4f9638"/>
        </pattern>
        <pattern id="meadow" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#6db84a"/>
          <rect x="1" y="2" width="2" height="2" fill="#7ec85a"/>
          <rect x="6" y="6" width="2" height="2" fill="#5aa33c"/>
        </pattern>
        <pattern id="forestFloor" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#2f6b32"/>
          <rect x="2" y="3" width="2" height="1" fill="#26582a"/>
          <rect x="5" y="6" width="2" height="1" fill="#3a7a3d"/>
        </pattern>
        <pattern id="swampFloor" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#3d5a2e"/>
          <ellipse cx="3" cy="4" rx="3" ry="2" fill="#2f4a28" opacity="0.7"/>
          <ellipse cx="9" cy="9" rx="3" ry="2" fill="#4a6a38" opacity="0.5"/>
        </pattern>
        <radialGradient id="forestVignette" cx="50%" cy="55%" r="65%">
          <stop offset="45%" stop-color="#0a2214" stop-opacity="0"/>
          <stop offset="100%" stop-color="#061810" stop-opacity="0.75"/>
        </radialGradient>
      </defs>
      ${layers.join("\n")}
    </svg>
  `;
}

function escapeAttr(value) {
  return String(value).replace(/"/g, "&quot;");
}

function skyLayer(terrain, special) {
  if (special) {
    return `<rect width="${W}" height="78" fill="url(#skySpecial)"/>`;
  }
  if (terrain === TERRAIN.swamp) {
    return `<rect width="${W}" height="78" fill="#6a7a55"/>`;
  }
  if (terrain === TERRAIN.forest) {
    return `<rect width="${W}" height="82" fill="url(#skyForestDeep)"/>
      <ellipse cx="40" cy="50" rx="55" ry="36" fill="#163822" opacity="0.55"/>
      <ellipse cx="120" cy="42" rx="60" ry="40" fill="#1a4228" opacity="0.5"/>
      <ellipse cx="210" cy="48" rx="70" ry="38" fill="#163822" opacity="0.55"/>
      <ellipse cx="290" cy="40" rx="55" ry="34" fill="#1a4228" opacity="0.5"/>`;
  }
  return `<rect width="${W}" height="82" fill="url(#skyDay)"/>`;
}

function groundLayer(terrain) {
  const top = 70;
  const height = H - top;
  if (terrain === TERRAIN.forest) {
    return `<rect y="${top}" width="${W}" height="${height}" fill="url(#forestFloor)"/>`;
  }
  if (terrain === TERRAIN.meadow) {
    return `<rect y="${top}" width="${W}" height="${height}" fill="url(#meadow)"/>`;
  }
  if (terrain === TERRAIN.swamp) {
    return `<rect y="${top}" width="${W}" height="${height}" fill="url(#swampFloor)"/>`;
  }
  if (terrain === TERRAIN.mountain) {
    return `<rect y="${top}" width="${W}" height="${height}" fill="#6a7a8a"/>
      <path d="M0 140 L40 90 L80 130 L120 85 L160 135 L200 88 L240 132 L280 92 L320 140 V224 H0 Z" fill="#8b97ad"/>
      <path d="M40 90 L55 70 L70 95 Z" fill="#eef4fb"/>
      <path d="M120 85 L135 62 L150 95 Z" fill="#eef4fb"/>
      <path d="M200 88 L215 65 L230 98 Z" fill="#eef4fb"/>`;
  }
  // plains / special use grass; specials get red landmark overlays separately
  return `<rect y="${top}" width="${W}" height="${height}" fill="url(#grass)"/>`;
}

function mountainBand(side, seed) {
  const y = side === "north" ? 48 : 150;
  const peaks = [];
  for (let i = 0; i < 7; i += 1) {
    const px = i * 48 + (seed % 7);
    const peakH = 28 + ((seed + i * 13) % 18);
    peaks.push(`
      <path d="M${px} ${y + 34} L${px + 22} ${y + 34 - peakH} L${px + 44} ${y + 34} Z" fill="#9aa6b8"/>
      <path d="M${px + 14} ${y + 34 - peakH + 10} L${px + 22} ${y + 34 - peakH} L${px + 28} ${y + 34 - peakH + 12} Z" fill="#f2f6fb"/>
      <path d="M${px} ${y + 34} L${px + 44} ${y + 34} L${px + 44} ${y + 48} L${px} ${y + 48} Z" fill="#6b4a32"/>
    `);
  }
  return `<g class="mountains-${side}" opacity="0.98">${peaks.join("")}</g>`;
}

function mountainEdge(side, seed) {
  const x = side === "west" ? -10 : W - 54;
  const h1 = 50 + (seed % 20);
  const h2 = 40 + ((seed * 3) % 24);
  return `
    <g class="mountains-${side}">
      <path d="M${x} 210 L${x + 28} ${210 - h1} L${x + 56} 210 Z" fill="#8b97ad"/>
      <path d="M${x + 18} ${210 - h1 + 12} L${x + 28} ${210 - h1} L${x + 34} ${210 - h1 + 14} Z" fill="#eef4fb"/>
      <path d="M${x + 10} 200 L${x + 36} ${200 - h2} L${x + 62} 200 Z" fill="#7d8a9c"/>
      <path d="M${x} 210 L${x + 62} 210 L${x + 62} 224 L${x} 224 Z" fill="#5a3d28"/>
    </g>
  `;
}

function tree(cx, cy, scale = 1) {
  const r = 18 * scale;
  return `
    <g class="tree">
      <rect x="${cx - 2}" y="${cy + 2 * scale}" width="4" height="${12 * scale}" fill="#6b4226"/>
      <ellipse cx="${cx - 7 * scale}" cy="${cy + 2 * scale}" rx="${r * 0.72}" ry="${r * 0.58}" fill="#228b33"/>
      <ellipse cx="${cx + 7 * scale}" cy="${cy + 2 * scale}" rx="${r * 0.72}" ry="${r * 0.58}" fill="#1f7d2e"/>
      <ellipse cx="${cx}" cy="${cy - 2 * scale}" rx="${r}" ry="${r * 0.8}" fill="#2f9a3c"/>
      <ellipse cx="${cx}" cy="${cy - 10 * scale}" rx="${r * 0.62}" ry="${r * 0.5}" fill="#3cb04a"/>
      <ellipse cx="${cx - 4 * scale}" cy="${cy - 6 * scale}" rx="${r * 0.25}" ry="${r * 0.18}" fill="#6fce6a" opacity="0.7"/>
    </g>
  `;
}

/** Taller, darker canopy tree for deep woodland scenes. */
function deepTree(cx, cy, scale = 1) {
  const r = 20 * scale;
  const trunkH = 18 * scale;
  return `
    <g class="deep-tree">
      <rect x="${cx - 3 * scale}" y="${cy + 2 * scale}" width="${6 * scale}" height="${trunkH}" fill="#4a2e18"/>
      <rect x="${cx - 2 * scale}" y="${cy + 4 * scale}" width="${2 * scale}" height="${trunkH * 0.7}" fill="#6b4226" opacity="0.55"/>
      <ellipse cx="${cx - 8 * scale}" cy="${cy}" rx="${r * 0.7}" ry="${r * 0.55}" fill="#145526"/>
      <ellipse cx="${cx + 8 * scale}" cy="${cy}" rx="${r * 0.7}" ry="${r * 0.55}" fill="#0f4a20"/>
      <ellipse cx="${cx}" cy="${cy - 4 * scale}" rx="${r}" ry="${r * 0.78}" fill="#1a6b30"/>
      <ellipse cx="${cx}" cy="${cy - 14 * scale}" rx="${r * 0.7}" ry="${r * 0.55}" fill="#228038"/>
      <ellipse cx="${cx}" cy="${cy - 22 * scale}" rx="${r * 0.42}" ry="${r * 0.36}" fill="#2d9444"/>
      <ellipse cx="${cx - 5 * scale}" cy="${cy - 10 * scale}" rx="${r * 0.22}" ry="${r * 0.14}" fill="#4db85a" opacity="0.45"/>
    </g>
  `;
}

function forestCluster(seed, mode) {
  const trees = [];
  const count = mode === "dense" ? 9 : mode === "deep" ? 14 : 4;
  for (let i = 0; i < count; i += 1) {
    const tx = 20 + ((seed + i * 37) % 280);
    const ty = 105 + ((seed + i * 17) % 75);
    const sc = 0.85 + ((seed + i) % 3) * 0.18;
    trees.push(tree(tx, ty, sc));
  }
  // denser back row for forests
  if (mode === "dense" || mode === "deep") {
    for (let i = 0; i < 7; i += 1) {
      trees.push(tree(16 + i * 46 + (seed % 5), 90 + ((i + seed) % 3) * 4, 1.15));
    }
  }
  if (mode === "deep") {
    for (let i = 0; i < 8; i += 1) {
      trees.push(tree(10 + i * 42 + ((seed * 3) % 7), 150 + ((i * 11) % 20), 1.25));
    }
  }
  return `<g class="forest">${trees.join("")}</g>`;
}

/** Dense woodland clearing used for the starting Initial Sequence scene. */
function deepForestScene(seed) {
  const back = [];
  const sides = [];
  const fore = [];

  // Solid back wall of tall canopy trees
  for (let i = 0; i < 9; i += 1) {
    back.push(deepTree(6 + i * 38 + (seed % 4), 92 + ((i + seed) % 3) * 3, 1.15 + (i % 2) * 0.08));
  }
  // Second back row, slightly forward — fills gaps
  for (let i = 0; i < 8; i += 1) {
    back.push(deepTree(24 + i * 40 + ((seed * 2) % 5), 108 + ((i * 3) % 5), 1.05));
  }

  // Left thicket (keep x < ~110 so center clearing stays open)
  for (let i = 0; i < 6; i += 1) {
    sides.push(deepTree(12 + ((seed + i * 23) % 78), 118 + i * 12, 1.1 + (i % 2) * 0.12));
  }
  // Right thicket (keep x > ~220)
  for (let i = 0; i < 6; i += 1) {
    sides.push(deepTree(235 + ((seed + i * 19) % 70), 116 + i * 12, 1.1 + (i % 2) * 0.12));
  }

  // Mid-side framing trees
  sides.push(deepTree(88, 148, 1.15));
  sides.push(deepTree(232, 146, 1.2));
  sides.push(tree(70, 160, 0.95));
  sides.push(tree(250, 158, 0.95));

  // Foreground giants hugging the edges
  fore.push(deepTree(10, 168, 1.4));
  fore.push(deepTree(310, 168, 1.4));
  fore.push(deepTree(38, 178, 1.25));
  fore.push(deepTree(282, 176, 1.25));
  fore.push(tree(58, 188, 1.05));
  fore.push(tree(262, 186, 1.05));

  return `
    <g class="deep-forest">
      <!-- Deep shade wash -->
      <rect y="70" width="${W}" height="${H - 70}" fill="#0a2214" opacity="0.28"/>
      <!-- Mossy clearing + trail (under trees) -->
      <ellipse cx="160" cy="158" rx="54" ry="34" fill="#4a6a32" opacity="0.55"/>
      <ellipse cx="160" cy="168" rx="40" ry="22" fill="#6a8f48" opacity="0.35"/>
      <path d="M152 224 C158 195, 158 170, 162 140 C166 118, 168 98, 164 80"
        fill="none" stroke="#5a7a3a" stroke-width="22" opacity="0.4"/>
      <path d="M152 224 C158 195, 158 170, 162 140 C166 118, 168 98, 164 80"
        fill="none" stroke="#7a9a52" stroke-width="10" opacity="0.45"/>
      ${back.join("")}
      ${sides.join("")}
      <!-- Leaf litter / undergrowth at clearing edges -->
      <ellipse cx="100" cy="155" rx="11" ry="4" fill="#2a4a20" opacity="0.75"/>
      <ellipse cx="220" cy="150" rx="13" ry="5" fill="#2a4a20" opacity="0.7"/>
      <ellipse cx="95" cy="175" rx="9" ry="3.5" fill="#3d5a28" opacity="0.7"/>
      <ellipse cx="225" cy="172" rx="10" ry="4" fill="#3d5a28" opacity="0.65"/>
      <!-- Mushrooms -->
      <circle cx="104" cy="152" r="3" fill="#c4543a"/>
      <circle cx="110" cy="154" r="2.5" fill="#e8d48a"/>
      <circle cx="228" cy="148" r="3" fill="#c4543a"/>
      <circle cx="98" cy="172" r="2.5" fill="#c4543a"/>
      <circle cx="232" cy="170" r="2.5" fill="#e8d48a"/>
      ${fore.join("")}
      <!-- Soft vignette for deep-woods atmosphere -->
      <rect y="70" width="${W}" height="${H - 70}" fill="url(#forestVignette)" opacity="0.55"/>
    </g>
  `;
}

function distantTrees(seed) {
  const trees = [];
  const count = 2 + (seed % 3);
  for (let i = 0; i < count; i += 1) {
    trees.push(tree(40 + i * 70 + (seed % 11), 100 + (i % 2) * 8, 0.75));
  }
  return `<g class="distant-trees" opacity="0.95">${trees.join("")}</g>`;
}

function meadowFlowers(seed) {
  const dots = [];
  for (let i = 0; i < 18; i += 1) {
    const fx = 16 + ((seed + i * 47) % 290);
    const fy = 100 + ((seed + i * 23) % 100);
    const color = pick(seed + i, ["#f2d65c", "#ef6a9c", "#7ec8ff", "#fff1a8"]);
    dots.push(`<circle cx="${fx}" cy="${fy}" r="2" fill="${color}"/>`);
  }
  return `<g class="flowers">${dots.join("")}</g>`;
}

function waterCorner(seed, full) {
  if (full) {
    return `
      <g class="swamp-water">
        <ellipse cx="220" cy="170" rx="90" ry="36" fill="#3a8ec8"/>
        <ellipse cx="210" cy="165" rx="70" ry="24" fill="#4ea0d8"/>
        <path d="M150 170 Q180 158 210 170 Q240 182 270 168" fill="none" stroke="#d8f0ff" stroke-width="2"/>
        <ellipse cx="80" cy="150" rx="40" ry="16" fill="#357eae" opacity="0.85"/>
        <path d="M140 190 L155 175 L175 188 L160 195 Z" fill="#6b8f3a"/>
      </g>
    `;
  }
  return `
    <g class="water-edge">
      <path d="M240 224 L320 150 L320 224 Z" fill="#3a8ec8"/>
      <path d="M250 224 L320 160 L320 224 Z" fill="#4ea0d8"/>
      <path d="M248 210 Q280 190 320 185" fill="none" stroke="#c9e8ff" stroke-width="2"/>
      <path d="M240 224 L265 195 L290 210 L270 224 Z" fill="#b87333"/>
    </g>
  `;
}

function signpost(x, y) {
  return `
    <g class="signpost">
      <rect x="${x}" y="${y}" width="4" height="28" fill="#8b5a2b"/>
      <rect x="${x - 10}" y="${y - 2}" width="28" height="14" fill="#c49a6c"/>
      <rect x="${x - 8}" y="${y}" width="24" height="2" fill="#6b4226"/>
      <rect x="${x - 8}" y="${y + 5}" width="24" height="2" fill="#6b4226"/>
    </g>
  `;
}

function cottage(x, y) {
  return `
    <g class="cottage">
      <rect x="${x}" y="${y}" width="34" height="22" fill="#8b5a2b"/>
      <polygon points="${x - 4},${y} ${x + 17},${y - 16} ${x + 38},${y}" fill="#e2b84a"/>
      <rect x="${x + 13}" y="${y + 8}" width="8" height="14" fill="#5a3318"/>
      <rect x="${x + 4}" y="${y + 6}" width="6" height="6" fill="#87c6ef"/>
    </g>
  `;
}

function specialLandmark(name, seed) {
  switch (name) {
    case "TOWN":
      return `
        <g class="landmark-town">
          ${cottage(70, 118)}
          ${cottage(118, 124)}
          ${signpost(170, 130)}
          <rect x="60" y="145" width="130" height="8" fill="#c62828" opacity="0.85"/>
        </g>`;
    case "Initial Sequence":
      return `
        <g class="landmark-start">
          ${signpost(168, 132)}
          <!-- Small quest marker in the forest clearing -->
          <circle cx="200" cy="158" r="9" fill="#c62828" opacity="0.92"/>
          <circle cx="200" cy="158" r="4" fill="#f0c94d"/>
          <rect x="120" y="168" width="90" height="5" fill="#c62828" opacity="0.75"/>
        </g>`;
    case "Temple of Peace":
      return `
        <g class="landmark-temple">
          <rect x="120" y="110" width="70" height="50" fill="#e8e0d0"/>
          <polygon points="112,110 155,78 198,110" fill="#c62828"/>
          <rect x="148" y="132" width="14" height="28" fill="#5a3318"/>
          <rect x="130" y="120" width="10" height="10" fill="#87c6ef"/>
          <rect x="170" y="120" width="10" height="10" fill="#87c6ef"/>
          <rect x="152" y="88" width="6" height="18" fill="#f0c94d"/>
        </g>`;
    case "Outlaw Hideout":
      return `
        <g class="landmark-hideout">
          <ellipse cx="160" cy="140" rx="48" ry="20" fill="#2a2118"/>
          <path d="M120 140 Q160 100 200 140" fill="#3d2a1c"/>
          <ellipse cx="160" cy="148" rx="14" ry="10" fill="#0c1018"/>
          <rect x="100" y="160" width="120" height="6" fill="#c62828"/>
        </g>`;
    case "Mines of Tyrol":
      return `
        <g class="landmark-mines">
          <path d="M90 160 L130 100 L180 160 Z" fill="#6a7a8a"/>
          <path d="M150 160 L200 90 L260 160 Z" fill="#5c6578"/>
          <path d="M200 90 L215 70 L230 100 Z" fill="#eef4fb"/>
          <ellipse cx="175" cy="155" rx="18" ry="14" fill="#1a140c"/>
          <rect x="90" y="168" width="170" height="6" fill="#c62828"/>
        </g>`;
    case "Dragon Castle":
      return `
        <g class="landmark-castle">
          <rect x="110" y="90" width="100" height="70" fill="#4a5568"/>
          <rect x="100" y="70" width="24" height="90" fill="#3a4556"/>
          <rect x="196" y="60" width="24" height="100" fill="#3a4556"/>
          <polygon points="100,70 112,48 124,70" fill="#c62828"/>
          <polygon points="196,60 208,36 220,60" fill="#c62828"/>
          <rect x="148" y="120" width="20" height="40" fill="#1a140c"/>
          <rect x="120" y="100" width="10" height="10" fill="#f0c94d"/>
          <rect x="190" y="100" width="10" height="10" fill="#f0c94d"/>
        </g>`;
    case "Abandoned Ruins":
      return `
        <g class="landmark-ruins">
          <rect x="100" y="120" width="30" height="40" fill="#8a8070"/>
          <rect x="150" y="110" width="24" height="50" fill="#7a7060"/>
          <rect x="190" y="125" width="36" height="35" fill="#6a6050"/>
          <rect x="110" y="130" width="12" height="16" fill="#1a140c"/>
          <rect x="95" y="165" width="140" height="6" fill="#c62828"/>
        </g>`;
    case "Witches' Lair":
      return `
        <g class="landmark-witches">
          <path d="M140 165 L170 95 L200 165 Z" fill="#2a1840"/>
          <rect x="162" y="130" width="14" height="35" fill="#1a140c"/>
          <circle cx="170" cy="118" r="6" fill="#7cff6a"/>
          <ellipse cx="230" cy="170" rx="40" ry="16" fill="#3a8ec8" opacity="0.7"/>
          <rect x="130" y="170" width="90" height="6" fill="#c62828"/>
        </g>`;
    default:
      return `<rect x="140" y="120" width="40" height="40" fill="#c62828"/>`;
  }
}

function partySprite(leaderId, facing, x = REST_POS.x, y = REST_POS.y) {
  const flip = facing === "left" ? -1 : 1;
  const transform =
    flip === -1
      ? `translate(${x + SPRITE_W} ${y}) scale(-1 1)`
      : `translate(${x} ${y})`;
  return `
    <g class="party-sprite" data-sprite="leader" transform="${transform}">
      <ellipse cx="20" cy="42" rx="12" ry="4" fill="#1a2a14" opacity="0.45"/>
      <image href="assets/overworld/${leaderId}.png" x="0" y="0" width="${SPRITE_W}" height="${SPRITE_H}"
        style="image-rendering: pixelated" preserveAspectRatio="xMidYMax meet" />
    </g>
  `;
}

export function facingFromDelta(dx, dy) {
  if (dx < 0) return "left";
  if (dx > 0) return "right";
  if (dy < 0) return "up";
  return "down";
}

/** Exit point just off-screen in the travel direction. */
export function exitPosForDelta(dx, dy, from = REST_POS) {
  if (dx < 0) return { x: -SPRITE_W - 4, y: from.y };
  if (dx > 0) return { x: SCENE_W + 4, y: from.y };
  if (dy < 0) return { x: from.x, y: 40 };
  return { x: from.x, y: SCENE_H + 4 };
}

/**
 * Entry point on the side matching travel direction.
 * e.g. moved left → begin on the left of the new scene.
 */
export function entryPosForDelta(dx, dy) {
  if (dx < 0) return { x: 4, y: REST_POS.y };
  if (dx > 0) return { x: SCENE_W - SPRITE_W - 4, y: REST_POS.y };
  if (dy < 0) return { x: REST_POS.x, y: 64 };
  return { x: REST_POS.x, y: SCENE_H - SPRITE_H - 6 };
}

export function spriteTransform(facing, x, y) {
  if (facing === "left") {
    return `translate(${x + SPRITE_W} ${y}) scale(-1 1)`;
  }
  return `translate(${x} ${y})`;
}
