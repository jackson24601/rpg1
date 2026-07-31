# Dragon Quest

A basic 1990s-style role-playing game with SVGA / 16-bit JRPG title and party screens.

## Play

Open `index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Screens

1. **Title screen** (`index.html`) — medieval dusk scene, bubble-letter branding, **Begin Quest**
2. **Party select** (`party.html`) — choose 3 of 12 classes with pixel-art portraits

Selected party members are stored in `sessionStorage` under `dragonQuestParty`.
