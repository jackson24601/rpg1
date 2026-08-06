import {
  createCombatant,
  getCharacterClass,
  getSpell,
  getSkill,
  successChance,
  resolveAttackDamage,
  applySpell,
  applySkill,
  STAMINA_LOSS_PER_ROUND,
  createSummon,
} from "./characters.js";
import {
  buildEncounter,
  encounterCountFor,
  pickLowestHpTarget,
} from "./combat-enemies.js";
import { addGold, roll2d6, INVENTORY_CONSUMED_EVENT } from "./inventory.js";
import { bindInventoryButton } from "./inventory-ui.js";
import {
  loadPartyCombatState,
  savePartyCombatState,
  clearPartyCombatState,
  resetStaminaRegenClock,
} from "./party-state.js";

const BATTLE_KEY = "dragonQuestBattle";
const PARTY_KEY = "dragonQuestParty";

const battleSubtitle = document.getElementById("battleSubtitle");
const enemySide = document.getElementById("enemySide");
const partySide = document.getElementById("partySide");
const battleLog = document.getElementById("battleLog");
const actorPanel = document.getElementById("actorPanel");
const actionMenu = document.getElementById("actionMenu");
const battlePrompt = document.getElementById("battlePrompt");
const endPanel = document.getElementById("endPanel");
const endBtn = document.getElementById("endBtn");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ANIM_MS = reduceMotion ? 0 : 550;

/** @type {object[]} */
let party = [];
/** @type {object[]} */
let enemies = [];
/** @type {object[]} */
let summons = [];
/** Planned actions keyed by combatant instanceId */
const plans = new Map();

let commandIndex = 0;
let phase = "command"; // command | target | resolve | enemy | ended
let pendingAction = null;
let outcome = null;

const PARTY_SLOTS = [
  { left: "70%", top: "82%" },
  { left: "84%", top: "70%" },
  { left: "76%", top: "58%" },
];

const SUMMON_SLOTS = [
  { left: "58%", top: "74%" },
  { left: "64%", top: "56%" },
];

const ENEMY_SLOTS = [
  { left: "18%", top: "36%" },
  { left: "36%", top: "28%" },
  { left: "10%", top: "24%" },
  { left: "28%", top: "48%" },
  { left: "44%", top: "40%" },
  { left: "8%", top: "46%" },
];

function loadBattlePayload() {
  try {
    const raw = sessionStorage.getItem(BATTLE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadPartyIds() {
  try {
    const raw = sessionStorage.getItem(PARTY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}

function applyPersistedVitals(combatant, saved) {
  if (!combatant || !saved) return combatant;

  if (typeof saved.hitPoints === "number" && Number.isFinite(saved.hitPoints)) {
    combatant.hitPoints = Math.max(
      0,
      Math.min(combatant.maxHitPoints, saved.hitPoints)
    );
  }

  if (
    combatant.maxStamina != null &&
    typeof saved.stamina === "number" &&
    Number.isFinite(saved.stamina)
  ) {
    combatant.stamina = Math.max(
      0,
      Math.min(combatant.maxStamina, saved.stamina)
    );
  }

  combatant.alive = combatant.hitPoints > 0;
  return combatant;
}

function rollSuccess(rating) {
  if (rating == null || !Number.isFinite(Number(rating))) return false;
  return Math.random() < successChance(rating);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setLog(text) {
  battleLog.textContent = text;
}

function setPrompt(text) {
  battlePrompt.textContent = text;
}

function alive(list) {
  return list.filter((c) => c.alive && c.hitPoints > 0);
}

function allFighters() {
  return [...party, ...summons, ...enemies];
}

function findFighter(instanceId) {
  return allFighters().find((c) => c.instanceId === instanceId) || null;
}

function animClassForMove(moveName) {
  const key = String(moveName || "strike")
    .toLowerCase()
    .replace(/\s+/g, "-");
  if (key.includes("slash")) return "is-slash";
  if (key.includes("thrust")) return "is-thrust";
  if (key.includes("club")) return "is-club";
  if (key.includes("flying")) return "is-flying-fist";
  if (key.includes("arrow")) return "is-fire-arrows";
  if (key.includes("double")) return "is-double-strike";
  return "is-strike";
}

function ensureInstanceIds(combatants, prefix) {
  combatants.forEach((c, i) => {
    if (!c.instanceId) c.instanceId = `${prefix}-${i}-${c.id}`;
    c.defending = false;
    c.src =
      c.src ||
      (c.kind === "enemy" || c.kind === "summon"
        ? "assets/enemies/goblin.png"
        : `assets/overworld/${c.id}.png`);
  });
}

function buildPartyCombatants() {
  const saved = loadPartyCombatState();
  const members = loadPartyIds();

  const finalize = (c, i) => {
    if (!c) return null;
    applyPersistedVitals(c, saved[c.id]);
    c.instanceId = `hero-${i}`;
    c.kind = "hero";
    c.src = `assets/overworld/${c.id}.png`;
    c.defending = false;
    c.skipNextTurn = false;
    return c;
  };

  const ids = members.length
    ? members.map((member) =>
        typeof member === "string" ? member : member?.id
      )
    : ["fighter", "wizard", "cleric"]; // Fallback party for direct battle QA

  return ids
    .map((id, i) => finalize(createCombatant(id), i))
    .filter(Boolean);
}

function renderFighters() {
  enemySide.innerHTML = "";
  partySide.innerHTML = "";

  enemies.forEach((foe, index) => {
    enemySide.appendChild(makeFighterEl(foe, ENEMY_SLOTS[index % ENEMY_SLOTS.length], "enemy"));
  });

  party.forEach((hero, index) => {
    partySide.appendChild(makeFighterEl(hero, PARTY_SLOTS[index % PARTY_SLOTS.length], "party"));
  });

  summons.forEach((ally, index) => {
    partySide.appendChild(
      makeFighterEl(ally, SUMMON_SLOTS[index % SUMMON_SLOTS.length], "party")
    );
  });
}

function makeFighterEl(unit, slot, side) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "battle-fighter";
  el.dataset.instanceId = unit.instanceId;
  el.dataset.side = side;
  if (unit.id) el.dataset.unitId = unit.id;
  el.style.left = slot.left;
  el.style.top = slot.top;
  el.setAttribute("aria-label", unit.name);

  const hpPct = unit.maxHitPoints
    ? Math.max(0, Math.min(100, (unit.hitPoints / unit.maxHitPoints) * 100))
    : 0;

  el.innerHTML = `
    <span class="battle-fighter__label">${unit.name}</span>
    <span class="battle-fighter__shadow"></span>
    <img src="${unit.src}" alt="" width="80" height="96" draggable="false" />
    <span class="battle-fighter__hp" aria-hidden="true"><span style="width:${hpPct}%"></span></span>
  `;

  if (!unit.alive || unit.hitPoints <= 0) {
    el.classList.add("is-dead");
    el.disabled = true;
  } else if (unit.stamina != null && unit.stamina <= 0) {
    el.classList.add("is-exhausted");
  }
  if (unit.defending) el.classList.add("is-defending");

  el.addEventListener("click", () => onFighterClicked(unit));
  return el;
}

function fighterEl(instanceId) {
  return document.querySelector(`[data-instance-id="${instanceId}"]`);
}

function clearTargetables() {
  document.querySelectorAll(".battle-fighter.is-targetable").forEach((el) => {
    el.classList.remove("is-targetable");
  });
}

function clearActive() {
  document.querySelectorAll(".battle-fighter.is-active").forEach((el) => {
    el.classList.remove("is-active");
  });
}

function markActive(unit) {
  clearActive();
  fighterEl(unit.instanceId)?.classList.add("is-active");
}

async function playAnim(unit, classNames) {
  const el = fighterEl(unit.instanceId);
  if (!el || ANIM_MS <= 0) return;
  const classes = Array.isArray(classNames) ? classNames : [classNames];
  classes.forEach((c) => el.classList.add(c));
  await sleep(ANIM_MS);
  classes.forEach((c) => el.classList.remove(c));
}

function actionNeedsEnemyTarget(action) {
  if (!action) return false;
  if (action.kind === "attack") return true;
  if (action.kind === "spell") {
    const spell = getSpell(action.spellId);
    if (!spell) return false;
    return (
      spell.effect.type === "damageTarget" ||
      spell.effect.type === "preventTargetAttackNextTurn"
    );
  }
  return false;
}

function actionNeedsAllyTarget(action) {
  if (!action || action.kind !== "spell") return false;
  const spell = getSpell(action.spellId);
  if (!spell) return false;
  return (
    spell.effect.type === "healTarget" ||
    spell.effect.type === "preventTargetDamageTurns" ||
    spell.effect.type === "restoreStaminaFull"
  );
}

/** Why a hero cannot choose an action this round, or null if they can act. */
function unableReason(actor) {
  if (!actor) return "missing";
  if (!actor.alive || actor.hitPoints <= 0) return "fallen";
  if (actor.stamina != null && actor.stamina <= 0) return "exhausted";
  if (actor.skipNextTurn) return "held";
  return null;
}

function unableMessage(actor, reason) {
  if (reason === "fallen") {
    return `${actor.name} has fallen and cannot act.`;
  }
  if (reason === "exhausted") {
    return `${actor.name} is too exhausted to act!`;
  }
  if (reason === "held") {
    return `${actor.name} cannot act this round!`;
  }
  return `${actor.name} cannot act.`;
}

function currentCommandActor() {
  if (commandIndex >= party.length) return null;
  return party[commandIndex] || null;
}

function beginCommandPhase() {
  phase = "command";
  commandIndex = 0;
  plans.clear();
  pendingAction = null;
  outcome = null;
  clearTargetables();
  hideEndPanel();
  party.forEach((p) => {
    p.defending = false;
  });
  summons.forEach((s) => {
    if (s.commandsAvailableNextTurn) {
      s.canCommand = true;
      s.commandsAvailableNextTurn = false;
    }
  });
  renderFighters();
  promptNextCommand();
}

function hideEndPanel() {
  endPanel.hidden = true;
  endBtn.textContent = "Continue";
}

function showExecuteContinue() {
  phase = "ready";
  pendingAction = null;
  clearActive();
  clearTargetables();
  actionMenu.innerHTML = "";
  actorPanel.textContent = "All party actions chosen.";
  setLog("Ready to fight!");
  setPrompt("Press Continue to resolve attacks, then the enemy turn.");
  endPanel.hidden = false;
  endBtn.textContent = "Continue";
  endBtn.disabled = false;
}

function advanceCommand() {
  commandIndex += 1;
  promptNextCommand();
}

/**
 * Every party slot still gets a command-phase beat — even when the hero cannot
 * act — so a third member (e.g. Cleric) is never silently skipped.
 */
function promptUnableCommand(actor, reason) {
  phase = "command";
  pendingAction = null;
  clearTargetables();
  hideEndPanel();
  markActive(actor);
  plans.set(actor.instanceId, { kind: "skip" });

  const message = unableMessage(actor, reason);
  actorPanel.textContent = `${actor.name}'s turn — HP ${actor.hitPoints}/${actor.maxHitPoints} · STA ${actor.stamina ?? "—"}/${actor.maxStamina ?? "—"}`;
  setLog(message);
  setPrompt(message);
  actionMenu.innerHTML = "";
  actionMenu.appendChild(
    makeActionButton("Skip", () => {
      if (reason === "held") actor.skipNextTurn = false;
      advanceCommand();
    })
  );
}

function promptNextCommand() {
  const actor = currentCommandActor();
  if (!actor) {
    showExecuteContinue();
    return;
  }

  const reason = unableReason(actor);
  if (reason) {
    promptUnableCommand(actor, reason);
    return;
  }

  phase = "command";
  pendingAction = null;
  clearTargetables();
  hideEndPanel();
  markActive(actor);
  actorPanel.textContent = `${actor.name}'s turn — HP ${actor.hitPoints}/${actor.maxHitPoints} · STA ${actor.stamina ?? "—"}/${actor.maxStamina ?? "—"}`;
  setPrompt("Choose one action for this round.");
  setLog(`What will ${actor.name} do?`);
  renderActionMenu(actor);
}

function renderActionMenu(actor) {
  actionMenu.innerHTML = "";
  hideEndPanel();

  const cls = getCharacterClass(actor.id);
  const attackTypes = actor.attackTypes?.length
    ? actor.attackTypes
    : cls?.attackTypes || [];
  const defendType = actor.defendType || cls?.defendType;

  attackTypes.forEach((move) => {
    actionMenu.appendChild(
      makeActionButton(move, () => selectAttack(actor, move))
    );
  });

  if (defendType) {
    actionMenu.appendChild(
      makeActionButton(defendType, () => selectDefend(actor, defendType), "ghost")
    );
  }

  (actor.spells || []).forEach((spellId) => {
    const spell = getSpell(spellId);
    if (!spell) return;
    if (!actor.canCast && (actor.intelligence ?? 0) < 7) return;
    actionMenu.appendChild(
      makeActionButton(spell.name, () => selectSpell(actor, spellId))
    );
  });

  (actor.skills || []).forEach((skillId) => {
    const skill = getSkill(skillId);
    if (!skill) return;
    actionMenu.appendChild(
      makeActionButton(skill.name, () => selectSkill(actor, skillId))
    );
  });

  // Controllable summons act after their controller's choice in resolve;
  // command menu is only for party members for now.
}

function makeActionButton(label, onClick, variant) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "battle-btn" + (variant === "ghost" ? " battle-btn--ghost" : "");
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

function lockAction(actor, action) {
  plans.set(actor.instanceId, action);
  actionMenu.innerHTML = "";
  advanceCommand();
}

function selectAttack(actor, move) {
  pendingAction = { kind: "attack", move, actorId: actor.instanceId };
  if (alive(enemies).length === 1) {
    pendingAction.targetId = alive(enemies)[0].instanceId;
    lockAction(actor, pendingAction);
    return;
  }
  enterTargeting("enemy", `Click the enemy ${actor.name} will attack.`);
}

function selectDefend(actor, move) {
  lockAction(actor, { kind: "defend", move, actorId: actor.instanceId });
}

function selectSpell(actor, spellId) {
  const spell = getSpell(spellId);
  pendingAction = { kind: "spell", spellId, actorId: actor.instanceId };
  if (actionNeedsEnemyTarget(pendingAction)) {
    if (alive(enemies).length === 1) {
      pendingAction.targetId = alive(enemies)[0].instanceId;
      lockAction(actor, pendingAction);
      return;
    }
    enterTargeting("enemy", `Click the target for ${spell.name}.`);
    return;
  }
  if (actionNeedsAllyTarget(pendingAction)) {
    enterTargeting("ally", `Click the ally for ${spell.name}.`);
    return;
  }
  lockAction(actor, pendingAction);
}

function selectSkill(actor, skillId) {
  lockAction(actor, { kind: "skill", skillId, actorId: actor.instanceId });
}

function enterTargeting(side, prompt) {
  phase = "target";
  actionMenu.innerHTML = "";
  actionMenu.appendChild(
    makeActionButton("Cancel", () => {
      pendingAction = null;
      clearTargetables();
      promptNextCommand();
    }, "ghost")
  );
  setPrompt(prompt);

  const pool =
    side === "enemy"
      ? alive(enemies)
      : alive([...party, ...summons]);

  pool.forEach((unit) => {
    fighterEl(unit.instanceId)?.classList.add("is-targetable");
  });
}

function onFighterClicked(unit) {
  if (phase !== "target" || !pendingAction) return;
  const el = fighterEl(unit.instanceId);
  if (!el?.classList.contains("is-targetable")) return;

  pendingAction.targetId = unit.instanceId;
  const actor = findFighter(pendingAction.actorId);
  clearTargetables();
  lockAction(actor, pendingAction);
}

async function resolveRound() {
  phase = "resolve";
  clearActive();
  clearTargetables();
  actionMenu.innerHTML = "";
  hideEndPanel();
  setPrompt("Combat sequence…");

  // Party actions in order
  for (const actor of party) {
    if (!actor.alive) continue;
    const action = plans.get(actor.instanceId);
    if (!action || action.kind === "skip") continue;
    await resolveHeroAction(actor, action);
    if (alive(enemies).length === 0) {
      await endBattle("win");
      return;
    }
  }

  // Commandable summons (simple: always Club the first living enemy)
  for (const ally of summons) {
    if (!ally.alive || !ally.canCommand) continue;
    const target = alive(enemies)[0];
    if (!target) break;
    await resolveAttackAction(ally, { kind: "attack", move: ally.attackType || "Club", targetId: target.instanceId }, "party");
    if (alive(enemies).length === 0) {
      await endBattle("win");
      return;
    }
  }

  // Enemy turn — each living foe acts (Goblins/Orcs always attack).
  phase = "enemy";
  armPendingBattleBuffs();
  for (const foe of enemies) {
    if (!foe.alive) continue;
    if (foe.cannotAttackNextTurn) {
      setLog(`${foe.name} is held and cannot attack!`);
      foe.cannotAttackNextTurn = false;
      await sleep(reduceMotion ? 0 : 500);
      continue;
    }
    const targets = alive(party);
    if (!targets.length) break;
    const target =
      foe.ai === "alwaysAttackLowestHp"
        ? pickLowestHpTarget(targets)
        : targets[Math.floor(Math.random() * targets.length)];
    if (!target) break;
    await resolveAttackAction(
      foe,
      { kind: "attack", move: foe.attackType || "Club", targetId: target.instanceId },
      "enemy"
    );
    if (alive(party).length === 0) {
      await endBattle("lose");
      return;
    }
  }
  clearActiveBattleBuffs();

  // End-of-round stamina drain
  for (const hero of party) {
    if (!hero.alive || hero.stamina == null) continue;
    hero.stamina = Math.max(0, hero.stamina - STAMINA_LOSS_PER_ROUND);
  }

  // Tick down damage immunity
  for (const unit of [...party, ...summons]) {
    if (unit.damageImmuneTurns > 0) {
      unit.damageImmuneTurns -= 1;
    }
  }

  renderFighters();
  beginCommandPhase();
}

/**
 * Spell buffs that apply on the following turn:
 * - pending* is set when cast
 * - active* is armed at the start of the next enemy phase
 */
const battleState = {
  pendingEnemyDamageMultiplier: null,
  activeEnemyDamageMultiplier: null,
  pendingAllDamageTakenMultiplier: null,
  activeAllDamageTakenMultiplier: null,
  summons,
};

function armPendingBattleBuffs() {
  battleState.activeEnemyDamageMultiplier =
    battleState.pendingEnemyDamageMultiplier;
  battleState.pendingEnemyDamageMultiplier = null;
  battleState.activeAllDamageTakenMultiplier =
    battleState.pendingAllDamageTakenMultiplier;
  battleState.pendingAllDamageTakenMultiplier = null;
}

function clearActiveBattleBuffs() {
  battleState.activeEnemyDamageMultiplier = null;
  battleState.activeAllDamageTakenMultiplier = null;
}

async function resolveHeroAction(actor, action) {
  markActive(actor);
  if (action.kind === "defend") {
    actor.defending = true;
    setLog(`${actor.name} takes a defensive stance (${action.move})!`);
    renderFighters();
    await sleep(reduceMotion ? 0 : 400);
    return;
  }

  if (action.kind === "attack") {
    await resolveAttackAction(actor, action, "party");
    return;
  }

  if (action.kind === "skill") {
    const skill = getSkill(action.skillId);
    setLog(`${actor.name} uses ${skill?.name || "a skill"}!`);
    await playAnim(actor, "is-cast");
    const result = applySkill(actor, action.skillId, {
      characters: alive([...party, ...summons]),
    });
    if (result.ok) {
      setLog(`${skill.name} restores stamina to the party!`);
    }
    renderFighters();
    await sleep(reduceMotion ? 0 : 350);
    return;
  }

  if (action.kind === "spell") {
    await resolveSpellAction(actor, action);
  }
}

async function resolveAttackAction(actor, action, side) {
  const target = findFighter(action.targetId);
  if (!target || !target.alive) {
    setLog(`${actor.name}'s attack finds no target.`);
    return;
  }

  const move = action.move || actor.attackType || "Strike";
  setLog(`${actor.name} uses ${move} on ${target.name}!`);

  const lunge = side === "party" ? "is-lunging-party" : "is-lunging-enemy";
  await playAnim(actor, [lunge, animClassForMove(move)]);

  const hit = rollSuccess(actor.attack);
  if (!hit) {
    setLog(`${actor.name}'s ${move} misses!`);
    await sleep(reduceMotion ? 0 : 350);
    return;
  }

  if (target.damageImmuneTurns > 0) {
    setLog(`${target.name} is protected and takes no damage!`);
    await sleep(reduceMotion ? 0 : 350);
    return;
  }

  if (target.defending && target.defend != null && rollSuccess(target.defend)) {
    setLog(`${target.name} ${target.defendType || "defends"} successfully!`);
    await sleep(reduceMotion ? 0 : 350);
    return;
  }

  const baseDamage =
    side === "enemy" && typeof actor.attackDamage === "number"
      ? actor.attackDamage
      : undefined;
  let damage =
    baseDamage != null
      ? resolveAttackDamage(move, true, baseDamage)
      : resolveAttackDamage(move, true);
  if (side === "enemy" && battleState.activeEnemyDamageMultiplier != null) {
    damage *= battleState.activeEnemyDamageMultiplier;
  }
  if (battleState.activeAllDamageTakenMultiplier != null) {
    damage *= battleState.activeAllDamageTakenMultiplier;
  }
  damage = Math.max(0, Math.round(damage * 100) / 100);

  target.hitPoints = Math.max(0, target.hitPoints - damage);
  if (target.hitPoints <= 0) {
    target.alive = false;
    setLog(`${actor.name} hits ${target.name} for ${damage}! ${target.name} is defeated!`);
  } else {
    setLog(`${actor.name} hits ${target.name} for ${damage}!`);
  }
  await playAnim(target, "is-hit");
  renderFighters();
}

async function resolveSpellAction(actor, action) {
  const spell = getSpell(action.spellId);
  if (!spell) return;
  setLog(`${actor.name} casts ${spell.name}!`);
  await playAnim(actor, "is-cast");

  const target = action.targetId ? findFighter(action.targetId) : null;
  if (target?.damageImmuneTurns > 0 && getSpell(action.spellId)?.effect?.type?.startsWith("damage")) {
    setLog(`${target.name} is protected and takes no damage!`);
    await sleep(reduceMotion ? 0 : 350);
    return;
  }

  // Map pending "next turn" buffs onto the spell helper's expected fields.
  const spellBridge = {
    get enemyDamageMultiplierNextTurn() {
      return battleState.pendingEnemyDamageMultiplier;
    },
    set enemyDamageMultiplierNextTurn(value) {
      battleState.pendingEnemyDamageMultiplier = value;
    },
    get allDamageTakenMultiplierNextTurn() {
      return battleState.pendingAllDamageTakenMultiplier;
    },
    set allDamageTakenMultiplierNextTurn(value) {
      battleState.pendingAllDamageTakenMultiplier = value;
    },
    get summons() {
      return summons;
    },
    set summons(value) {
      summons = value;
    },
  };

  const context = {
    battle: spellBridge,
    opponents: alive(enemies),
    target,
  };

  const result = applySpell(actor, action.spellId, context);

  if (!result.ok) {
    setLog(`${spell.name} fails (${result.reason}).`);
    await sleep(reduceMotion ? 0 : 350);
    return;
  }

  if (spell.effect.type === "summonAlly" && result.summon) {
    result.summon.src = "assets/enemies/goblin.png";
    setLog(`${actor.name} summons a Goblin! It can be commanded next turn.`);
  } else if (spell.effect.type === "damageTarget" || spell.effect.type === "damageAllOpponents") {
    const dmg = result.damage ?? result.totalDamage ?? 0;
    setLog(`${spell.name} deals ${dmg} damage!`);
    const hitIds =
      spell.effect.type === "damageAllOpponents"
        ? (result.hits || []).map((h) => h.targetId)
        : [result.targetId];
    for (const id of hitIds) {
      const t = findFighter(id);
      if (t) await playAnim(t, "is-hit");
    }
  } else if (spell.effect.type === "healSelf" || spell.effect.type === "healTarget") {
    setLog(`${spell.name} restores ${result.healed} HP!`);
  } else if (spell.effect.type === "enemyDamageReduceNextTurn") {
    setLog(`A mystical shield will weaken enemy blows next turn!`);
  } else if (spell.effect.type === "allDamageTakenReduceNextTurn") {
    setLog(`Verdant energy will soften all wounds next turn!`);
  } else if (spell.effect.type === "preventTargetAttackNextTurn") {
    setLog(`${context.target?.name || "The foe"} is held fast!`);
  } else if (spell.effect.type === "preventTargetDamageTurns") {
    setLog(`${context.target?.name || "An ally"} is warded from harm!`);
  } else if (spell.effect.type === "restoreStaminaFull") {
    setLog(`${context.target?.name || "An ally"}'s stamina is fully restored!`);
  }

  // Sync enemy HP/alive from damage effects already mutated via applySpell
  enemies.forEach((e) => {
    if (e.hitPoints <= 0) e.alive = false;
  });

  renderFighters();
  await sleep(reduceMotion ? 0 : 350);
}

async function endBattle(result) {
  phase = "ended";
  outcome = result;
  clearActive();
  actionMenu.innerHTML = "";
  endPanel.hidden = false;
  endBtn.disabled = false;

  if (result === "win") {
    // Carry HP/stamina into the next encounter.
    savePartyCombatState(party);
    const goldRoll = roll2d6();
    const { inventory } = addGold(goldRoll);
    const foeId = enemies[0]?.id || "goblin";
    const dropLine =
      foeId === "orc"
        ? "The Orcs drop gold! You pick it up."
        : "The Goblins drop gold! You pick it up.";
    setLog(dropLine);
    setPrompt(`Gained ${goldRoll} gold. Total: ${inventory.gold}.`);
    battleSubtitle.textContent = "Victory";
    endBtn.textContent = "Return to World";
  } else {
    // Party wiped — clear vitals so a new party starts fresh.
    clearPartyCombatState();
    setLog("Your party has fallen…");
    setPrompt("Defeat.");
    battleSubtitle.textContent = "Defeat";
    endBtn.textContent = "Return to Party Select";
  }
}

endBtn.addEventListener("click", () => {
  // After party commands are locked, Continue runs the round (party moves → enemy turns).
  if (phase === "ready" && !outcome) {
    endBtn.disabled = true;
    void resolveRound();
    return;
  }

  if (outcome === "win") {
    savePartyCombatState(party);
    // Overworld stamina regen starts after combat — don't credit battle time.
    resetStaminaRegenClock();
    sessionStorage.removeItem(BATTLE_KEY);
    window.location.href = "game.html";
    return;
  }

  if (outcome === "lose") {
    clearPartyCombatState();
    sessionStorage.removeItem(BATTLE_KEY);
    window.location.href = "party.html";
  }
});

function init() {
  const payload = loadBattlePayload();
  const enemyType = payload?.enemyType || "goblin";
  // Goblins: troop size is a fresh d6 roll at the start of each combat.
  const count = encounterCountFor(enemyType, payload?.count);

  party = buildPartyCombatants();
  enemies = buildEncounter(enemyType, count);
  summons = [];
  battleState.summons = summons;
  ensureInstanceIds(enemies, "foe");

  if (!party.length) {
    setLog("No party found. Choose adventurers first.");
    endPanel.hidden = false;
    endBtn.textContent = "Choose Party";
    endBtn.disabled = false;
    phase = "ended";
    outcome = "lose";
    return;
  }

  const plural =
    enemyType === "orc" ? (count > 1 ? "Orcs" : "Orc") : count > 1 ? "Goblins" : "Goblin";
  battleSubtitle.textContent = `Battle — ${count > 1 ? `${count} ${plural}` : plural}`;

  renderFighters();
  setLog(
    count > 1
      ? `${count} ${plural} draw near! Your party acts first.`
      : `A ${plural} draws near! Your party acts first.`
  );
  beginCommandPhase();
}

bindInventoryButton("#inventoryBtn");

/** Food eaten from Inventory heals every living party member in this fight. */
window.addEventListener(INVENTORY_CONSUMED_EVENT, (event) => {
  const effect = event.detail?.effect;
  if (!effect || !party.length) return;

  party.forEach((hero) => {
    if (!hero) return;
    const hpGain = Math.max(0, Number(effect.hitPoints) || 0);
    const staGain = Math.max(0, Number(effect.stamina) || 0);
    if (hero.maxHitPoints != null) {
      hero.hitPoints = Math.min(
        hero.maxHitPoints,
        Math.max(0, Number(hero.hitPoints) || 0) + hpGain
      );
    }
    if (hero.maxStamina != null && hero.stamina != null) {
      hero.stamina = Math.min(
        hero.maxStamina,
        Math.max(0, Number(hero.stamina) || 0) + staGain
      );
    }
    hero.alive = hero.hitPoints > 0;
  });

  renderFighters();
  const item = event.detail?.item || "food";
  setLog(
    `The party eats ${item}! Everyone recovers ${effect.hitPoints} HP and ${effect.stamina} stamina.`
  );
  // Keep the current command actor panel in sync if mid-command.
  if (phase === "command" || phase === "target") {
    const actor = party[commandIndex];
    if (actor && actor.alive) {
      actorPanel.textContent = `${actor.name}'s turn — HP ${actor.hitPoints}/${actor.maxHitPoints} · STA ${actor.stamina ?? "—"}/${actor.maxStamina ?? "—"}`;
    }
  }
});

init();
