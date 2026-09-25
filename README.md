# دژ ابدیت | Eternity Defense

A Persian-language, touch-friendly, endless tower-defense game with a six-act campaign, five persistent companions, four boss forms, two endings, tower synergies, wave modifiers, an achievement book and synthesized audio.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. For a production bundle, run `npm run build`; `dist/index.html` is a self-contained game page, with images copied from `public/assets`.

## Controls

- Phone and tablet: drag the battlefield to pan; tap an empty square and select one of the six towers from the bottom dock. Tap a tower to upgrade, cycle targeting, or sell it. Tap the three spell controls and Start Wave in the dock. The map toolbar switches between detail and full-map view and jumps to the entrance or heart. Pause opens sound, guide and exit controls. No keyboard is needed.
- Desktop (optional shortcuts): 1–6 build after choosing a tile; U upgrades, S sells, T changes targeting, Q/W/E casts spells, Escape deselects. Every action also has a clickable button.
- Soul crystals on the road can be tapped for extra gold and faster spell cooldowns.

## Project archive

The **Download ZIP** button on the title screen packages the complete source project, this README, root configuration, `scripts/create-zip.mjs` and all art in `public/assets`. It does not include `node_modules` or transient `dist` output. Extract the archive, run `npm install`, then `npm run dev`.

From the project root you can also generate the same archive locally with `node scripts/create-zip.mjs`. This creates `eternity-defense-source.zip` in the project root while excluding build output, installed packages, environment files and any previous archive.

Progress (records, achievements, pets and relics) is stored locally in your browser via `localStorage`.