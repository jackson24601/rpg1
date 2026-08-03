import {
  CLASSES,
  getCharacterClass,
  formatCombatStats,
} from "./characters.js";

const MAX_PARTY = 3;
const selectedIds = [];

const classGrid = document.getElementById("classGrid");
const slotRow = document.getElementById("slotRow");
const partyCount = document.getElementById("partyCount");
const detailPanel = document.getElementById("detailPanel");
const confirmBtn = document.getElementById("confirmParty");

function getClass(id) {
  return getCharacterClass(id);
}

function renderSlots() {
  const slots = [...slotRow.querySelectorAll(".slot")];
  slots.forEach((slot, index) => {
    const id = selectedIds[index];
    if (!id) {
      slot.classList.remove("is-filled");
      slot.innerHTML = '<span class="slot__empty">Empty</span>';
      return;
    }

    const cls = getClass(id);
    slot.classList.add("is-filled");
    slot.innerHTML = `
      <img
        class="slot__portrait"
        src="assets/characters/${cls.id}.png"
        alt="${cls.name} portrait"
        width="64"
        height="64"
      />
      <div class="slot__meta">
        <p class="slot__name">${cls.name}</p>
        <p class="slot__role">${cls.blurb}</p>
      </div>
    `;
  });
}

function renderCards() {
  const atCap = selectedIds.length >= MAX_PARTY;

  classGrid.querySelectorAll(".class-card").forEach((card) => {
    const id = card.dataset.id;
    const selectedIndex = selectedIds.indexOf(id);
    const isSelected = selectedIndex !== -1;
    const badge = card.querySelector(".class-card__badge");

    card.classList.toggle("is-selected", isSelected);
    card.classList.toggle("is-disabled", atCap && !isSelected);
    card.setAttribute("aria-pressed", String(isSelected));

    if (isSelected) {
      badge.hidden = false;
      badge.textContent = String(selectedIndex + 1);
    } else {
      badge.hidden = true;
      badge.textContent = "";
    }
  });
}

function updateChrome() {
  partyCount.textContent = `${selectedIds.length} / ${MAX_PARTY} chosen`;
  const ready = selectedIds.length === MAX_PARTY;
  confirmBtn.disabled = !ready;
  confirmBtn.classList.toggle("is-ready", ready);
}

function setDetail(text) {
  detailPanel.textContent = text;
}

function showClassDetail(id) {
  const cls = getClass(id);
  if (!cls) return;
  setDetail(formatCombatStats(cls));
}

function toggleClass(id) {
  const existing = selectedIds.indexOf(id);
  if (existing !== -1) {
    selectedIds.splice(existing, 1);
    setDetail(`${getClass(id).name} left the party.`);
  } else if (selectedIds.length < MAX_PARTY) {
    selectedIds.push(id);
    showClassDetail(id);
  } else {
    setDetail("Your party is full. Deselect a member before choosing another.");
    return;
  }

  renderSlots();
  renderCards();
  updateChrome();
}

function buildGrid() {
  const frag = document.createDocumentFragment();

  CLASSES.forEach((cls) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <button type="button" class="class-card" data-id="${cls.id}" aria-pressed="false">
        <div class="class-card__portrait-wrap">
          <img
            class="class-card__portrait"
            src="assets/characters/${cls.id}.png"
            alt="${cls.name}"
            width="256"
            height="256"
            loading="lazy"
          />
          <span class="class-card__badge" hidden></span>
        </div>
        <p class="class-card__name">${cls.name}</p>
        <p class="class-card__blurb">${cls.blurb}</p>
      </button>
    `;
    frag.appendChild(li);
  });

  classGrid.appendChild(frag);

  classGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".class-card");
    if (!card) return;
    toggleClass(card.dataset.id);
  });

  classGrid.addEventListener("mouseover", (event) => {
    const card = event.target.closest(".class-card");
    if (!card) return;
    if (selectedIds.includes(card.dataset.id)) return;
    showClassDetail(card.dataset.id);
  });
}

confirmBtn.addEventListener("click", () => {
  if (selectedIds.length !== MAX_PARTY) return;

  const party = selectedIds.map((id) => {
    const cls = getClass(id);
    return { id: cls.id, name: cls.name };
  });

  sessionStorage.setItem("dragonQuestParty", JSON.stringify(party));
  setDetail(
    `Party ready: ${party.map((member) => member.name).join(", ")}. Entering the overworld…`
  );
  confirmBtn.textContent = "Embarking…";
  confirmBtn.disabled = true;
  confirmBtn.classList.remove("is-ready");

  window.setTimeout(() => {
    window.location.href = "game.html";
  }, 700);
});

buildGrid();
renderSlots();
updateChrome();
