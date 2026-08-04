/** Shared Inventory button + modal for overworld and battle. */

import { formatInventoryLines, loadInventory } from "./inventory.js";

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

export function openInventoryModal() {
  const modal = ensureModal();
  const body = modal.querySelector("#inventoryModalBody");
  const lines = formatInventoryLines(loadInventory());
  body.innerHTML = lines.map((line) => `<p class="inventory-modal__line">${line}</p>`).join("");
  modal.hidden = false;
  modal.querySelector("[data-inventory-close]")?.focus?.();
}

export function closeInventoryModal() {
  const modal = document.getElementById(MODAL_ID);
  if (modal) modal.hidden = true;
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
