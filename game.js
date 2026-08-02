import {
  COLS,
  ROWS,
  START,
  buildMap,
  cellAt,
} from "./map-data.js";
import { renderSceneSvg, facingFromDelta } from "./scene-render.js";

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
const miniEls = new Map();

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

function renderScene() {
  const cell = cellAt(cells, position.x, position.y);
  const leader = getLeader();
  const leaderId = leader?.id || "fighter";

  sceneFrame.classList.remove("is-moving");
  // force reflow so animation can replay
  void sceneFrame.offsetWidth;
  sceneFrame.classList.add("is-moving");
  sceneFrame.innerHTML = renderSceneSvg(cells, cell, leaderId, facing);

  locationLabel.textContent = cell.name;
  coordsLabel.textContent = `${position.x + 1}, ${position.y + 1}`;
  sceneCaption.textContent = cell.special
    ? `Special scene — ${cell.name}`
    : `Scene: ${cell.name}`;

  miniEls.forEach((el) => el.classList.remove("is-current"));
  miniEls.get(`${position.x},${position.y}`)?.classList.add("is-current");
}

function tryMove(dx, dy) {
  const nextX = position.x + dx;
  const nextY = position.y + dy;
  const target = cellAt(cells, nextX, nextY);

  if (!target) {
    setStatus("The edge of the known world. You cannot go that way.");
    return;
  }

  if (!target.walkable) {
    setStatus("Impassable mountains block your path.");
    facing = facingFromDelta(dx, dy);
    renderScene();
    return;
  }

  facing = facingFromDelta(dx, dy);
  position.x = nextX;
  position.y = nextY;
  renderScene();

  const leader = getLeader();
  const who = leader ? leader.name : "Your party";

  if (target.special) {
    setStatus(`${who} entered ${target.name}. (Encounters coming soon.)`);
  } else {
    setStatus(`${who} travels into the ${target.name.toLowerCase()} scene.`);
  }
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
    ? `${leader.name} leads the party at the Initial Sequence. Each square is its own scene — mountains cannot be crossed.`
    : "Your quest begins at the Initial Sequence. Pick a party first so a hero can lead on the overworld."
);

void ROWS;
void COLS;
