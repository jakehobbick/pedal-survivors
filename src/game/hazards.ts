/** Arena hazards (telegraphed). Filled in with content in milestone 5. */
import type { World } from './world';
import type { Zone } from './entities';
export function hazardFire(w: World, z: Zone) { void w; z.dead = true; }
