import {
  TOWN_COLS,
  TOWN_ROWS,
  TOWN_ENTRANCE,
  OVERWORLD_TOWN,
  townCellAt,
  isOutdoorWalkable,
  isBuilding,
  INTERIORS,
} from "./town-data.js";
import {
  renderTownScene,
  SCENE_W,
  SCENE_H,
  SPRITE_W,
  SPRITE_H,
  REST_POS,
} from "./town-render.js";
import {
  facingFromDelta,
  WALK_BOUNDS,
  exitPosForDelta,
  entryPosForDelta,
  spriteTransform,
} from "./scene-render.js";
import { bindInventoryButton } from "./inventory-ui.js";

const OVERWORLD_KEY = "dragonQuestOverworld";
const TOWN_STATE_KEY = "dragonQuestTown";

const sceneFrame = document.getElementById("sceneFrame");
const sceneArt = document.getElementById("sceneArt");
const entityLayer = document.getElementById("entityLayer");
const sceneCaption = document.getElementById("sceneCaption");
const locationLabel = document.getElementById("locationLabel");
const coordsLabel = document.getElementById("coordsLabel");
const statusLine = document.getElementById("statusLine");
const partyStrip = document.getElementById("partyStrip");
const townMinimap = document.getElementById("townMinimap");

const position = { ...TOWN_ENTRANCE };
let facing = "up";
let spritePos = { ...REST_POS };
/** @type {"outdoor"|"interior"} */
let mode = "outdoor";
/** @type {string|null} */
let interiorId = null;
/** Outdoor cell to restore when leaving an interior. */
let interiorReturn = null;

let isTransitioning = false;
let rafId = 0;
let lastTs = 0;
const miniEls = new Map();

const held = { up: false, down: false, left: false, right: false };

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const WALK_SPEED = reduceMotion ? 110 : 42;
const TRANSITION_MS = reduceMotion ? 0 : 700;
const ENTRY_HOLD_MS = reduceMotion ? 0 : 220;

const KEY_DIR = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

function loadParty() {
  try {
    const raw = sessionStorage.getItem("dragonQuestParty");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}

function getLeader() {
  return loadParty()[0] || null;
}

function setStatus(message) {
  statusLine.textContent = message;
}

function anyHeld() {
  return held.up || held.down || held.left || held.right;
}

function currentDelta() {
  let dx = 0;
  let dy = 0;
  if (held.left) dx -= 1;
  if (held.right) dx += 1;
  if (held.up) dy -= 1;
  if (held.down) dy += 1;
  if (held.left && held.right) dx = 0;
  if (held.up && held.down) dy = 0;
  return { dx, dy };
}

function renderPartyStrip() {
  const party = loadParty();
  partyStrip.innerHTML = "";
  if (!party.length) {
    const li = document.createElement("li");
    li.className = "party-chip";
    li.innerHTML = "<span>No party saved</span>";
    partyStrip.appendChild(li);
    return;
  }
  party.forEach((member, index) => {
    const li = document.createElement("li");
    li.className = "party-chip" + (index === 0 ? " is-leader" : "");
    li.innerHTML = `
      <img src="assets/characters/${member.id}.png" alt="" width="28" height="28" />
      <span>${member.name}</span>
      ${index === 0 ? '<span class="party-chip__tag">leader</span>' : ""}
    `;
    partyStrip.appendChild(li);
  });
}

function buildTownMinimap() {
  townMinimap.innerHTML = "";
  for (let y = 0; y < TOWN_ROWS; y += 1) {
    for (let x = 0; x < TOWN_COLS; x += 1) {
      const cell = townCellAt(x, y);
      const tile = document.createElement("div");
      tile.className = `town-mini-tile town-mini-tile--${cell?.kind || "blocked"}`;
      tile.title = cell?.name || "";
      tile.setAttribute("role", "gridcell");
      miniEls.set(`${x},${y}`, tile);
      townMinimap.appendChild(tile);
    }
  }
}

function updateHud() {
  const cell = townCellAt(position.x, position.y);
  if (mode === "interior") {
    const interior = INTERIORS[interiorId];
    locationLabel.textContent = interior?.name || "Interior";
    coordsLabel.textContent = "Inside";
    sceneCaption.textContent =
      interior?.kind === "tavern"
        ? "Hero's Hall — a warm tavern for weary adventurers"
        : `${interior?.name || "Shop"} — goods behind the counter`;
  } else {
    locationLabel.textContent = cell?.name || "Town";
    coordsLabel.textContent = `${position.x + 1}, ${position.y + 1}`;
    sceneCaption.textContent =
      cell?.kind === "entrance"
        ? "Town Square — the medieval entrance plaza"
        : "Town Road — shop fronts line the way";
  }

  miniEls.forEach((el) => {
    el.classList.remove("is-current", "is-interior-focus");
  });
  if (mode === "interior" && interiorReturn) {
    miniEls
      .get(`${interiorReturn.buildingX},${interiorReturn.buildingY}`)
      ?.classList.add("is-interior-focus");
    miniEls.get(`${position.x},${position.y}`)?.classList.add("is-current");
  } else {
    miniEls.get(`${position.x},${position.y}`)?.classList.add("is-current");
  }
}

function syncPatrons() {
  entityLayer.innerHTML = "";
  if (mode !== "interior" || interiorId !== "heroes-hall") return;
  const tavern = INTERIORS["heroes-hall"];
  (tavern.patrons || []).forEach((patron, i) => {
    const el = document.createElement("div");
    el.className = "town-patron";
    el.dataset.patronIndex = String(i);
    el.innerHTML = `<img src="assets/overworld/${patron.spriteId}.png" alt="" width="40" height="44" draggable="false" />`;
    el.style.left = `${(patron.x / SCENE_W) * 100}%`;
    el.style.top = `${(patron.y / SCENE_H) * 100}%`;
    el.classList.toggle("is-flip", patron.facing === "left");
    entityLayer.appendChild(el);
  });
}

function renderScene() {
  const leader = getLeader();
  const leaderId = leader?.id || "fighter";
  const cell = townCellAt(position.x, position.y);

  sceneArt.innerHTML = renderTownScene({
    mode,
    cell,
    interiorId,
    leaderId,
    facing,
    spritePos,
  });
  updateHud();
  syncPatrons();
  placeSpriteDom(spritePos.x, spritePos.y);
}

function placeSpriteDom(x, y) {
  const node = sceneArt.querySelector('[data-sprite="leader"]');
  if (!node) return;
  node.setAttribute("transform", spriteTransform(facing, x, y));
}

function setWalkingVisual(active) {
  sceneFrame.classList.toggle("is-walking", active);
}

function clampToScene(x, y) {
  return {
    x: Math.min(WALK_BOUNDS.maxX, Math.max(WALK_BOUNDS.minX, x)),
    y: Math.min(WALK_BOUNDS.maxY, Math.max(WALK_BOUNDS.minY, y)),
  };
}

function atEdge(dx, dy) {
  if (dx < 0) return spritePos.x <= WALK_BOUNDS.minX + 0.5;
  if (dx > 0) return spritePos.x >= WALK_BOUNDS.maxX - 0.5;
  if (dy < 0) return spritePos.y <= WALK_BOUNDS.minY + 0.5;
  if (dy > 0) return spritePos.y >= WALK_BOUNDS.maxY - 0.5;
  return false;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function animateSpriteTo(target, durationMs) {
  return new Promise((resolve) => {
    if (durationMs <= 0) {
      spritePos = { ...target };
      placeSpriteDom(spritePos.x, spritePos.y);
      resolve();
      return;
    }
    const start = { ...spritePos };
    const t0 = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - t0) / durationMs);
      const e = easeInOut(t);
      spritePos = {
        x: start.x + (target.x - start.x) * e,
        y: start.y + (target.y - start.y) * e,
      };
      placeSpriteDom(spritePos.x, spritePos.y);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

function leaveTown() {
  // Prefer the overworld cell saved when entering town; fall back south of TOWN.
  let restored = null;
  try {
    const raw = sessionStorage.getItem(OVERWORLD_KEY);
    if (raw) restored = JSON.parse(raw);
  } catch {
    restored = null;
  }

  if (
    restored &&
    Number.isFinite(restored.x) &&
    Number.isFinite(restored.y)
  ) {
    sessionStorage.setItem(
      OVERWORLD_KEY,
      JSON.stringify({
        x: restored.x,
        y: restored.y,
        facing: "down",
        spritePos: restored.spritePos || { ...REST_POS },
      })
    );
  } else {
    sessionStorage.setItem(
      OVERWORLD_KEY,
      JSON.stringify({
        x: OVERWORLD_TOWN.x,
        y: OVERWORLD_TOWN.y + 1,
        facing: "up",
        spritePos: { ...REST_POS },
      })
    );
  }
  window.location.href = "game.html";
}

function enterInterior(buildingCell, buildingX, buildingY, fromDx, fromDy) {
  mode = "interior";
  interiorId = buildingCell.interior;
  interiorReturn = {
    x: position.x,
    y: position.y,
    buildingX,
    buildingY,
    fromDx,
    fromDy,
  };
  facing = facingFromDelta(fromDx, fromDy);
  spritePos = { x: REST_POS.x, y: SCENE_H - SPRITE_H - 10 };
  renderScene();
  const interior = INTERIORS[interiorId];
  setStatus(
    interior?.kind === "tavern"
      ? "You step into Hero's Hall. Patrons mill about the tavern."
      : `You enter the ${interior?.name || "shop"}. Goods line the shelves behind the counter.`
  );
}

function exitInterior() {
  if (!interiorReturn) {
    mode = "outdoor";
    interiorId = null;
    position.x = TOWN_ENTRANCE.x;
    position.y = TOWN_ENTRANCE.y;
    spritePos = { ...REST_POS };
    renderScene();
    return;
  }
  mode = "outdoor";
  interiorId = null;
  position.x = interiorReturn.x;
  position.y = interiorReturn.y;
  // Step back onto the road facing away from the doorway.
  facing = facingFromDelta(-interiorReturn.fromDx, -interiorReturn.fromDy);
  spritePos = entryPosForDelta(-interiorReturn.fromDx, -interiorReturn.fromDy);
  interiorReturn = null;
  renderScene();
  setStatus("Back on the town road.");
}

async function transitionOutdoor(dx, dy) {
  const nextX = position.x + dx;
  const nextY = position.y + dy;

  // Leave town south from the entrance plaza.
  if (position.x === TOWN_ENTRANCE.x && position.y === TOWN_ENTRANCE.y && dy > 0) {
    isTransitioning = true;
    setWalkingVisual(true);
    setStatus("Leaving town…");
    await animateSpriteTo(exitPosForDelta(dx, dy, spritePos), TRANSITION_MS);
    leaveTown();
    return;
  }

  const target = townCellAt(nextX, nextY);
  if (!target || target.kind === "blocked") {
    setStatus("That way is blocked by the town wall.");
    return;
  }

  if (isBuilding(target)) {
    isTransitioning = true;
    setWalkingVisual(true);
    await animateSpriteTo(exitPosForDelta(dx, dy, spritePos), TRANSITION_MS * 0.7);
    enterInterior(target, nextX, nextY, dx, dy);
    isTransitioning = false;
    setWalkingVisual(anyHeld());
    lastTs = 0;
    return;
  }

  if (!isOutdoorWalkable(target)) {
    setStatus("You cannot go that way.");
    return;
  }

  isTransitioning = true;
  setWalkingVisual(true);
  setStatus("Moving through town…");

  await animateSpriteTo(exitPosForDelta(dx, dy, spritePos), TRANSITION_MS);
  position.x = nextX;
  position.y = nextY;
  spritePos = entryPosForDelta(dx, dy);
  facing = facingFromDelta(dx, dy);
  renderScene();

  if (ENTRY_HOLD_MS) {
    await new Promise((r) => setTimeout(r, ENTRY_HOLD_MS));
  }
  const inward = clampToScene(spritePos.x + dx * 28, spritePos.y + dy * 20);
  await animateSpriteTo(inward, TRANSITION_MS * 0.5);

  const cell = townCellAt(position.x, position.y);
  if (cell?.kind === "road" && cell.facades?.length) {
    const names = cell.facades.map((f) => f.label).join(" and ");
    setStatus(`Shop fronts ahead — ${names}.`);
  } else if (cell?.kind === "entrance") {
    setStatus("The town square. Walk south to return to the world.");
  } else {
    setStatus(`You reach the ${cell?.name || "road"}.`);
  }

  isTransitioning = false;
  setWalkingVisual(anyHeld());
  lastTs = 0;
}

async function handleInteriorEdge(dx, dy) {
  // Leave shops / tavern by walking toward the exit (south).
  if (dy > 0) {
    isTransitioning = true;
    setWalkingVisual(true);
    await animateSpriteTo(exitPosForDelta(0, 1, spritePos), TRANSITION_MS * 0.65);
    exitInterior();
    isTransitioning = false;
    setWalkingVisual(anyHeld());
    lastTs = 0;
    return;
  }
  setStatus("The counter and shelves block that way. Walk south to leave.");
}

async function tryEdgeTransition(dx, dy) {
  if (mode === "interior") {
    await handleInteriorEdge(dx, dy);
    return;
  }
  await transitionOutdoor(dx, dy);
}

function tick(ts) {
  rafId = requestAnimationFrame(tick);
  if (isTransitioning) return;

  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  const { dx, dy } = currentDelta();
  if (!dx && !dy) {
    setWalkingVisual(false);
    return;
  }

  facing = facingFromDelta(dx, dy);
  setWalkingVisual(true);

  const speed = WALK_SPEED * (dx && dy ? Math.SQRT1_2 : 1);
  const nextX = spritePos.x + dx * speed * dt;
  const nextY = spritePos.y + dy * speed * dt;
  const clamped = clampToScene(nextX, nextY);
  const hitEdgeX = clamped.x !== nextX;
  const hitEdgeY = clamped.y !== nextY;
  spritePos = clamped;
  placeSpriteDom(spritePos.x, spritePos.y);

  const edgeDx = hitEdgeX ? dx : 0;
  const edgeDy = hitEdgeY ? dy : 0;
  if (!edgeDx && !edgeDy) return;

  const tdx = edgeDx || 0;
  const tdy = edgeDx ? 0 : edgeDy;
  if ((tdx || tdy) && atEdge(tdx, tdy)) {
    void tryEdgeTransition(tdx, tdy);
  }
}

function setHeld(dir, value) {
  if (!Object.prototype.hasOwnProperty.call(held, dir)) return;
  held[dir] = value;
  if (!anyHeld()) lastTs = 0;
  document.querySelectorAll(".dpad__btn").forEach((btn) => {
    const bdx = Number(btn.dataset.dx);
    const bdy = Number(btn.dataset.dy);
    if (Number.isNaN(bdx) || Number.isNaN(bdy)) return;
    const btnDir = facingFromDelta(bdx, bdy);
    btn.classList.toggle("is-held", Boolean(held[btnDir]));
  });
}

function bindControls() {
  document.querySelectorAll(".dpad__btn[data-dx]").forEach((btn) => {
    const dx = Number(btn.dataset.dx);
    const dy = Number(btn.dataset.dy);
    const dir = facingFromDelta(dx, dy);
    const press = (event) => {
      event.preventDefault();
      btn.setPointerCapture?.(event.pointerId);
      setHeld(dir, true);
    };
    const release = (event) => {
      event.preventDefault();
      setHeld(dir, false);
    };
    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointerleave", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("click", (event) => event.preventDefault());
  });

  window.addEventListener("keydown", (event) => {
    const dir = KEY_DIR[event.key];
    if (!dir) return;
    if (event.repeat) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    setHeld(dir, true);
  });
  window.addEventListener("keyup", (event) => {
    const dir = KEY_DIR[event.key];
    if (!dir) return;
    event.preventDefault();
    setHeld(dir, false);
  });
  window.addEventListener("blur", () => {
    held.up = held.down = held.left = held.right = false;
    setWalkingVisual(false);
  });
}

document.getElementById("leaveTownLink")?.addEventListener("click", (event) => {
  event.preventDefault();
  leaveTown();
});

// Always arrive at the entrance plaza.
position.x = TOWN_ENTRANCE.x;
position.y = TOWN_ENTRANCE.y;
facing = "up";
spritePos = { ...REST_POS };
mode = "outdoor";
interiorId = null;

renderPartyStrip();
buildTownMinimap();
bindControls();
bindInventoryButton("#inventoryBtn");
renderScene();
rafId = requestAnimationFrame(tick);

const leader = getLeader();
setStatus(
  leader
    ? `${leader.name}'s party enters the town square. Roads lead north to the shops.`
    : "You enter the town square. Roads lead north to the shops."
);

void SCENE_W;
void TOWN_STATE_KEY;
void rafId;
