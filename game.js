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
let isAnimating = false;
const miniEls = new Map();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const WALK_MS = reduceMotion ? 0 : 560;
const ENTER_MS = reduceMotion ? 0 : 560;
const ENTRY_HOLD_MS = reduceMotion ? 0 : 350;

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

function setControlsEnabled(enabled) {
  document.querySelectorAll(".dpad__btn[data-dx]").forEach((btn) => {
    btn.disabled = !enabled;
  });
  sceneFrame.classList.toggle("is-walking", !enabled);
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

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function animateSpriteTo(target, durationMs) {
  return new Promise((resolve) => {
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
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        spritePos = { ...target };
        placeSpriteDom(spritePos.x, spritePos.y);
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

async function tryMove(dx, dy) {
  if (isAnimating) return;

  const nextX = position.x + dx;
  const nextY = position.y + dy;
  const target = cellAt(cells, nextX, nextY);

  if (!target) {
    setStatus("The edge of the known world. You cannot go that way.");
    return;
  }

  facing = facingFromDelta(dx, dy);

  if (!target.walkable) {
    setStatus("Impassable mountains block your path.");
    // Face the mountain and take a short step, then return
    isAnimating = true;
    setControlsEnabled(false);
    const bump = {
      x: spritePos.x + dx * 10,
      y: spritePos.y + dy * 8,
    };
    await animateSpriteTo(bump, 140);
    await animateSpriteTo(REST_POS, 160);
    spritePos = { ...REST_POS };
    renderScene();
    isAnimating = false;
    setControlsEnabled(true);
    return;
  }

  isAnimating = true;
  setControlsEnabled(false);

  const leader = getLeader();
  const who = leader ? leader.name : "Your party";
  setStatus(`${who} is traveling…`);

  // 1) Walk off the current scene toward the chosen edge
  const exitPos = exitPosForDelta(dx, dy, spritePos);
  await animateSpriteTo(exitPos, WALK_MS);

  // 2) Enter the next scene on that same side (went left → begin on left)
  position.x = nextX;
  position.y = nextY;
  spritePos = entryPosForDelta(dx, dy);
  renderScene({ animateFrame: true });
  placeSpriteDom(spritePos.x, spritePos.y);

  // Let the entry pose paint before walking inward
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (ENTRY_HOLD_MS) {
    await new Promise((resolve) => setTimeout(resolve, ENTRY_HOLD_MS));
  }

  // 3) Walk from the entry edge into the scene
  await animateSpriteTo(REST_POS, ENTER_MS);
  spritePos = { ...REST_POS };

  if (target.special) {
    setStatus(`${who} entered ${target.name}. (Encounters coming soon.)`);
  } else {
    setStatus(`${who} arrives in the ${target.name.toLowerCase()}.`);
  }

  isAnimating = false;
  setControlsEnabled(true);
}

function bindControls() {
  document.querySelectorAll(".dpad__btn[data-dx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      tryMove(Number(btn.dataset.dx), Number(btn.dataset.dy));
    });
  });

  window.addEventListener("keydown", (event) => {
    const map = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const delta = map[event.key];
    if (!delta) return;
    event.preventDefault();
    tryMove(delta[0], delta[1]);
  });
}

renderPartyStrip();
buildMinimap();
renderScene();
bindControls();

const leader = getLeader();
setStatus(
  leader
    ? `${leader.name} leads the party at the Initial Sequence. Walk between scenes with the arrows.`
    : "Your quest begins at the Initial Sequence. Pick a party first so a hero can lead on the overworld."
);

void ROWS;
void COLS;
