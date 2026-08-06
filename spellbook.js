/** Purchased Magic Shop spells (session-scoped spellbook). */

export const SPELLBOOK_KEY = "dragonQuestSpellbook";

/** @returns {string[]} */
export function getPurchasedSpells() {
  try {
    const raw = sessionStorage.getItem(SPELLBOOK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

/** @param {string} spellId */
export function hasPurchasedSpell(spellId) {
  return getPurchasedSpells().includes(spellId);
}

/**
 * Record a spell as learned. Idempotent.
 * @param {string} spellId
 * @returns {string[]}
 */
export function learnSpell(spellId) {
  const id = String(spellId || "").trim();
  if (!id) return getPurchasedSpells();
  const current = getPurchasedSpells();
  if (current.includes(id)) return current;
  const next = [...current, id];
  sessionStorage.setItem(SPELLBOOK_KEY, JSON.stringify(next));
  return next;
}

export function clearSpellbook() {
  sessionStorage.removeItem(SPELLBOOK_KEY);
}
