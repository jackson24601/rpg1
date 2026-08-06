/**
 * Adventure quest progress (completed story beats).
 * Stored in sessionStorage alongside party / inventory.
 */

export const QUESTS_KEY = "dragonQuestQuests";

/** Stable quest ids used across dialogue and future encounters. */
export const QUEST_IDS = {
  /** Defeat the outlaws in the Outlaw Hideout north of town. */
  DEFEAT_OUTLAWS: "defeat-outlaws",
};

/**
 * @typedef {{ completed: string[] }} QuestState
 */

/** @returns {QuestState} */
export function loadQuests() {
  try {
    const raw = sessionStorage.getItem(QUESTS_KEY);
    if (!raw) return { completed: [] };
    const parsed = JSON.parse(raw);
    const completed = Array.isArray(parsed?.completed)
      ? parsed.completed.map(String)
      : [];
    return { completed };
  } catch {
    return { completed: [] };
  }
}

/** @param {QuestState} state */
export function saveQuests(state) {
  sessionStorage.setItem(
    QUESTS_KEY,
    JSON.stringify({
      completed: Array.isArray(state.completed) ? state.completed : [],
    })
  );
}

export function clearQuests() {
  sessionStorage.removeItem(QUESTS_KEY);
}

export function isQuestComplete(questId) {
  if (!questId) return false;
  return loadQuests().completed.includes(String(questId));
}

export function completeQuest(questId) {
  const id = String(questId || "").trim();
  if (!id) return loadQuests();
  const state = loadQuests();
  if (!state.completed.includes(id)) {
    state.completed.push(id);
    saveQuests(state);
  }
  return state;
}

/**
 * Grocer "Any news?" line — depends on completed quests.
 * First beat: clear the Outlaw Hideout north of town.
 */
export function groceryNewsMessage() {
  if (!isQuestComplete(QUEST_IDS.DEFEAT_OUTLAWS)) {
    return "I've heard the outlaws to the north are still causing trouble. I wish someone would take care of that.";
  }
  return "Word is the roads north are safer since those outlaws were dealt with. Thank you.";
}
