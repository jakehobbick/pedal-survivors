# Decisions & assumptions

Running log of judgment calls made during the autonomous build. Newest milestone at the bottom.

## Milestone 1 — scaffold

- **Stack:** TypeScript + Vite 6, Canvas2D (no PixiJS). Canvas2D with pre-rendered sprite frames is enough for 400 enemies + 200 projectiles and keeps the bundle tiny and dependency-free. Vite `base: './'` so the build works from any Pages sub-path.
- **Deploy:** GitHub Pages serves the `gh-pages` branch. The Actions workflow (`.github/workflows/deploy.yml`) builds on every push to `main` and force-publishes `dist/` there. The Pages REST API isn't reachable from my build environment, so I can't switch Pages to the "GitHub Actions" source; publishing to `gh-pages` works with either setting. `scripts/deploy.sh` does the same thing locally and is the fallback I use after each milestone.
- **Storage keys** are prefixed `ps_` so they never collide with Crank Crypt (`cc_`) on the same github.io origin. Every localStorage call is wrapped in try/catch (`src/core/storage.ts`).
- **Simulated trainer** (`src/trainer/sim.ts`): manual watts/cadence sliders, hold-to-sprint, and a bot. The bot follows the workout target with Ornstein–Uhlenbeck noise, random fades (to exercise the "missed target" path), auto-shifts virtual gears to hold ~90 rpm, and sprints when a boss shield is up. It emulates ERG lag (τ≈1.3 s) so ERG transitions look realistic. A crude HR model drives HR in sim so HR zones can be tested.
- **Gameplay power = 3 s average** (10 Hz ring buffer). Instant power is only used for the sprint shield meter and the sim.
- **Debug overlay**: backquote key, or `Settings → Debug overlay`. Alt+1..6 sets a time scale (x1/x2/x4/x8/x16/x0.25) for fast play-testing.
