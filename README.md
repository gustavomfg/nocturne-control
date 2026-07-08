# Nocturne Control Center

Original fictional tactical control interface built with React, TypeScript and Vite.

The project simulates a noir city operations console for Nocturne City, with Gravemere archive records, Aegis arsenal systems, active missions, a custom Leaflet city map and an interactive terminal.

## Status

This project now uses original fictional names, locations and dossiers. Local raster images for characters, backgrounds, profile art and screenshots were removed; the interface relies on CSS-driven HUD visuals, animated cards and the custom SVG map overlay.

Latest upgrade: the Dashboard, navigation and card systems now use reusable inline HUD icons, smoother hover motion, fixed priority target layout and a consistent diagonal highlight effect across panels.

## Features

- Noir tactical theme with rain, scanlines, glow, radar and smooth page transitions.
- URL-based navigation for Dashboard, Gravemere, Missions, Aegis Arsenal, Terminal, Map, Profile and Logs.
- Tactical dashboard with radar, threat index, incident feed, priority operation and priority target tracking.
- Villain, mission and gadget cards using typed data, generated HUD sigils and fluid hover motion.
- Interactive Sentinel Terminal with commands backed by real project data.
- Local in-memory state with persistence via localStorage.
- Leaflet-powered custom Nocturne district map with local SVG cartography, tactical markers and district intel.
- Original operative profile file.
- Interactive card tilt and responsive controls for desktop and mobile.

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

## Deploy

Build output is generated in `dist/` and is intentionally ignored by Git:

```bash
npm run build
```

Publish the generated `dist/` folder with any static host such as Vercel, Netlify, GitHub Pages or a simple static server. The app does not require server-side rendering or private API keys.

For GitHub Pages, confirm that `base` in `vite.config.ts` matches the repository path before building.

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
reset state
clear
```

## Tech Stack

- React 19
- TypeScript
- Vite
- Leaflet
- ESLint
- CSS by feature/style file

## Project Structure

```text
src/components  Shared UI components
src/data        Static Nocturne domain data
src/pages       Main app screens
src/styles      Theme and page/component CSS
src/types       Domain TypeScript models
public/maps     Custom Nocturne map overlay
```

## Git Hygiene

The repository ignores local env files, build output, dependency caches, provider state folders and private key/certificate formats. Keep `.env.example` as the only committed env file.

## Map System

The Nocturne map uses Leaflet with `CRS.Simple` and a local SVG overlay at:

```text
public/maps/nocturne-custom-map.svg
```

No Google Maps API key or external map service is required.

## License / Usage

Nocturne Control Center is an original fictional portfolio/study project. Keep any third-party images, generated model exports and large screenshots out of git unless they are explicitly cleared for use.
