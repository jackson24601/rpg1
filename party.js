const CLASSES = [
  {
    id: "barbarian",
    name: "Barbarian",
    blurb: "Rage-powered melee fighter and durable tank.",
    detail:
      "Barbarian — Rage-powered melee fighter, tank with high damage resistance.",
  },
  {
    id: "fighter",
    name: "Fighter",
    blurb: "Versatile warrior packed with combat maneuvers.",
    detail:
      "Fighter — Versatile warrior, lots of attacks and combat maneuvers.",
  },
  {
    id: "paladin",
    name: "Paladin",
    blurb: "Holy warrior with healing and divine smite.",
    detail:
      "Paladin — Holy warrior with spellcasting and healing, plus divine smite damage.",
  },
  {
    id: "ranger",
    name: "Ranger",
    blurb: "Archer-tracker hybrid with light magic.",
    detail:
      "Ranger — Archer/tracker hybrid, ranged combat with some spellcasting.",
  },
  {
    id: "wizard",
    name: "Wizard",
    blurb: "Book-learned caster with vast spell variety.",
    detail:
      "Wizard — Book-learned spellcaster, wide spell variety, squishy but powerful.",
  },
  {
    id: "sorcerer",
    name: "Sorcerer",
    blurb: "Innate magic with flexible casting.",
    detail:
      "Sorcerer — Innate spellcaster (magic in their blood), fewer spells but more flexibility.",
  },
  {
    id: "cleric",
    name: "Cleric",
    blurb: "Divine healer with solid battlefield presence.",
    detail: "Cleric — Divine spellcaster, healer, moderate combat ability.",
  },
  {
    id: "druid",
    name: "Druid",
    blurb: "Nature magic, wildshape, and healing.",
    detail:
      "Druid — Nature spellcaster, can wildshape into animals, healer.",
  },
  {
    id: "rogue",
    name: "Rogue",
    blurb: "Sneaky burst damage and skill mastery.",
    detail:
      "Rogue — Sneaky damage dealer, best at skills and non-magical tricks, high burst damage.",
  },
  {
    id: "monk",
    name: "Monk",
    blurb: "Swift martial artist with deadly unarmed strikes.",
    detail:
      "Monk — Martial artist, fast movement, impressive unarmed combat.",
  },
  {
    id: "bard",
    name: "Bard",
    blurb: "Charming buffer, skill monkey, and support caster.",
    detail:
      "Bard — Jack-of-all-trades spellcaster, skill monkey, buffer/debuffer with charm magic.",
  },
  {
    id: "warlock",
    name: "Warlock",
    blurb: "Pact-bound blaster with unique invocations.",
    detail:
      "Warlock — Makes a pact with a powerful entity, unique invocation system, spell blasting.",
  },
];

const MAX_PARTY = 3;
const selectedIds = [];

const classGrid = document.getElementById("classGrid");
const slotRow = document.getElementById("slotRow");
const partyCount = document.getElementById("partyCount");
const detailPanel = document.getElementById("detailPanel");
const confirmBtn = document.getElementById("confirmParty");

function getClass(id) {
  return CLASSES.find((entry) => entry.id === id);
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

function toggleClass(id) {
  const existing = selectedIds.indexOf(id);
  if (existing !== -1) {
    selectedIds.splice(existing, 1);
    setDetail(`${getClass(id).name} left the party.`);
  } else if (selectedIds.length < MAX_PARTY) {
    selectedIds.push(id);
    setDetail(getClass(id).detail);
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
    setDetail(getClass(card.dataset.id).detail);
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
