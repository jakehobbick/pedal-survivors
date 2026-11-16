# Pedal Survivors

A smart-trainer horde-survival game (Vampire Survivors / Brotato style) where **every run is a structured workout**. Your power moves your rider and fires your weapons, interval targets drive the enemy waves and the trainer's resistance, and every run ends with a boss whose shield only breaks under an all-out sprint.

**Play:** https://jakehobbick.github.io/pedal-survivors/ (iPad in **Bluefy**, or desktop Chrome/Edge)

No trainer? Everything works with the built-in **simulated trainer** (sliders, or 🤖 Bot, which rides the workout for you).

---

## 1. Pairing

| Device | How |
|---|---|
| **Wahoo KICKR** (or any FTMS trainer) | Title screen → **Smart trainer → Pair**. Pick the KICKR. The game requests control (FTMS `0x00`), starts (`0x07`) and from then on sends ERG targets (`0x05`) or simulation grade (`0x11`). Power and cadence come from Indoor Bike Data, with a Cycling Power fallback. |
| **Heart-rate strap** (optional) | **Heart rate → Pair**. Any standard BLE HR strap (or a watch broadcasting HR). |
| **Zwift Ride** | Bridged through **BikeControl** on your Pixel, which turns the Zwift Ride buttons into keyboard presses for the iPad. Map each button in BikeControl to a key from the table below (or remap in **🎮 Controls**). The title screen shows the last button received so you can confirm the bridge works. Gamepad-style bridges also work (Gamepad API). |

**iPad:** Safari has no Web Bluetooth, so open the link in **Bluefy**. On desktop, Chrome and Edge have Web Bluetooth built in.

**Disconnects:** if the trainer drops mid-run, the game and the workout clock pause and a dialog offers *Reconnect now / Continue with the simulator / End run*. It also retries on its own in the background (4 tries with backoff, no picker needed). HR straps reconnect quietly.

Set your **FTP** (default 250 W) and **max HR** (default 190) in ⚙ Settings. Every power number in the game is relative to FTP.

## 2. Controls

| Action | Keys (default, Crank Crypt–compatible) | Zwift Ride via BikeControl | Touch |
|---|---|---|---|
| Steer (8-way) | `W A S D` / arrows | D-pad / left buttons | Drag anywhere on the left half (floating stick) |
| Dash (ability 1) | `F` / Space | any spare button | 💨 button |
| Ultimate (ability 2) | `R` / `G` | any spare button | ✨ button |
| Shift up / down (virtual gears) | `E` / `]` and `Q` / `[` | shift paddles | ▲ / ▼ (shown in gear mode) |
| Confirm / pick | `Enter` / `C` | any | tap |
| Pause | `Esc` / `P` | any | ⏸ |
| Mute | `M` | | Pause menu |

Steering *sets your heading*: the bike keeps rolling the way you last pointed it, so tap-only controllers are fine. There's also a *Turn* mode (left/right rotates) and an optional **autopilot** that dodges crowds and telegraphed attacks, grabs loot and circles bosses whenever you haven't steered for a moment. Menus are fully navigable with the steer, confirm and pause buttons.

Simulator keys: `+`/`-` watts (Shift = ±50), `,`/`.` cadence, hold `X` to sprint, `B` toggles the bot, `` ` `` toggles the debug overlay, Alt+1…6 sets the time scale.

## 3. How riding drives the game

- **Power → movement speed and attack rate**, as % of FTP (3-second average). You never fully stop: there's a 35% "coast" floor.
- **Cadence 85–100 rpm → +10% crit chance** (the HUD shows *CRIT CADENCE ✓*).
- **Virtual gears (24)** cover the hard efforts, so sprints come from *power*, not from spinning 130 rpm (the Crank Crypt lesson). In gear mode the trainer gets `FTP × gear(g) × (rpm/90)^1.6`. A 150% sprint is about gear 19 at 90 rpm. The feel exponent is adjustable, and there's an optional *simulated grade* mode.
- **ERG** holds the target for every interval with a target band, and ramps through warm-ups and cool-downs. Sprints, the boss shield sprint and Free Ride use gears. Settings → *Interval resistance → Virtual gears* lets you hold targets yourself for +25% Surge.
- **Pausing** drops the trainer to 45% ERG. Resuming restores whatever the workout wants, including the gear you were in.

## 4. Workouts → waves

Pick a template and a length (**20 / 30 / 45 / 60 min**). Each run is *warm-up → main set → boss → cool-down "victory lap"*.

| Template | Main set (at 60 min) | Your 30-min version | Wave style |
|---|---|---|---|
| Endurance (Z2) | steady 65–75% blocks | same | normal waves, pit stops |
| **Sweet Spot** | 3 × 10 min @ 88–94% | **3 × 5 min @ 88–94%, 2 min recoveries** | elite waves |
| Threshold | 2 × 20 min @ 95–102% | shorter reps | siege (ranged + shielded + healers) |
| VO₂ Max | 5 × 3 min @ 110–120% | fewer reps | elite waves |
| Sprint Ladder | 10 → 15 → 20 → 25 → 30 s all-outs | same ladder | swarms |
| Over-Unders | 92–97% / 104–110% alternating | shorter | swarm on the overs |
| Free Ride | no targets | — | waves scale with your rolling 3-min power |

- **Wave intensity follows the target**: spawn rate scales with (target/FTP)², so a VO₂ wave is visibly denser than Z2. Each step type picks the enemy mix and the banner tells you the target ("ELITE WAVE: hold 115% FTP for 3:00").
- **Surge meter**: staying inside the band (±5%) fills it for up to +50% damage and XP. At 100% you get **OVERDRIVE**: a nova plus double damage for 8 s.
- **Missing the target** (more than 6 s below the band) ratchets up *pressure*: more spawns, faster and harder-hitting enemies, and a banner with the watts to get back to. It decays once you're back in the band. **It never ends the run**, and falling at 0 HP doesn't either (you're knocked down, then Second Wind).
- **Recovery waves** are calm, with a **pit-stop shop** (heal, mystery upgrade, reroll, chest) or a free chest.
- **Boss**: an 8 s "shift up" countdown, then the boss arrives behind a hex **shield that only sprint power breaks**. Above 120% FTP it drains, taking ~24 s at 150% and ~15 s at 168%+. Miss the 30 s window and it regrows partway; you get 40 s of recovery and a second sprint. Once the shield breaks, ERG drops to 78% for the fight. A boss that outlasts ~55 s starts to *fade*, taking more damage every second. If it survives 2.5 min of overtime, it flees.
- The music adapts too: layers build with the step type, and the top layer (arpeggio/lead) only plays **while you're in the band**.

## 5. Progression

- **Level-ups**: pick 1 of 3, with **rerolls**, **banishes** and skips. 11 weapons and 13 passives (6 weapon and 6 passive slots).
- **Evolutions**: a max-level (6) weapon plus its paired passive, then a chest opens and it evolves. All 11 weapons have one, e.g. Valve Darts + Cadence Sensor → *Presta Storm*, Chain Whip + Chain Lube → *Derailleur Reaper*.
- **Enemies**: 10 behaviours (swarmers, chasers, heavies, chargers, ranged, splitters, shielded, exploders, phasers, healers) plus elites. Each arena has 3 mini-bosses and 1 final boss (Oni Shogun, Neon Leviathan, Magma Wyrm).
- **Gold** banks between runs and buys **18 permanent upgrades** (⬆ Upgrades, free full refund).
- **Riders**: Kai the Sprinter, Mira the Climber, Sora the TT Specialist, Ren the All-Rounder, plus Yuki the Domestique (unlocks when you evolve a weapon). Each has a starting weapon, a riding-style passive (e.g. Kai gets +30% damage above 120% FTP; Mira gets armor and area below 80 rpm) and an ultimate.
- **Arenas**: Sakura Switchbacks, then **Neon Criterium** (beat the Oni Shogun), then **Volcano Col** (beat the Neon Leviathan).
- **38 achievements** (each pays gold) and a **📊 Stats** screen: lifetime kJ, time ridden, best 1/5/20-min power, peak power, kills, runs, wins and recent run history.
- **Save backup**: Settings → 💾 (or 📊 → backup) exports a JSON file (iPad share sheet → Save to Files), copies it to the clipboard, or imports one.

## 6. After the ride: Garmin → Strava

The post-run screen shows workout compliance, time in power and HR zones, avg/NP/IF/TSS/kJ, your 1/5/20-min bests (with PBs flagged), your build, and the achievements you unlocked.

- **⬇ Save ride for Garmin (.tcx)**: 1-second power, cadence and HR, with **one lap per workout step** so your intervals show up as laps. It validates against Garmin's TrainingCenterDatabase v2 schema. On iPad choose *Save to Files*, then import it in Garmin Connect (web: *Import Data*, or share the file to the Garmin Connect app). It syncs to Strava from there. You can save mid-ride from the pause menu, and the last ride can be re-exported from the title screen.
- **📸 Save share card**: a 1080×1350 image (scene, power graph with target, key stats, achievements).
- **📋 Copy Strava title / description**: an auto-generated, run-specific joke title ("Sweet Spot, sour legs", "Dropped the Oni Shogun on the final sprint") and a stat summary.

## 7. Settings, debug and testing

- ⚙ Settings: FTP, max HR, interval resistance (ERG/gears), gear feel, steering mode, autopilot, auto-pick level-ups, touch-button side, master/music/SFX volume and mute, screen shake, damage numbers, reduced effects, render resolution (Auto adapts to hold 60 fps).
- **Debug overlay** (`` ` `` or Settings): FPS, frame work time, entity counts, trainer state.
- **Stress test** (Settings → 🧪): 400 enemies plus 200 projectiles.
- **Simulated trainer**: sliders, hold-to-sprint, and a bot that follows the workout (with realistic fades and ERG lag), shifts gears, sprints for bosses and steers with the autopilot.
- `scripts/` holds the Playwright play-test harness used during development (`dod.py` runs the 30-min Sweet Spot and validates the TCX against `scripts/TrainingCenterDatabasev2.xsd`; `bal.py` is the balance probe; `stress.py`, `ipad.py` and `touchtest.py` cover performance, layout and touch). Run `npm run build && npx vite preview --port 4173` first.

## 8. Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
```

TypeScript, Vite and Canvas2D, with no runtime dependencies besides bundled fonts. Every sprite is procedural Canvas art baked into frames at load, and every sound is synthesized WebAudio. **Deploy:** every push to `main` runs `.github/workflows/deploy.yml`, which builds and publishes `dist/` to the `gh-pages` branch (Pages source: *Deploy from a branch → gh-pages*). `scripts/deploy.sh` does the same locally.

```
src/
  data/        ← all content lives here (data-driven)
    weapons.ts     weapons, evolutions, passives
    enemies.ts     enemy stats + boss metadata
    arenas.ts      arenas: enemy pools, names, bosses, hazards, music
    characters.ts  riders
    workouts.ts    workout templates
    meta.ts        permanent upgrades
  meta/achievements.ts   achievements
  game/        world, director (waves), workout runtime, weapons, enemy AI, bosses, render
  trainer/     ble.ts (FTMS/CPS/HR), control.ts (ERG/gears), sim.ts (simulator + bot), sensors.ts (recorder)
  art/         procedural sprites (rider, enemies, bosses, arenas, fx, icons)
  audio/       sfx.ts + music.ts (adaptive)
  export/      tcx.ts, share.ts, title.ts
  ui/          HUD, menus, post-run, touch
```

### Adding a weapon
Append to `WEAPONS` in `src/data/weapons.ts`. `behavior` picks the firing code in `src/game/weapons.ts` (`shot`, `whip`, `cannon`, `aura`, `lob`, `orbit`, `strike`, `boomerang`, `beam`, `trail`); `base` holds the level-1 stats and each `levels` entry adds to them:

```ts
{
  id: 'pump', name: 'Mini Pump', behavior: 'shot', color: '#9ff0ff',
  desc: 'Blasts compressed air at the nearest enemy.',
  base: W({ dmg: 12, cd: 1.1, speed: 520, amount: 1, pierce: 2 }),
  levels: [['+1 blast', { amount: 1 }], ['+6 damage', { dmg: 6 }], ['+1 pierce', { pierce: 1 }], ['−15% cooldown', { cd: -0.15 }], ['+8 damage', { dmg: 8 }]],
  evo: { with: 'aero', into: 'compressor' },   // optional: max level + Aero Helmet → evolves
},
{ id: 'compressor', name: 'Track Compressor', behavior: 'shot', color: '#9ff0ff', evolved: true, desc: '…', base: W({ dmg: 30, cd: 0.5, amount: 4, pierce: 5 }), levels: [] },
```
Add an icon drawer keyed by the id in `src/art/icons.ts` (it falls back to a generic icon). Passives live in the same file (`PASSIVES`, each with an `apply(stats, level)` function).

### Adding an enemy
Append to `ENEMIES` in `src/data/enemies.ts` with a `behavior` (`chase`, `swarm`, `charger`, `ranged`, `splitter`, `shielded`, `exploder`, `phaser`, `healer`, `boss`) and its numbers. Then add it to an arena's `pool` in `src/data/arenas.ts` as `[id, weight, fromProgress]` with a themed display name in `names`, and give it art in `src/art/enemies.ts` (one draw function per id, themed per arena). Bosses also get a `BOSSES` entry listing their attacks (`slam`, `rocks`, `ring`, `spiral`, `charge`, `dashes`, `laser`, `summon`).

### Adding a workout template
Append to `TEMPLATES` in `src/data/workouts.ts`. `build(minutes)` returns steps. Use the helpers (`warmup`, `interval`, `recovery`, `endurance`, `boss`, `cooldown`, `fill`) and `frame(min)` for the standard warm-up/boss/cool-down budget:

```ts
{
  id: 'tempo', name: 'Tempo', short: '3×8', color: '#7fd1ff', desc: '3 tempo blocks at 76–86% FTP.',
  build(min) {
    const f = frame(min); const s: Step[] = [warmup(f.W)];
    const on = Math.min(8, (f.main - 4) / 3);
    for (let i = 0; i < 3; i++) { s.push(interval(0.76, 0.86, on * 60, 'Tempo', 'normal', i + 1, 3)); if (i < 2) s.push(recovery(2)); }
    fill(s, f.main - (3 * on + 4)); s.push(boss(), cooldown(f.C)); return s;
  },
},
```
Each step's `lo`/`hi` (FTP fractions) is both the on-screen target band and the ERG target. `wave` picks the enemy mix (`normal`, `elite`, `swarm`, `siege`, `calm`) and `mode: 'gear'` hands resistance to virtual gears. The template shows up in the run setup screen automatically, including its profile graph.

### Other content
Riders: `src/data/characters.ts` (look, starting weapon, passive, ultimate, unlock). Permanent upgrades: `src/data/meta.ts`. Achievements: `src/meta/achievements.ts` (events to listen to, plus a `test`).

See **DECISIONS.md** for every design call and assumption made during the build.
