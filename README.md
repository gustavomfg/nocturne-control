# Solaris

<p align="center">
  <strong>An interactive WebGL instrument for attention.</strong>
</p>

<p align="center">
  <a href="https://gustavomfg.github.io/nocturne-control/">Live demo</a>
  ·
  <a href="#getting-started">Run locally</a>
  ·
  <a href="DESIGN.md">Design system</a>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61dafb" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-1f2937?logo=typescript&logoColor=3178c6" />
  <img alt="WebGL2" src="https://img.shields.io/badge/WebGL2-GLSL-3656ff" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-1f1b2d?logo=vite&logoColor=ffd166" />
</p>

Solaris is a portfolio experience built around one idea: a visitor's gesture can become a living visual object. Move through the field and a raymarched 3D orb shifts its form, light, atmosphere, orbiting particles, and color.

The interface is intentionally small. There are no accounts, feeds, dashboards, missions, or background systems competing with the artifact.

## Highlights

- Custom WebGL2 renderer with a GLSL raymarched 3D orb.
- Pointer and touch input for camera drift, surface deformation, particles, and energy.
- Full field mode that expands the composition into a viewport-filling installation.
- Four visual palettes: Prism, Sol, Violet, and Moss.
- Intensity control that changes the shader's material and atmosphere.
- Optional Web Audio tone, silent by default and keyboard accessible.
- Progressive enhancement: a composed 2D canvas fallback when WebGL2 is unavailable.
- Reduced-motion support, capped device-pixel ratio, responsive layout, and visible focus states.
- Installable local-first PWA shell.

## Getting Started

```bash
npm ci
npm run dev
```

The development server uses the repository's GitHub Pages base path:

```text
/nocturne-control/
```

For another deployment path, set `VITE_BASE_PATH` before building.

## Scripts

```bash
npm run dev       # start the Vite development server
npm run lint      # run ESLint
npm run test      # run Vitest checks once
npm run build     # typecheck and build production assets
npm run test:pwa  # build and run the PWA smoke test in Chromium
npm run preview   # preview the production build
```

## Tech Stack

- React 19 and TypeScript
- Vite
- WebGL2 and GLSL ES 3.00
- Web Audio API
- CSS with Bricolage Grotesque and Source Sans 3
- Vitest, Testing Library, and Playwright

The runtime stays intentionally small. The 3D scene is written directly against WebGL2 instead of relying on a large 3D framework, while the fallback keeps the experience usable on devices without a compatible GPU context.

## Quality Checks

```bash
npm run lint
npm run test
npm run build
```

The unit suite covers the Solaris shell, palette state, intensity control, audio opt-in, and the no-WebGL fallback path. The browser smoke test covers the production PWA shell.

## Project Structure

```text
src/App.tsx          Active Solaris experience and WebGL2 renderer
src/styles/          Solaris visual system and global reset
public/              Manifest, service worker, and Pages fallback
PRODUCT.md           Product purpose and experience principles
DESIGN.md            Visual system, interaction, and accessibility rules
tests/               Browser and offline PWA checks
```

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`. The workflow installs dependencies, checks the app, builds the production bundle, and deploys `dist/` to GitHub Pages.

## License / Usage

Solaris is an original fictional portfolio/study project. Keep future additions aligned with the instrument's focus: make the gesture visible, make the response meaningful, and leave room for curiosity.
