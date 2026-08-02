import {
  COLS,
  ROWS,
  START,
  buildMap,
  cellAt,
} from "./map-data.js";
import {
  renderSceneSvg,
  facingFromDelta,
  REST_POS,
  SCENE_W,
  SCENE_H,
  SPRITE_W,
  SPRITE_H,
  WALK_BOUNDS,
  exitPosForDelta,
  entryPosForDelta,
  spriteTransform,
} from "./scene-render.js";

const cells = buildMap();
const sceneFrame = document.getElementById("sceneFrame");
const sceneCaption = document.getElementById("sceneCaption");
const minimap = document.getElementById("minimap");
const locationLabel = document.getElementById("locationLabel");
const coordsLabel = document.getElementById("coordsLabel");
const statusLine = document.getElementById("statusLine");
const partyStrip = document.getElementById("partyStrip");

const position = { ...START };
let facing = "down";
let spritePos = { ...REST_POS };
let isTransitioning = false;
let rafId = 0;
let lastTs = 0;
const miniEls = new Map();

/** Held directions from keyboard / D-pad. */
const held = {
  up: false,
  down: false,
  left: false,
  right: false,
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Pixels per second while holding a direction — deliberate SNES pace. */
const WALK_SPEED = reduceMotion ? 110 : 42;
const TRANSITION_MS = reduceMotion ? 0 : 900;
const ENTRY_HOLD_MS = reduceMotion ? 0 : 280;

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
  const party = loadParty();
  return party[0] || null;
}

function renderPartyStrip() {
  const party = loadParty();
  partyStrip.innerHTML = "";

  if (!party.length) {
    const li = document.createElement("li");
    li.className = "party-chip";
    li.innerHTML = "<span>No party saved — pick heroes first</span>";
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

function buildMinimap() {
  const frag = document.createDocumentFragment();
  cells.forEach((cell) => {
    const tile = document.createElement("div");
    tile.className = `mini-tile mini-tile--${cell.terrain}`;
    tile.title = cell.name;
    tile.setAttribute("role", "gridcell");
    miniEls.set(`${cell.x},${cell.y}`, tile);
    frag.appendChild(tile);
  });
  minimap.style.setProperty("--cols", String(COLS));
  minimap.appendChild(frag);
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
  // Prefer the most recently implied facing axis when both pressed;
  // cancel opposites.
  if (held.left && held.right) dx = 0;
  if (held.up && held.down) dy = 0;
  return { dx, dy };
}

function updateHudLabels(cell) {
  locationLabel.textContent = cell.name;
  coordsLabel.textContent = `${position.x + 1}, ${position.y + 1}`;
  sceneCaption.textContent = cell.special
    ? `Special scene — ${cell.name}`
    : `Scene: ${cell.name}`;

  miniEls.forEach((el) => el.classList.remove("is-current"));
  miniEls.get(`${position.x},${position.y}`)?.classList.add("is-current");
}

function renderScene({ animateFrame = false } = {}) {
  const cell = cellAt(cells, position.x, position.y);
  const leader = getLeader();
  const leaderId = leader?.id || "fighter";

  if (animateFrame) {
    sceneFrame.classList.remove("is-moving");
    void sceneFrame.offsetWidth;
    sceneFrame.classList.add("is-moving");
  }

  sceneFrame.innerHTML = renderSceneSvg(
    cells,
    cell,
    leaderId,
    facing,
    spritePos
  );
  updateHudLabels(cell);
}

function placeSpriteDom(x, y) {
  const node = sceneFrame.querySelector('[data-sprite="leader"]');
  if (!node) return;
  node.setAttribute("transform", spriteTransform(facing, x, y));
}

function setWalkingVisual(active) {
  sceneFrame.classList.toggle("is-walking", active);
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
      else {
        spritePos = { ...target };
        placeSpriteDom(spritePos.x, spritePos.y);
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
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

async function transitionScene(dx, dy) {
  const nextX = position.x + dx;
  const nextY = position.y + dy;
  const target = cellAt(cells, nextX, nextY);

  if (!target) {
    setStatus("The edge of the known world. You cannot go that way.");
    return;
  }

  if (!target.walkable) {
    setStatus("Impassable mountains block your path.");
    return;
  }

  isTransitioning = true;
  setWalkingVisual(true);

  const leader = getLeader();
  const who = leader ? leader.name : "Your party";
  setStatus(`${who} is traveling…`);

  const exitPos = exitPosForDelta(dx, dy, spritePos);
  await animateSpriteTo(exitPos, TRANSITION_MS);

  position.x = nextX;
  position.y = nextY;
  spritePos = entryPosForDelta(dx, dy);
  facing = facingFromDelta(dx, dy);
  renderScene({ animateFrame: true });
  placeSpriteDom(spritePos.x, spritePos.y);

  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (ENTRY_HOLD_MS) {
    await new Promise((r) => setTimeout(r, ENTRY_HOLD_MS));
  }

  // Step a little into the scene from the entry edge, then free roam resumes
  const inward = clampToScene(
    spritePos.x + dx * 28,
    spritePos.y + dy * 20
  );
  await animateSpriteTo(inward, TRANSITION_MS * 0.55);

  if (target.special) {
    setStatus(`${who} entered ${target.name}. Hold an arrow to explore.`);
  } else {
    setStatus(`${who} arrives in the ${target.name.toLowerCase()}. Hold an arrow to walk.`);
  }

  isTransitioning = false;
  setWalkingVisual(anyHeld());
  lastTs = 0;
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

  // Cross into the next scene when pressing into an edge
  const edgeDx = hitEdgeX ? dx : 0;
  const edgeDy = hitEdgeY ? dy : 0;
  if (!edgeDx && !edgeDy) return;

  // If both edges, prefer horizontal
  const tdx = edgeDx || 0;
  const tdy = edgeDx ? 0 : edgeDy;
  if ((tdx || tdy) && atEdge(tdx, tdy)) {
    void transitionScene(tdx, tdy);
  }
}

function setHeld(dir, value) {
  if (!Object.prototype.hasOwnProperty.call(held, dir)) return;
  held[dir] = value;
  if (!anyHeld()) lastTs = 0;

  document.querySelectorAll(`.dpad__btn`).forEach((btn) => {
    const dx = Number(btn.dataset.dx);
    const dy = Number(btn.dataset.dy);
    if (Number.isNaN(dx) || Number.isNaN(dy)) return;
    const btnDir = facingFromDelta(dx, dy);
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
    // Prevent click-focus stealing / synthetic clicks after hold
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

renderPartyStrip();
buildMinimap();
renderScene();
bindControls();
rafId = requestAnimationFrame(tick);

const leader = getLeader();
setStatus(
  leader
    ? `${leader.name} leads the party. Hold an arrow key (or D-pad) to walk the scene; reach an edge to travel on.`
    : "Hold an arrow key to walk. Pick a party first so a hero can lead on the overworld."
);

void ROWS;
void COLS;
void SCENE_W;
void SCENE_H;
void SPRITE_W;
void SPRITE_H;
void rafId;
