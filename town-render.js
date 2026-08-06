/**
 * SVG scene art for town outdoors and interiors.
 */

import {
  SCENE_W,
  SCENE_H,
  SPRITE_W,
  SPRITE_H,
  REST_POS,
  spriteTransform,
} from "./scene-render.js";
import { INTERIORS } from "./town-data.js";

const W = SCENE_W;
const H = SCENE_H;

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function partySprite(leaderId, facing, x = REST_POS.x, y = REST_POS.y) {
  const transform = spriteTransform(facing, x, y);
  return `
    <g class="party-sprite" data-sprite="leader" transform="${transform}">
      <ellipse cx="20" cy="42" rx="12" ry="4" fill="#1a2a14" opacity="0.45"/>
      <image href="assets/overworld/${leaderId}.png" x="0" y="0" width="${SPRITE_W}" height="${SPRITE_H}"
        style="image-rendering: pixelated" preserveAspectRatio="xMidYMax meet" />
    </g>
  `;
}

function labelBanner(x, y, text, anchor = "middle") {
  const width = Math.max(54, text.length * 7.2);
  const left =
    anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
  return `
    <g class="town-sign">
      <rect x="${left}" y="${y - 12}" width="${width}" height="16" rx="2"
        fill="#f3e6b0" stroke="#1a1420" stroke-width="2"/>
      <text x="${x}" y="${y}" text-anchor="${anchor}"
        font-family="VT323, monospace" font-size="12" fill="#1a1420">${esc(text)}</text>
    </g>
  `;
}

function buildingFacade(side, label) {
  if (side === "west") {
    return `
      <g class="facade facade--west">
        <rect x="0" y="70" width="78" height="110" fill="#8b5a2b"/>
        <polygon points="0,70 39,48 78,70" fill="#c62828"/>
        <rect x="28" y="118" width="22" height="36" fill="#3a2210"/>
        <rect x="10" y="96" width="14" height="14" fill="#87c6ef"/>
        <rect x="52" y="96" width="14" height="14" fill="#87c6ef"/>
        ${labelBanner(39, 86, label)}
      </g>`;
  }
  if (side === "east") {
    return `
      <g class="facade facade--east">
        <rect x="242" y="70" width="78" height="110" fill="#6a4a2a"/>
        <polygon points="242,70 281,46 320,70" fill="#e2b84a"/>
        <rect x="270" y="118" width="22" height="36" fill="#3a2210"/>
        <rect x="252" y="96" width="14" height="14" fill="#87c6ef"/>
        <rect x="294" y="96" width="14" height="14" fill="#87c6ef"/>
        ${labelBanner(281, 86, label)}
      </g>`;
  }
  if (side === "north") {
    return `
      <g class="facade facade--north">
        <rect x="90" y="48" width="140" height="54" fill="#7a5230"/>
        <polygon points="84,48 160,28 236,48" fill="#c62828"/>
        <rect x="148" y="68" width="24" height="34" fill="#3a2210"/>
        ${labelBanner(160, 62, label)}
      </g>`;
  }
  return "";
}

function outdoorSky() {
  return `
    <rect width="${W}" height="${H}" fill="#6eb6e8"/>
    <ellipse cx="48" cy="36" rx="28" ry="12" fill="#fff" opacity="0.7"/>
    <ellipse cx="250" cy="28" rx="36" ry="14" fill="#fff" opacity="0.55"/>
  `;
}

function cobbleGround() {
  return `
    <rect x="0" y="120" width="${W}" height="${H - 120}" fill="#8a8070"/>
    <g opacity="0.35" stroke="#6a6050" stroke-width="1">
      <path d="M0 140 H320 M0 160 H320 M0 180 H320 M0 200 H320"/>
      <path d="M40 120 V224 M80 120 V224 M120 120 V224 M160 120 V224 M200 120 V224 M240 120 V224 M280 120 V224"/>
    </g>
  `;
}

function renderEntrance(cell, leaderId, facing, spritePos) {
  return `
    <svg class="scene-svg town-scene" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${outdoorSky()}
      <!-- Town square plaza -->
      <rect x="0" y="100" width="${W}" height="${H - 100}" fill="#9a8f78"/>
      <ellipse cx="160" cy="150" rx="90" ry="36" fill="#b8a888"/>
      <rect x="130" y="128" width="60" height="10" fill="#6b4226"/>
      <circle cx="160" cy="122" r="8" fill="#c62828"/>
      <!-- Gate / arch south hint -->
      <rect x="110" y="188" width="100" height="36" fill="#5a4a3a"/>
      <path d="M110 188 Q160 160 210 188" fill="#3a3028"/>
      <text x="160" y="212" text-anchor="middle" font-family="VT323, monospace" font-size="11" fill="#f3e6b0">Entrance</text>
      <!-- Distant buildings north -->
      <rect x="20" y="72" width="50" height="40" fill="#8b5a2b"/>
      <polygon points="16,72 45,52 74,72" fill="#c62828"/>
      <rect x="250" y="70" width="50" height="42" fill="#6a4a2a"/>
      <polygon points="246,70 275,50 304,70" fill="#e2b84a"/>
      ${labelBanner(160, 58, "Town Square")}
      ${partySprite(leaderId, facing, spritePos.x, spritePos.y)}
    </svg>
  `;
}

function renderRoad(cell, leaderId, facing, spritePos) {
  const facades = (cell.facades || [])
    .map((f) => buildingFacade(f.side, f.label))
    .join("");
  return `
    <svg class="scene-svg town-scene" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${outdoorSky()}
      ${cobbleGround()}
      <!-- Center road strip -->
      <rect x="110" y="100" width="100" height="124" fill="#7a7264"/>
      <g stroke="#5a5448" stroke-width="2" stroke-dasharray="6 8" opacity="0.5">
        <line x1="160" y1="108" x2="160" y2="220"/>
      </g>
      ${facades}
      ${partySprite(leaderId, facing, spritePos.x, spritePos.y)}
    </svg>
  `;
}

function shopShelves(kind) {
  if (kind === "grocery") {
    return `
      <g class="shop-stock">
        <rect x="24" y="48" width="70" height="54" fill="#5a3a1c"/>
        <circle cx="40" cy="68" r="8" fill="#d94a3d"/>
        <circle cx="58" cy="70" r="7" fill="#efc94d"/>
        <circle cx="74" cy="68" r="8" fill="#6aa84f"/>
        <rect x="36" y="82" width="18" height="10" fill="#c49a6c"/>
        <rect x="58" y="84" width="22" height="8" fill="#e8d8a8"/>
        <rect x="226" y="48" width="70" height="54" fill="#5a3a1c"/>
        <rect x="236" y="58" width="14" height="20" fill="#8b4513"/>
        <rect x="256" y="62" width="14" height="16" fill="#daa520"/>
        <rect x="276" y="56" width="12" height="22" fill="#cd853f"/>
      </g>`;
  }
  if (kind === "armory") {
    return `
      <g class="shop-stock">
        <rect x="20" y="44" width="76" height="60" fill="#3a3a42"/>
        <path d="M36 52 L36 92" stroke="#c0c6d0" stroke-width="4"/>
        <path d="M28 56 L44 56" stroke="#c0c6d0" stroke-width="3"/>
        <circle cx="60" cy="70" r="14" fill="none" stroke="#8a9098" stroke-width="4"/>
        <rect x="78" y="58" width="10" height="28" fill="#6a7078"/>
        <rect x="224" y="44" width="76" height="60" fill="#3a3a42"/>
        <path d="M248 50 L248 96" stroke="#b0b8c0" stroke-width="5"/>
        <polygon points="248,50 242,62 254,62" fill="#e8eef4"/>
        <rect x="268" y="60" width="22" height="28" fill="#5a6570"/>
      </g>`;
  }
  // magic shop
  return `
    <g class="shop-stock">
      <rect x="22" y="46" width="74" height="58" fill="#2a1840"/>
      <rect x="34" y="58" width="10" height="22" fill="#7cff6a"/>
      <rect x="50" y="54" width="10" height="26" fill="#6ec6ff"/>
      <rect x="66" y="60" width="10" height="20" fill="#f0c94d"/>
      <circle cx="84" cy="72" r="8" fill="#e040fb" opacity="0.85"/>
      <rect x="224" y="46" width="74" height="58" fill="#2a1840"/>
      <path d="M250 54 L250 96" stroke="#c9a44c" stroke-width="4"/>
      <circle cx="250" cy="50" r="6" fill="#7cff6a"/>
      <rect x="268" y="62" width="18" height="14" fill="#f3e6b0"/>
      <text x="277" y="73" text-anchor="middle" font-family="VT323, monospace" font-size="10" fill="#1a1420">※</text>
    </g>`;
}

function renderShopInterior(interiorId, leaderId, facing, spritePos) {
  const shop = INTERIORS[interiorId];
  const wall =
    interiorId === "grocery"
      ? "#6b4226"
      : interiorId === "armory"
        ? "#3d4550"
        : "#3a2060";
  const floor =
    interiorId === "magic-shop" ? "#2a1838" : interiorId === "armory" ? "#4a4550" : "#8b6914";
  return `
    <svg class="scene-svg town-scene town-scene--interior" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="${W}" height="${H}" fill="${wall}"/>
      <rect x="0" y="130" width="${W}" height="${H - 130}" fill="${floor}"/>
      <!-- Back wall shelves -->
      ${shopShelves(interiorId)}
      <!-- Counter -->
      <rect x="70" y="118" width="180" height="28" fill="#5a3318" stroke="#1a1420" stroke-width="2"/>
      <rect x="74" y="122" width="172" height="8" fill="#8b5a2b"/>
      <!-- Keeper -->
      <g transform="translate(140 74)">
        <ellipse cx="20" cy="42" rx="12" ry="4" fill="#1a1420" opacity="0.4"/>
        <image href="assets/overworld/${shop.keeperSprite}.png" x="0" y="0" width="${SPRITE_W}" height="${SPRITE_H}"
          style="image-rendering: pixelated" preserveAspectRatio="xMidYMax meet" />
      </g>
      ${labelBanner(160, 40, shop.name)}
      ${
        interiorId === "grocery"
          ? ""
          : `<text x="160" y="158" text-anchor="middle" font-family="VT323, monospace" font-size="12" fill="#f3e6b0">
        ${esc(shop.keeperName)} — ${esc(shop.stock.join(" · "))}
      </text>`
      }
      <text x="160" y="210" text-anchor="middle" font-family="VT323, monospace" font-size="11" fill="#c8b890">
        Walk south to leave the shop
      </text>
      ${partySprite(leaderId, facing, spritePos.x, spritePos.y)}
    </svg>
  `;
}

function renderTavern(leaderId, facing, spritePos) {
  return `
    <svg class="scene-svg town-scene town-scene--tavern" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="${W}" height="${H}" fill="#3a2418"/>
      <!-- Warm lantern glow -->
      <ellipse cx="80" cy="60" rx="40" ry="28" fill="#f0c94d" opacity="0.18"/>
      <ellipse cx="240" cy="50" rx="36" ry="24" fill="#f0c94d" opacity="0.14"/>
      <!-- Floor -->
      <rect x="0" y="128" width="${W}" height="${H - 128}" fill="#5a3a22"/>
      <g opacity="0.25" stroke="#3a2418" stroke-width="1">
        <path d="M0 148 H320 M0 168 H320 M0 188 H320 M0 208 H320"/>
      </g>
      <!-- Bar along the back -->
      <rect x="40" y="88" width="240" height="36" fill="#4a2c14" stroke="#1a1420" stroke-width="2"/>
      <rect x="44" y="92" width="232" height="10" fill="#7a4a22"/>
      <!-- Tap / bottles -->
      <rect x="60" y="70" width="8" height="18" fill="#6ec6ff"/>
      <rect x="78" y="66" width="8" height="22" fill="#d94a3d"/>
      <rect x="96" y="72" width="8" height="16" fill="#6aa84f"/>
      <rect x="220" y="68" width="8" height="20" fill="#c9a44c"/>
      <rect x="238" y="70" width="8" height="18" fill="#e040fb"/>
      <!-- Tables -->
      <ellipse cx="70" cy="168" rx="28" ry="12" fill="#6b4226"/>
      <ellipse cx="250" cy="172" rx="30" ry="12" fill="#6b4226"/>
      <ellipse cx="160" cy="186" rx="34" ry="12" fill="#5a3318"/>
      <!-- Barkeep behind bar -->
      <g transform="translate(140 56)">
        <image href="assets/overworld/barbarian.png" x="0" y="0" width="${SPRITE_W}" height="${SPRITE_H}"
          style="image-rendering: pixelated" preserveAspectRatio="xMidYMax meet" />
      </g>
      ${labelBanner(160, 36, "Hero's Hall")}
      <text x="160" y="214" text-anchor="middle" font-family="VT323, monospace" font-size="11" fill="#c8b890">
        Walk south to return to the road
      </text>
      ${partySprite(leaderId, facing, spritePos.x, spritePos.y)}
    </svg>
  `;
}

/**
 * Render the current town view (outdoor cell or interior).
 * @param {{ mode: "outdoor"|"interior", cell?: object, interiorId?: string, leaderId: string, facing: string, spritePos: {x:number,y:number} }} state
 */
export function renderTownScene(state) {
  const { leaderId, facing, spritePos } = state;
  if (state.mode === "interior") {
    if (state.interiorId === "heroes-hall") {
      return renderTavern(leaderId, facing, spritePos);
    }
    return renderShopInterior(state.interiorId, leaderId, facing, spritePos);
  }

  const cell = state.cell;
  if (!cell) {
    return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"></svg>`;
  }
  if (cell.kind === "entrance") {
    return renderEntrance(cell, leaderId, facing, spritePos);
  }
  return renderRoad(cell, leaderId, facing, spritePos);
}

export { SCENE_W, SCENE_H, SPRITE_W, SPRITE_H, REST_POS };
