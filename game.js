import {
  COLS,
  ROWS,
  START,
  buildMap,
  cellAt,
} from "./map-data.js";

const cells = buildMap();
const board = document.getElementById("board");
const boardScroll = document.getElementById("boardScroll");
const locationLabel = document.getElementById("locationLabel");
const coordsLabel = document.getElementById("coordsLabel");
const statusLine = document.getElementById("statusLine");
const partyStrip = document.getElementById("partyStrip");

const position = { ...START };
const tileEls = new Map();

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

  party.forEach((member) => {
    const li = document.createElement("li");
    li.className = "party-chip";
    li.innerHTML = `
      <img src="assets/characters/${member.id}.png" alt="" width="28" height="28" />
      <span>${member.name}</span>
    `;
    partyStrip.appendChild(li);
  });
}

function shortLabel(name) {
  if (name.length <= 14) return name;
  return name.replace("Initial Sequence", "Start")
    .replace("Temple of Peace", "Temple")
    .replace("Outlaw Hideout", "Hideout")
    .replace("Abandoned Ruins", "Ruins")
    .replace("Witches' Lair", "Witches")
    .replace("Mines of Tyrol", "Mines")
    .replace("Dragon Castle", "Castle");
}

function buildBoard() {
  const frag = document.createDocumentFragment();

  cells.forEach((cell) => {
    const tile = document.createElement("div");
    tile.className = `tile tile--${cell.terrain}`;
    tile.dataset.x = String(cell.x);
    tile.dataset.y = String(cell.y);
    tile.setAttribute("role", "gridcell");
    tile.setAttribute("aria-label", cell.name);

    if (cell.special || cell.terrain === "mountain") {
      const label = document.createElement("p");
      label.className = "tile__label";
      label.textContent = shortLabel(cell.name);
      tile.appendChild(label);
    }

    tileEls.set(`${cell.x},${cell.y}`, tile);
    frag.appendChild(tile);
  });

  board.style.setProperty("--cols", String(COLS));
  board.appendChild(frag);
}

function setStatus(message) {
  statusLine.textContent = message;
}

function updateHud() {
  const cell = cellAt(cells, position.x, position.y);
  locationLabel.textContent = cell?.name ?? "Unknown";
  coordsLabel.textContent = `${position.x + 1}, ${position.y + 1}`;

  tileEls.forEach((el) => el.classList.remove("is-current"));
  const current = tileEls.get(`${position.x},${position.y}`);
  current?.classList.add("is-current");
  scrollToParty();
}

function scrollToParty() {
  const current = tileEls.get(`${position.x},${position.y}`);
  if (!current || !boardScroll) return;

  const tileRect = current.getBoundingClientRect();
  const viewRect = boardScroll.getBoundingClientRect();
  const offsetTop =
    tileRect.top - viewRect.top + boardScroll.scrollTop - viewRect.height / 2 + tileRect.height / 2;
  const offsetLeft =
    tileRect.left - viewRect.left + boardScroll.scrollLeft - viewRect.width / 2 + tileRect.width / 2;

  boardScroll.scrollTo({
    top: Math.max(0, offsetTop),
    left: Math.max(0, offsetLeft),
    behavior: "smooth",
  });
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
    return;
  }

  position.x = nextX;
  position.y = nextY;
  updateHud();

  if (target.special) {
    setStatus(`Entered ${target.name}. (Encounters coming soon.)`);
  } else {
    setStatus(`Your party travels through the ${target.name.toLowerCase()}.`);
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
buildBoard();
updateHud();
bindControls();
setStatus("Your quest begins at the Initial Sequence. Mountains ring the land and cannot be crossed.");

// Ensure starting tile is visible after layout.
requestAnimationFrame(() => {
  requestAnimationFrame(scrollToParty);
});

// Quiet unused import warning for ROWS in bundlers; kept for map integrity checks.
void ROWS;
