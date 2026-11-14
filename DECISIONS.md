# Decisions & assumptions

Running log of judgment calls made during the autonomous build. Newest milestone at the bottom.

## Milestone 1 — scaffold

- **Stack:** TypeScript + Vite 6, Canvas2D (no PixiJS). Canvas2D with pre-rendered sprite frames is enough for 400 enemies + 200 projectiles and keeps the bundle tiny and dependency-free. Vite `base: './'` so the build works from any Pages sub-path.
- **Deploy:** GitHub Pages serves the `gh-pages` branch. The Actions workflow (`.github/workflows/deploy.yml`) builds on every push to `main` and force-publishes `dist/` there. The Pages REST API isn't reachable from my build environment, so I can't switch Pages to the "GitHub Actions" source; publishing to `gh-pages` works with either setting. `scripts/deploy.sh` does the same thing locally and is the fallback I use after each milestone.
- **Storage keys** are prefixed `ps_` so they never collide with Crank Crypt (`cc_`) on the same github.io origin. Every localStorage call is wrapped in try/catch (`src/core/storage.ts`).
- **Simulated trainer** (`src/trainer/sim.ts`): manual watts/cadence sliders, hold-to-sprint, and a bot. The bot follows the workout target with Ornstein–Uhlenbeck noise, random fades (to exercise the "missed target" path), auto-shifts virtual gears to hold ~90 rpm, and sprints when a boss shield is up. It emulates ERG lag (τ≈1.3 s) so ERG transitions look realistic. A crude HR model drives HR in sim so HR zones can be tested.
- **Gameplay power = 3 s average** (10 Hz ring buffer). Instant power is only used for the sprint shield meter and the sim.
- **Debug overlay**: backquote key, or `Settings → Debug overlay`. Alt+1..6 sets a time scale (x1/x2/x4/x8/x16/x0.25) for fast play-testing.

## Milestone 2 — core loop

- **View & scale:** world units ≈ CSS px at 760-unit view height. Camera leads ~70 units in the heading direction so you see what you're riding into.
- **Movement = power.** Speed = 225 × (0.35 + 0.65·min(p,1) + 0.5·clamp(p−1, 0, 0.8)) where p = 3 s power / FTP. You never fully stop (35% "coast") because a stalled rider in a horde game is just a death sentence.
- **Attack rate = power.** 55% at 0 W → 100% at FTP → 160% at 2.2×FTP. Cadence 85–100 rpm adds +10% crit.
- **Steering:** the bike always rolls; the D-pad *sets the heading* (8-way) and the heading persists after release, so tap-only controllers work. An alternative "turn" mode rotates the heading. Optional autopilot (also on whenever the bot rides) steers away from crowds and toward loot when you haven't steered for 1.2 s.
- **Death never ends the run** (the spec says missing targets never ends a run; I extended that to HP). At 0 HP you get knocked down for ~4.5 s, enemies are shoved back, you lose the current level's XP progress, then "Second Wind" revives you at 50% HP. Falls are tracked (achievements reward deathless runs).
- **Menus don't pause the world**; it runs at 6% speed and you're invulnerable while a level-up/chest/shop menu is open. The workout clock keeps running because your legs are.
- **XP curve** `xp(L) = 10 + 7L (+ a late-game term)`, tuned with bot runs so a 30-min run reaches level ~30–35.
- **Pools + spatial hash:** every entity type is preallocated, flagged dead during the frame and swap-compacted once at the end, so spatial-hash indices stay valid all frame. Queries de-duplicate with a per-enemy stamp (no Set allocations). Particles and damage numbers are struct-of-arrays.
- **Gems** get a gentle vacuum inside 2× pickup range, and gems past 900 merge into existing ones to cap counts.
