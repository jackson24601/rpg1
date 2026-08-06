/** Shared Inventory button + modal for overworld, town, and battle. */

import {
  loadInventory,
  isConsumable,
  getConsumableEffect,
  consumeInventoryItem,
} from "./inventory.js";

const MODAL_ID = "inventoryModal";

function ensureModal() {
  let modal = document.getElementById(MODAL_ID);
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = MODAL_ID;
  modal.className = "inventory-modal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "inventoryModalTitle");
  modal.innerHTML = `
    <div class="inventory-modal__panel rpg-window">
      <header class="inventory-modal__header">
        <h2 class="inventory-modal__title" id="inventoryModalTitle">Inventory</h2>
        <button type="button" class="inventory-modal__close" data-inventory-close aria-label="Close inventory">✕</button>
      </header>
      <div class="inventory-modal__body" id="inventoryModalBody"></div>
      <p class="inventory-modal__message" id="inventoryModalMessage" hidden></p>
      <footer class="inventory-modal__footer">
        <button type="button" class="inventory-modal__ok" data-inventory-close>Close</button>
      </footer>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeInventoryModal();
  });
  modal.querySelectorAll("[data-inventory-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeInventoryModal());
  });

  return modal;
}

function setInventoryMessage(text) {
  const msg = document.getElementById("inventoryModalMessage");
  if (!msg) return;
  if (!text) {
    msg.hidden = true;
    msg.textContent = "";
    return;
  }
  msg.hidden = false;
  msg.textContent = text;
}

function renderInventoryBody() {
  const body = document.getElementById("inventoryModalBody");
  if (!body) return;
  const inventory = loadInventory();

  const parts = [`<p class="inventory-modal__line">Gold: ${inventory.gold}</p>`];
  if (!inventory.items.length) {
    parts.push(`<p class="inventory-modal__line">Items: none</p>`);
  } else {
    parts.push(`<p class="inventory-modal__line">Items:</p>`);
    parts.push(`<ul class="inventory-modal__items">`);
    inventory.items.forEach((item, index) => {
      const consumable = isConsumable(item);
      const effect = getConsumableEffect(item);
      const title = consumable
        ? `Eat ${item}: +${effect.hitPoints} HP and +${effect.stamina} STA to the whole party`
        : item;
      if (consumable) {
        parts.push(`
          <li>
            <button type="button" class="inventory-modal__item" data-item-index="${index}" title="${title}">
              ${item}
              <span class="inventory-modal__item-hint">(+${effect.hitPoints} HP / +${effect.stamina} STA — click to eat)</span>
            </button>
          </li>
        `);
      } else {
        parts.push(`
          <li>
            <span class="inventory-modal__item inventory-modal__item--inert">${item}</span>
          </li>
        `);
      }
    });
    parts.push(`</ul>`);
  }

  body.innerHTML = parts.join("");

  body.querySelectorAll("[data-item-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.itemIndex);
      const result = consumeInventoryItem(index);
      if (!result.ok) {
        setInventoryMessage(
          result.reason === "not_consumable"
            ? "That item can't be used right now."
            : "Couldn't use that item."
        );
        return;
      }
      setInventoryMessage(
        `The party eats the ${result.item}! Everyone recovers ${result.effect.hitPoints} HP and ${result.effect.stamina} stamina.`
      );
      renderInventoryBody();
    });
  });
}

export function openInventoryModal() {
  const modal = ensureModal();
  setInventoryMessage("");
  renderInventoryBody();
  modal.hidden = false;
  modal.querySelector("[data-inventory-close]")?.focus?.();
}

export function closeInventoryModal() {
  const modal = document.getElementById(MODAL_ID);
  if (modal) modal.hidden = true;
  setInventoryMessage("");
}

/**
 * Wire an Inventory button (by element or selector) and ensure the modal exists.
 * @param {string|HTMLElement} buttonOrSelector
 */
export function bindInventoryButton(buttonOrSelector) {
  ensureModal();
  const button =
    typeof buttonOrSelector === "string"
      ? document.querySelector(buttonOrSelector)
      : buttonOrSelector;
  if (!button) return;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    openInventoryModal();
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeInventoryModal();
});
