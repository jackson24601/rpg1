/** Party inventory (gold and future items). */

import { rollD6 } from "./combat-enemies.js";

export const INVENTORY_KEY = "dragonQuestInventory";

/**
 * @typedef {{ gold: number, items: string[] }} Inventory
 */

/** @returns {Inventory} */
export function loadInventory() {
  try {
    const raw = sessionStorage.getItem(INVENTORY_KEY);
    if (!raw) return { gold: 0, items: [] };
    const parsed = JSON.parse(raw);
    const gold = Number(parsed?.gold);
    return {
      gold: Number.isFinite(gold) && gold > 0 ? Math.floor(gold) : 0,
      items: Array.isArray(parsed?.items) ? parsed.items.map(String) : [],
    };
  } catch {
    return { gold: 0, items: [] };
  }
}

/** @param {Inventory} inventory */
export function saveInventory(inventory) {
  sessionStorage.setItem(
    INVENTORY_KEY,
    JSON.stringify({
      gold: Math.max(0, Math.floor(Number(inventory.gold) || 0)),
      items: Array.isArray(inventory.items) ? inventory.items : [],
    })
  );
}

export function clearInventory() {
  sessionStorage.removeItem(INVENTORY_KEY);
}

/** Sum of two six-sided dice. */
export function roll2d6() {
  return rollD6() + rollD6();
}

export function addGold(amount) {
  const inventory = loadInventory();
  const gained = Math.max(0, Math.floor(Number(amount) || 0));
  inventory.gold += gained;
  saveInventory(inventory);
  return { inventory, gained };
}

export function getGold() {
  return loadInventory().gold;
}

/** Human-readable inventory lines for the modal. */
export function formatInventoryLines(inventory = loadInventory()) {
  const lines = [`Gold: ${inventory.gold}`];
  if (inventory.items.length) {
    lines.push("Items:");
    inventory.items.forEach((item) => lines.push(`  · ${item}`));
  } else {
    lines.push("Items: none");
  }
  return lines;
}
