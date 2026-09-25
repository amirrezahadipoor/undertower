# دژ ابدیت | Eternity Defense

A Persian-language, touch-first tower-defense game with a six-act campaign, five persistent companions, four boss forms, two endings, tower synergies, wave modifiers, an achievement book and fully synthesized audio (no audio files at all).

![status](https://img.shields.io/badge/status-active_development-blue) [![CI](https://github.com/amirrezahadipoor/undertower/actions/workflows/ci.yml/badge.svg)](https://github.com/amirrezahadipoor/undertower/actions/workflows/ci.yml)

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev        # dev server
npm run build      # single-file production build → dist/index.html
npm run typecheck  # tsc --noEmit
npm test           # engine + balance test-suite (vitest)
```

`npm run build` produces **one self-contained `dist/index.html`** — every script, style and image is inlined, so the file runs from anywhere (double-click, USB stick, itch.io upload) with no assets folder.

## Controls

- **Phone / tablet (landscape recommended):** drag the battlefield to pan; tap an empty square and pick one of the six towers from the bottom dock. Tap a tower to upgrade, cycle targeting or sell it. Spells and Start-Wave live in the same dock. The map toolbar switches between detail and full-map view and can jump to the entrance or the heart.
- **Desktop (optional shortcuts):** `1–6` build after choosing a tile · `U` upgrade · `S` sell · `T` targeting · `Q/W/E` spells · `Space` start wave / pause · `Esc` deselect. Every action also has a clickable button.
- Soul crystals on the road can be tapped for extra gold and faster spell cooldowns.
- **A run in progress is saved automatically** (every few seconds, and when the tab is hidden or closed). The next time you open the game you can continue that run — designed for phones, where calls and app-switching happen.

## Testing

The simulation core (`src/game/engine.ts`) has **zero DOM dependencies**, so the whole game can run headless in Node. `npm test` covers:

- engine sanity (wave completion, gold economy, enemy death, game-over),
- seeded-RNG determinism (identical seeds → identical battles),
- save/load round-trip (towers, gold, RNG stream),
- render-safety clamps (the class of bug that once froze the game),
- **balance guard-rails** — an automated "average player" bot must start taking core damage inside the campaign (and must not sit on an enormous unusable gold pile), while a passive bot must still lose. These tests fail loudly if a future change accidentally re-flattens the difficulty curve.

## Project archive

The **Download ZIP** button on the title screen packages the complete, runnable source project (sources, `src/assets` art, README, root configuration, `scripts/create-zip.mjs`) — no `node_modules`, no build output. Extract, `npm install`, `npm run dev`.

From the project root you can also generate the same archive locally: `node scripts/create-zip.mjs` → `eternity-defense-source.zip`.

## Android APK

The repo ships a GitHub Actions workflow (`.github/workflows/apk.yml`) that builds an installable **debug APK** on every `v*` tag (or manually via *Run workflow*): tests → single-file web build → Capacitor Android shell (landscape-locked, fullscreen) → Gradle `assembleDebug`. The APK is uploaded as the `EternityDefense-APK` artifact. Locally the same pipeline runs with `npm run apk` (requires Android SDK + JDK 21).

> **v1.0.0** was built this way: `EternityDefense-debug.apk` (~12 MB, Capacitor 7, `com.eternitydefense.game`) — verified: `classes.dex` + the full single-file game in `assets/public/index.html` + 20 adaptive launcher icons. Debug-signed (installable directly); Play-Store signing is a roadmap item.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) — the staged path from "polished indie" toward AAA: rendering, content, netcode-safe leaderboards and tooling. Completed items are checked off as they ship.

## Assets

All artwork in `src/assets` is AI-generated placeholder art created for this prototype; it is meant to be replaced by hand-made, style-consistent art (see the roadmap). All audio is synthesized at runtime in `src/game/audio.ts` — the project ships **zero** audio files.

Progress (records, achievements, pets and relics) is stored locally in your browser via `localStorage`.

## License

[MIT](./LICENSE)
