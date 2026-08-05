/**
 * Overworld NPC scenes (woodcutters, townsfolk, etc.).
 */

export const WOODCUTTER_DIALOGUE =
  "Ah, good! We thought you were bandits for a moment! If you can destroy the outlaw camp to the north, there is a reward in it for you.";

/** Distance (sprite centers) at which woodcutters notice the party. */
export const WOODCUTTER_APPROACH_DISTANCE = 56;

/**
 * Woodcutter clearing at map cell (5, 7) — forest, no enemy spawns.
 * Sprites reuse playable overworld character art.
 */
export const WOODCUTTER_SCENE = {
  id: "woodcutters",
  x: 5,
  y: 7,
  dialogue: WOODCUTTER_DIALOGUE,
  approachDistance: WOODCUTTER_APPROACH_DISTANCE,
  woodcutters: [
    {
      id: "wc-1",
      spriteId: "fighter",
      name: "Woodcutter",
      x: 46,
      y: 98,
      facing: "right",
      speaker: true,
    },
    {
      id: "wc-2",
      spriteId: "barbarian",
      name: "Woodcutter",
      x: 82,
      y: 122,
      facing: "right",
      speaker: false,
    },
    {
      id: "wc-3",
      spriteId: "ranger",
      name: "Woodcutter",
      x: 214,
      y: 102,
      facing: "left",
      speaker: false,
    },
    {
      id: "wc-4",
      spriteId: "paladin",
      name: "Woodcutter",
      x: 250,
      y: 126,
      facing: "left",
      speaker: false,
    },
  ],
};

export function isWoodcutterCell(cell) {
  return Boolean(cell && cell.npcScene === WOODCUTTER_SCENE.id);
}

/** Fresh NPC instances for the woodcutter clearing. */
export function createWoodcutters() {
  return WOODCUTTER_SCENE.woodcutters.map((wc) => ({
    ...wc,
    src: `assets/overworld/${wc.spriteId}.png`,
    chopping: true,
    kind: "woodcutter",
  }));
}

export function woodcutterSceneConfig() {
  return WOODCUTTER_SCENE;
}
