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
import {
  canSpawnGoblins,
  canSpawnOrcs,
  createGoblin,
  createOrc,
  pickSpawnAwayFrom,
  chaseStep,
  EARLY_SPAWN_CHANCE,
  EARLY_SPAWN_WINDOW_MS,
  FORCED_SPAWN_MS,
  ORC_SPAWN_DELAY_MS,
  ORC_SPAWN_CHANCE,
} from "./enemies.js";
import { bindInventoryButton } from "./inventory-ui.js";
import { STAMINA_REGEN_INTERVAL_MS } from "./characters.js";
import {
  applyOverworldStaminaRegen,
  resetStaminaRegenClock,
} from "./party-state.js";
import {
  createWoodcutters,
  isWoodcutterCell,
  woodcutterSceneConfig,
} from "./npcs.js";

const cells = buildMap();
const sceneFrame = document.getElementById("sceneFrame");
const sceneArt = document.getElementById("sceneArt");
const entityLayer = document.getElementById("entityLayer");
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

/** Active enemies in the current scene. */
let enemies = [];
/** Active friendly NPCs in the current scene. */
let npcs = [];
/** Whether the party has approached NPCs this visit (stops chopping / shows dialogue). */
let npcsAlerted = false;
/** Pending spawn timers for the current scene. */
const spawnTimers = [];
/** Prevent double-triggering an encounter while navigating away. */
let encounterLocked = false;

const BATTLE_KEY = "dragonQuestBattle";
const OVERWORLD_KEY = "dragonQuestOverworld";
/** Distance between sprite origins that counts as contact. */
const ENCOUNTER_DISTANCE = 26;

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
    if (cell.enterable) tile.classList.add("is-enterable");
    tile.title = cell.enterable ? `${cell.name} (open)` : cell.name;
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

function clearSpawnTimers() {
  while (spawnTimers.length) {
    clearTimeout(spawnTimers.pop());
  }
}

function clearEnemies() {
  clearSpawnTimers();
  enemies = [];
  entityLayer.querySelectorAll(".enemy-sprite").forEach((el) => el.remove());
}

function clearNpcs() {
  npcs = [];
  npcsAlerted = false;
  entityLayer
    .querySelectorAll(".npc-sprite, .npc-dialogue")
    .forEach((el) => el.remove());
}

function syncEnemyDom() {
  const existing = new Map(
    [...entityLayer.querySelectorAll(".enemy-sprite")].map((el) => [el.dataset.enemyId, el])
  );

  const keep = new Set(enemies.map((e) => e.id));
  existing.forEach((el, id) => {
    if (!keep.has(id)) el.remove();
  });

  enemies.forEach((enemy) => {
    let el = existing.get(enemy.id);
    if (!el) {
      el = document.createElement("div");
      el.className = "enemy-sprite";
      el.dataset.enemyId = enemy.id;
      el.dataset.enemyType = enemy.type;
      el.innerHTML = `<img src="${enemy.src}" alt="${enemy.name}" width="40" height="44" draggable="false" />`;
      entityLayer.appendChild(el);
    }
    el.style.left = `${(enemy.x / SCENE_W) * 100}%`;
    el.style.top = `${(enemy.y / SCENE_H) * 100}%`;
    el.classList.toggle("is-flip", enemy.facing === "left");
  });
}

function syncNpcDom() {
  const existing = new Map(
    [...entityLayer.querySelectorAll(".npc-sprite")].map((el) => [el.dataset.npcId, el])
  );

  const keep = new Set(npcs.map((n) => n.id));
  existing.forEach((el, id) => {
    if (!keep.has(id)) el.remove();
  });

  npcs.forEach((npc) => {
    let el = existing.get(npc.id);
    if (!el) {
      el = document.createElement("div");
      el.className = "npc-sprite";
      el.dataset.npcId = npc.id;
      el.dataset.npcKind = npc.kind || "npc";
      el.innerHTML = `
        <span class="npc-sprite__axe" aria-hidden="true"></span>
        <img src="${npc.src}" alt="${npc.name}" width="40" height="44" draggable="false" />
      `;
      entityLayer.appendChild(el);
    }
    el.style.left = `${(npc.x / SCENE_W) * 100}%`;
    el.style.top = `${(npc.y / SCENE_H) * 100}%`;
    el.classList.toggle("is-flip", npc.facing === "left");
    el.classList.toggle("is-chopping", Boolean(npc.chopping));
    el.classList.toggle("is-idle", !npc.chopping);
  });

  syncNpcDialogue();
}

function syncNpcDialogue() {
  const config = woodcutterSceneConfig();
  let bubble = entityLayer.querySelector(".npc-dialogue");

  if (!npcsAlerted || !npcs.length) {
    bubble?.remove();
    return;
  }

  const speaker = npcs.find((n) => n.speaker) || npcs[0];
  if (!bubble) {
    bubble = document.createElement("div");
    bubble.className = "npc-dialogue";
    bubble.setAttribute("role", "status");
    entityLayer.appendChild(bubble);
  }

  bubble.textContent = config.dialogue;
  // Anchor above the speaker sprite.
  const bubbleX = speaker.x + SPRITE_W / 2;
  const bubbleY = speaker.y - 4;
  bubble.style.left = `${(bubbleX / SCENE_W) * 100}%`;
  bubble.style.top = `${(bubbleY / SCENE_H) * 100}%`;
}

function setupNpcScene(cell) {
  clearNpcs();
  if (!isWoodcutterCell(cell)) return;
  npcs = createWoodcutters();
  npcsAlerted = false;
  syncNpcDom();
  setStatus("Woodcutters work the trees. Approach them.");
}

function checkNpcApproach() {
  if (npcsAlerted || !npcs.length || isTransitioning || encounterLocked) return;

  const config = woodcutterSceneConfig();
  const partyCx = spritePos.x + SPRITE_W / 2;
  const partyCy = spritePos.y + SPRITE_H / 2;
  const limit = config.approachDistance;

  const near = npcs.some((npc) => {
    const nx = npc.x + SPRITE_W / 2;
    const ny = npc.y + SPRITE_H / 2;
    return Math.hypot(nx - partyCx, ny - partyCy) <= limit;
  });

  if (!near) return;

  npcsAlerted = true;
  npcs = npcs.map((npc) => ({ ...npc, chopping: false }));
  syncNpcDom();
  setStatus(config.dialogue);
}

function spawnGoblin() {
  const cell = cellAt(cells, position.x, position.y);
  if (!canSpawnGoblins(cell)) return;
  if (enemies.some((e) => e.type === "goblin")) return;

  const pos = pickSpawnAwayFrom(spritePos);
  const toward = facingFromDelta(spritePos.x - pos.x, spritePos.y - pos.y);
  enemies.push(createGoblin(pos.x, pos.y, toward));
  syncEnemyDom();
  setStatus("A Goblin appears!");
}

function spawnOrc() {
  const cell = cellAt(cells, position.x, position.y);
  if (!canSpawnOrcs(cell)) return;
  if (enemies.some((e) => e.type === "orc")) return;

  const pos = pickSpawnAwayFrom(spritePos);
  const toward = facingFromDelta(spritePos.x - pos.x, spritePos.y - pos.y);
  enemies.push(createOrc(pos.x, pos.y, toward));
  syncEnemyDom();
  setStatus("An Orc appears!");
}

function scheduleSceneSpawns(cell) {
  clearSpawnTimers();
  const params = new URLSearchParams(window.location.search);
  const forceEnemy = params.get("forceEnemy");
  const forceGoblin =
    forceEnemy === "goblin" ||
    sessionStorage.getItem("dragonQuestForceGoblin") === "1";
  const forceOrc =
    forceEnemy === "orc" ||
    sessionStorage.getItem("dragonQuestForceOrc") === "1";

  if (canSpawnGoblins(cell)) {
    // 50% chance a Goblin shows up within the first second.
    if (forceGoblin || Math.random() < EARLY_SPAWN_CHANCE) {
      const delay = forceGoblin ? 200 : Math.random() * EARLY_SPAWN_WINDOW_MS;
      spawnTimers.push(setTimeout(spawnGoblin, delay));
    }

    // After 30s in this scene with no Goblin, one appears for sure.
    spawnTimers.push(
      setTimeout(() => {
        if (!enemies.some((e) => e.type === "goblin")) {
          spawnGoblin();
        }
      }, FORCED_SPAWN_MS)
    );
  }

  if (canSpawnOrcs(cell)) {
    // After 2 seconds, 50% chance an Orc appears and chases the party.
    spawnTimers.push(
      setTimeout(() => {
        if (forceOrc || Math.random() < ORC_SPAWN_CHANCE) {
          spawnOrc();
        }
      }, forceOrc ? 200 : ORC_SPAWN_DELAY_MS)
    );
  }
}

function onSceneReady(cell) {
  clearEnemies();
  setupNpcScene(cell);
  scheduleSceneSpawns(cell);
  // If the party already stands near NPCs (edge entry / battle return), alert now.
  checkNpcApproach();
}

function updateEnemies(dt) {
  if (!enemies.length) return;
  enemies = enemies.map((enemy) => chaseStep(enemy, spritePos, WALK_SPEED, dt));
  syncEnemyDom();
  checkEncounterContact();
}

function checkEncounterContact() {
  if (encounterLocked || isTransitioning || !enemies.length) return;

  const partyCx = spritePos.x + SPRITE_W / 2;
  const partyCy = spritePos.y + SPRITE_H / 2;

  for (const enemy of enemies) {
    const ex = enemy.x + SPRITE_W / 2;
    const ey = enemy.y + SPRITE_H / 2;
    if (Math.hypot(ex - partyCx, ey - partyCy) <= ENCOUNTER_DISTANCE) {
      beginEncounter(enemy);
      return;
    }
  }
}

function beginEncounter(enemy) {
  encounterLocked = true;
  clearSpawnTimers();
  held.up = held.down = held.left = held.right = false;
  setWalkingVisual(false);
  setStatus(`A wild ${enemy.name} engages your party!`);
  // Pause overworld regen while in combat (clock resumes on return).
  resetStaminaRegenClock();

  sessionStorage.setItem(
    OVERWORLD_KEY,
    JSON.stringify({
      x: position.x,
      y: position.y,
      facing,
      spritePos,
    })
  );
  sessionStorage.setItem(
    BATTLE_KEY,
    JSON.stringify({
      // Troop size is rolled when battle.html starts (goblin d6, orc 1–3).
      enemyType: enemy.type || "goblin",
    })
  );

  window.setTimeout(() => {
    window.location.href = "battle.html";
  }, 450);
}

/** Outside combat: +0.5 stamina per hero every 10s, capped at class max. */
function tickStaminaRegen() {
  if (encounterLocked) return;
  const party = loadParty();
  if (!party.length) return;
  applyOverworldStaminaRegen(party);
}

function startStaminaRegen() {
  // Do not reset the clock here — battle / encounter code already anchors it
  // when leaving or entering combat. On a mid-overworld refresh, pending ticks
  // should still apply (capped at each class max).
  tickStaminaRegen();
  // Poll often enough to apply catch-up if the tab was backgrounded.
  window.setInterval(tickStaminaRegen, Math.min(1000, STAMINA_REGEN_INTERVAL_MS));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tickStaminaRegen();
  });
}

function restoreOverworldState() {
  try {
    const raw = sessionStorage.getItem(OVERWORLD_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      position.x = saved.x;
      position.y = saved.y;
    }
    if (saved.facing) facing = saved.facing;
    if (saved.spritePos?.x != null && saved.spritePos?.y != null) {
      spritePos = { ...saved.spritePos };
    }
    // Consumed after a battle return so a refresh doesn't soft-lock position forever.
    sessionStorage.removeItem(OVERWORLD_KEY);
  } catch {
    // ignore corrupt save
  }
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

  sceneArt.innerHTML = renderSceneSvg(
    cells,
    cell,
    leaderId,
    facing,
    spritePos
  );
  updateHudLabels(cell);
  syncEnemyDom();
  syncNpcDom();
}

function placeSpriteDom(x, y) {
  const node = sceneArt.querySelector('[data-sprite="leader"]');
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

function enterTownFromOverworld() {
  encounterLocked = true;
  clearEnemies();
  clearSpawnTimers();
  held.up = held.down = held.left = held.right = false;
  setWalkingVisual(false);
  setStatus("You pass through the town gates…");
  // Remember the overworld approach cell so leaving town returns nearby.
  sessionStorage.setItem(
    OVERWORLD_KEY,
    JSON.stringify({
      x: position.x,
      y: position.y,
      facing,
      spritePos,
    })
  );
  window.setTimeout(() => {
    window.location.href = "town.html";
  }, 350);
}

async function transitionScene(dx, dy) {
  const nextX = position.x + dx;
  const nextY = position.y + dy;
  const target = cellAt(cells, nextX, nextY);

  if (!target) {
    setStatus("The edge of the known world. You cannot go that way.");
    return;
  }

  // Enterable landmarks (TOWN) open dedicated scenes from the overworld grid.
  if (target.enterable && target.name === "TOWN") {
    isTransitioning = true;
    setWalkingVisual(true);
    const exitPos = exitPosForDelta(dx, dy, spritePos);
    await animateSpriteTo(exitPos, TRANSITION_MS * 0.65);
    enterTownFromOverworld();
    return;
  }

  if (!target.walkable) {
    if (target.special && !target.enterable) {
      setStatus(`${target.name} is sealed for now. Return when it is ready.`);
    } else if (!target.special) {
      setStatus("Impassable mountains block your path.");
    } else {
      setStatus(`${target.name} lies ahead.`);
    }
    return;
  }

  isTransitioning = true;
  clearEnemies();
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
  onSceneReady(target);
}

function tick(ts) {
  rafId = requestAnimationFrame(tick);
  if (isTransitioning || encounterLocked) return;

  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  updateEnemies(dt);
  if (encounterLocked) return;
  checkNpcApproach();

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
  checkEncounterContact();
  if (encounterLocked) return;
  checkNpcApproach();

  const edgeDx = hitEdgeX ? dx : 0;
  const edgeDy = hitEdgeY ? dy : 0;
  if (!edgeDx && !edgeDy) return;

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

restoreOverworldState();
renderPartyStrip();
buildMinimap();
renderScene();
placeSpriteDom(spritePos.x, spritePos.y);
bindControls();
bindInventoryButton("#inventoryBtn");
startStaminaRegen();
rafId = requestAnimationFrame(tick);

const startCell = cellAt(cells, position.x, position.y);
onSceneReady(startCell);

const leader = getLeader();
setStatus(
  leader
    ? `${leader.name} leads the party. Hold an arrow key (or D-pad) to walk the scene; reach an edge to travel on.`
    : "Hold an arrow key to walk. Pick a party first so a hero can lead on the overworld."
);

void ROWS;
void COLS;
void SPRITE_W;
void SPRITE_H;
void rafId;
