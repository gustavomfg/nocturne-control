# Gotham Control Center

A Batman-inspired tactical control interface built with React, TypeScript and Vite.

The project simulates a WayneTech/Batcomputer dashboard with Gotham surveillance, Arkham records, active missions, tactical equipment and an interactive terminal.

## Features

- Noir Gotham visual theme with rain, scanlines and cinematic background.
- URL-based navigation for Dashboard, Arkham, Missions, WayneTech and Terminal.
- Tactical dashboard with radar, threat index, incident feed and priority operation.
- Villain, mission and gadget cards using local images and typed data.
- Interactive Bat Terminal with commands backed by real project data.
- Responsive layout for desktop and mobile.

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

## Terminal Commands

Inside the app terminal, try:

```text
help
status city
list villains
list missions
list gadgets
open joker
open batmobile
deploy grapple
scan arkham
signal on
clear
```

## Tech Stack

- React 19
- TypeScript
- Vite
- ESLint
- CSS modules by feature/style file

## Project Structure

```text
src/components  Shared UI components
src/data        Static Gotham domain data
src/pages       Main app screens
src/styles      Theme and page/component CSS
src/types       Domain TypeScript models
public/cards    Local card images
public/backgrounds Local background images
```
