# Nocturne Control Center

Original fictional tactical control interface built with React, TypeScript and Vite.

The project simulates a noir city operations console for Nocturne City, with Gravemere archive records, Aegis arsenal systems, active missions, a custom Leaflet city map and an interactive terminal.

## Status

The current release expands the project from a visual dashboard into a connected local simulation. Operator identity, missions, targets, equipment and logs share versioned persistent state, while the interface provides responsive navigation, feedback and accessibility preferences.

All names, locations, dossiers and map artwork are original fictional material. The visual system uses CSS-driven HUD effects, reusable inline icons and a custom local SVG map without external image or map APIs.

## Features

- Noir tactical theme with rain, scanlines, glow, radar and smooth page transitions.
- URL-based navigation for Dashboard, Gravemere, Missions, Aegis Arsenal, Terminal, Map, Profile and Logs.
- Tactical dashboard with radar, threat index, incident feed, priority operation and priority target tracking.
- Villain, mission and gadget cards using typed data, generated HUD sigils and fluid hover motion.
- Interactive Sentinel Terminal with commands backed by real project data.
- Local in-memory state with persistence via localStorage.
- Personalized operator onboarding with a persistent name, boot greeting and editable profile identity.
- Versioned saves with automatic migration plus full JSON import/export.
- Connected simulation: target captures and gadget deployments affect mission risk and progress.
- Leaflet-powered custom Nocturne district map with local SVG cartography, tactical markers and district intel.
- Original operative profile file.
- Interactive card tilt and responsive controls for desktop and mobile.
- Lazy-loaded operational modules and keyboard-accessible terminal history/autocomplete.
- Global command palette (`Ctrl/Cmd + K`), responsive mobile drawer and high-contrast preference.
- Search, filtering and empty states across missions, targets and Aegis assets.
- Toast feedback, custom confirmation dialogs, route skeletons and interactive dashboard shortcuts.
- Map layer controls, fit-to-signals action and direct links to target/mission details.
- Reducer and persistence regression tests powered by Vitest.

## Commands

```bash
npm ci
npm run dev
npm run lint
npm run test
npm run build
npm run preview
```

Use `npm install` only when intentionally changing dependencies. For normal development and CI, `npm ci` installs the exact versions recorded in `package-lock.json`.

## Quality Checks

```bash
npm run lint
npm run test
npm run build
```

The test suite covers state migration, operator identity, connected mission actions and BootScreen interaction. GitHub Actions runs all three checks before publishing GitHub Pages.

## Deploy

Pushes to `main` are deployed by `.github/workflows/deploy.yml` after lint, tests and production build pass. The configured GitHub Pages base path matches the `gotham-control` repository:

```bash
npm run build
```

Build output is generated in `dist/` and intentionally ignored. The application requires no backend, server-side rendering, external map service or private API keys.

## Terminal Commands

Inside the app terminal, try:

```text
help
status city
list villains
list missions
list gadgets
open vesper
open night rover
deploy linecaster
capture vesper
resolve vesper
scan gravemere
signal on
whoami
go map
reset state
clear
```

## Tech Stack

- React 19
- TypeScript
- Vite
- Leaflet
- ESLint
- Vitest
- Testing Library
- CSS by feature/style file

## Project Structure

```text
src/components  Shared UI components
src/data        Static Nocturne domain data
src/pages       Main app screens
src/styles      Theme and page/component CSS
src/types       Domain TypeScript models
src/utils       Asset, audio, slug and UI event helpers
public/maps     Custom Nocturne map overlay
```

## Git Hygiene

The repository ignores local env files, build output, dependency caches, provider state folders and private key/certificate formats. Keep `.env.example` as the only committed env file.

## Dependency Safety

- Runtime dependencies are limited to React and Leaflet.
- Test tooling remains in `devDependencies`.
- `package-lock.json` pins the complete dependency tree with integrity hashes.
- Prefer `npm ci` for reproducible installs and review lockfile changes whenever dependencies are updated.
- Run `npm audit` as an advisory check, while also reviewing package provenance and install scripts before adding new packages.

## Map System

The Nocturne map uses Leaflet with `CRS.Simple` and a local SVG overlay at:

```text
public/maps/nocturne-custom-map.svg
```

No Google Maps API key or external map service is required.

## License / Usage

Nocturne Control Center is an original fictional portfolio/study project. Keep any third-party images, generated model exports and large screenshots out of git unless they are explicitly cleared for use.
