# Dragon Quest

A basic 1990s-style role-playing game with SVGA / 16-bit JRPG screens.

## Play

```bash
python3 -m http.server 8080
```

Visit `http://localhost:8080`.

## Screens

1. **Title** (`index.html`) — Begin Quest
2. **Party select** (`party.html`) — choose 3 of 12 classes
3. **Overworld** (`game.html`) — 24×8 board ringed by impassable mountains; move with on-screen arrows

Selected party members are stored in `sessionStorage` under `dragonQuestParty`.

## Overworld map

- Terrain: Mountains (impassable), Plains, Forest, Meadow, Swamp
- Special red scenes: Dragon Castle, Temple of Peace, Outlaw Hideout, Mines of Tyrol, TOWN, Initial Sequence (start), Abandoned Ruins, Witches' Lair
- Enemies / encounters are not implemented yet
