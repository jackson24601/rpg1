/** Party inventory (gold and consumable items). */

import { rollD6 } from "./combat-enemies.js";
import {
  ensurePartyCombatState,
  loadPartyCombatState,
  PARTY_STATE_KEY,
} from "./party-state.js";
import { getCharacterClass } from "./characters.js";

export const INVENTORY_KEY = "dragonQuestInventory";
export const PARTY_KEY = "dragonQuestParty";

/** Fired on window after a consumable is eaten (battle can refresh live HP/STA). */
export const INVENTORY_CONSUMED_EVENT = "dragonQuestInventoryConsumed";

/**
 * Grocer food: clicking in inventory restores the whole party.
 * @type {Record<string, { hitPoints: number, stamina: number }>}
 */
export const CONSUMABLE_FOOD = {
  Apples: { hitPoints: 5, stamina: 1 },
  Bread: { hitPoints: 10, stamina: 2 },
  Meat: { hitPoints: 15, stamina: 3 },
};

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

/**
 * Spend gold if the party can afford it.
 * @returns {{ ok: boolean, inventory: Inventory, spent: number, reason?: string }}
 */
export function spendGold(amount) {
  const inventory = loadInventory();
  const cost = Math.max(0, Math.floor(Number(amount) || 0));
  if (cost <= 0) {
    return { ok: true, inventory, spent: 0 };
  }
  if (inventory.gold < cost) {
    return {
      ok: false,
      inventory,
      spent: 0,
      reason: "not_enough_gold",
    };
  }
  inventory.gold -= cost;
  saveInventory(inventory);
  return { ok: true, inventory, spent: cost };
}

/** Add a named item to the inventory list. */
export function addItem(itemName) {
  const inventory = loadInventory();
  const name = String(itemName || "").trim();
  if (!name) return { inventory, added: null };
  inventory.items.push(name);
  saveInventory(inventory);
  return { inventory, added: name };
}

/**
 * Buy an item for `cost` gold if affordable.
 * @returns {{ ok: boolean, inventory: Inventory, reason?: string }}
 */
export function buyItem(itemName, cost) {
  const price = Math.max(0, Math.floor(Number(cost) || 0));
  const preview = loadInventory();
  if (preview.gold < price) {
    return { ok: false, inventory: preview, reason: "not_enough_gold" };
  }
  const spent = spendGold(price);
  if (!spent.ok) {
    return { ok: false, inventory: spent.inventory, reason: spent.reason };
  }
  const { inventory } = addItem(itemName);
  return { ok: true, inventory };
}

export function getGold() {
  return loadInventory().gold;
}

export function getConsumableEffect(itemName) {
  return CONSUMABLE_FOOD[String(itemName || "")] || null;
}

export function isConsumable(itemName) {
  return Boolean(getConsumableEffect(itemName));
}

/** Remove one inventory slot by index. */
export function removeItemAt(index) {
  const inventory = loadInventory();
  if (index < 0 || index >= inventory.items.length) {
    return { ok: false, inventory, removed: null };
  }
  const [removed] = inventory.items.splice(index, 1);
  saveInventory(inventory);
  return { ok: true, inventory, removed };
}

function loadPartyMembers() {
  try {
    const raw = sessionStorage.getItem(PARTY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}

/**
 * Restore HP and stamina for every party member, capped at class maxima.
 * Updates persisted party combat state.
 */
export function restorePartyFromFood(effect) {
  const party = loadPartyMembers();
  ensurePartyCombatState(party);
  const state = loadPartyCombatState();
  const hpGain = Math.max(0, Number(effect?.hitPoints) || 0);
  const staGain = Math.max(0, Number(effect?.stamina) || 0);
  const applied = [];

  party.forEach((member) => {
    const id = typeof member === "string" ? member : member?.id;
    if (!id || !state[id]) return;
    const cls = getCharacterClass(id);
    const maxHp =
      typeof cls?.hitPoints === "number" ? cls.hitPoints : state[id].hitPoints;
    const maxSta =
      typeof cls?.stamina === "number" ? cls.stamina : state[id].stamina;

    const beforeHp = Number(state[id].hitPoints) || 0;
    const beforeSta =
      state[id].stamina == null ? null : Number(state[id].stamina) || 0;

    state[id].hitPoints = Math.min(maxHp, beforeHp + hpGain);
    if (beforeSta != null && maxSta != null) {
      state[id].stamina = Math.min(maxSta, beforeSta + staGain);
    }

    applied.push({
      id,
      name: cls?.name || id,
      hitPoints: state[id].hitPoints,
      stamina: state[id].stamina,
      hitPointsGained: state[id].hitPoints - beforeHp,
      staminaGained:
        beforeSta == null || state[id].stamina == null
          ? 0
          : state[id].stamina - beforeSta,
    });
  });

  sessionStorage.setItem(PARTY_STATE_KEY, JSON.stringify(state));
  return { party, state, applied, effect: { hitPoints: hpGain, stamina: staGain } };
}

/**
 * Consume a food item at `index`: remove it and heal the whole party.
 * @returns {{ ok: boolean, item?: string, effect?: object, applied?: object[], inventory: Inventory, reason?: string }}
 */
export function consumeInventoryItem(index) {
  const inventory = loadInventory();
  const item = inventory.items[index];
  if (!item) {
    return { ok: false, inventory, reason: "missing" };
  }
  const effect = getConsumableEffect(item);
  if (!effect) {
    return { ok: false, inventory, reason: "not_consumable", item };
  }

  const removed = removeItemAt(index);
  if (!removed.ok) {
    return { ok: false, inventory: removed.inventory, reason: "missing" };
  }

  const restore = restorePartyFromFood(effect);
  const detail = {
    ok: true,
    item,
    effect,
    applied: restore.applied,
    inventory: removed.inventory,
  };

  window.dispatchEvent(
    new CustomEvent(INVENTORY_CONSUMED_EVENT, { detail })
  );
  return detail;
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
