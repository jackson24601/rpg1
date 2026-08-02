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
3. **Overworld** (`game.html`) — each grid square is its own SVGA scene; move with on-screen arrows

Selected party members are stored in `sessionStorage` under `dragonQuestParty`.
The **first** hero chosen becomes the party leader sprite on the overworld.

## Overworld map

- 24×8 scenes ringed by impassable mountains
- Terrain scenes: Plains, Forest, Meadow, Swamp
- Special scenes (red-framed landmarks): Dragon Castle, Temple of Peace, Outlaw Hideout, Mines of Tyrol, TOWN, Initial Sequence (start), Abandoned Ruins, Witches' Lair
- Mini-map for orientation; enemies / encounters not implemented yet
