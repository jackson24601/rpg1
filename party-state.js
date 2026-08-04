/**
 * Persisted party combat vitals (HP / stamina) between battles,
 * plus overworld stamina regeneration after leaving combat.
 */

import {
  getCharacterClass,
  STAMINA_REGEN_AMOUNT,
  STAMINA_REGEN_INTERVAL_MS,
} from "./characters.js";

export const PARTY_STATE_KEY = "dragonQuestPartyState";
/** Timestamp (ms) of the last applied overworld stamina regen tick. */
export const STAMINA_REGEN_AT_KEY = "dragonQuestStaminaRegenAt";

export function loadPartyCombatState() {
  try {
    const raw = sessionStorage.getItem(PARTY_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Save current party HP/stamina so the next battle (and overworld regen)
 * resume from these values.
 * @param {Array<{ id: string, hitPoints?: number, stamina?: number|null }>} heroes
 */
export function savePartyCombatState(heroes) {
  const state = {};
  heroes.forEach((hero) => {
    if (!hero?.id) return;
    state[hero.id] = {
      hitPoints: Math.max(0, Number(hero.hitPoints) || 0),
      stamina:
        hero.stamina == null ? null : Math.max(0, Number(hero.stamina) || 0),
    };
  });
  sessionStorage.setItem(PARTY_STATE_KEY, JSON.stringify(state));
}

export function clearPartyCombatState() {
  sessionStorage.removeItem(PARTY_STATE_KEY);
  sessionStorage.removeItem(STAMINA_REGEN_AT_KEY);
}

function maxStaminaFor(classId) {
  const cls = getCharacterClass(classId);
  return typeof cls?.stamina === "number" ? cls.stamina : null;
}

function maxHitPointsFor(classId) {
  const cls = getCharacterClass(classId);
  return typeof cls?.hitPoints === "number" ? cls.hitPoints : null;
}

/**
 * Ensure every party member has a vitals entry (defaults to class max)
 * so overworld regen can run even before the first battle.
 * @param {Array<{ id: string }|string>} party
 */
export function ensurePartyCombatState(party) {
  const state = { ...loadPartyCombatState() };
  let changed = false;

  party.forEach((member) => {
    const id = typeof member === "string" ? member : member?.id;
    if (!id) return;
    const maxHp = maxHitPointsFor(id);
    const maxSta = maxStaminaFor(id);
    if (maxHp == null || maxSta == null) return;

    const prev = state[id];
    if (!prev) {
      state[id] = { hitPoints: maxHp, stamina: maxSta };
      changed = true;
      return;
    }

    if (typeof prev.hitPoints !== "number" || !Number.isFinite(prev.hitPoints)) {
      prev.hitPoints = maxHp;
      changed = true;
    }
    if (typeof prev.stamina !== "number" || !Number.isFinite(prev.stamina)) {
      prev.stamina = maxSta;
      changed = true;
    }
  });

  if (changed) {
    sessionStorage.setItem(PARTY_STATE_KEY, JSON.stringify(state));
  }
  return state;
}

/**
 * Apply pending overworld stamina regen ticks (+STAMINA_REGEN_AMOUNT per
 * STAMINA_REGEN_INTERVAL_MS since the last tick), capped at each class max.
 * Only runs outside combat (call from the overworld).
 *
 * @param {Array<{ id: string }|string>} party
 * @param {number} [nowMs]
 * @returns {{ restored: number, state: Record<string, { hitPoints: number, stamina: number|null }> }}
 */
export function applyOverworldStaminaRegen(party, nowMs = Date.now()) {
  ensurePartyCombatState(party);
  const state = loadPartyCombatState();

  let lastAt = Number(sessionStorage.getItem(STAMINA_REGEN_AT_KEY));
  if (!Number.isFinite(lastAt) || lastAt <= 0) {
    sessionStorage.setItem(STAMINA_REGEN_AT_KEY, String(nowMs));
    return { restored: 0, state };
  }

  const elapsed = nowMs - lastAt;
  if (elapsed < STAMINA_REGEN_INTERVAL_MS) {
    return { restored: 0, state };
  }

  const ticks = Math.floor(elapsed / STAMINA_REGEN_INTERVAL_MS);
  const gain = ticks * STAMINA_REGEN_AMOUNT;
  let restored = 0;

  party.forEach((member) => {
    const id = typeof member === "string" ? member : member?.id;
    if (!id || !state[id]) return;
    const maxSta = maxStaminaFor(id);
    if (maxSta == null) return;
    if (typeof state[id].stamina !== "number") return;

    const before = state[id].stamina;
    state[id].stamina = Math.min(maxSta, before + gain);
    restored += state[id].stamina - before;
  });

  sessionStorage.setItem(PARTY_STATE_KEY, JSON.stringify(state));
  sessionStorage.setItem(
    STAMINA_REGEN_AT_KEY,
    String(lastAt + ticks * STAMINA_REGEN_INTERVAL_MS)
  );

  return { restored, state };
}

/** Mark regen clock so time spent in battle is not credited. */
export function resetStaminaRegenClock(nowMs = Date.now()) {
  sessionStorage.setItem(STAMINA_REGEN_AT_KEY, String(nowMs));
}
