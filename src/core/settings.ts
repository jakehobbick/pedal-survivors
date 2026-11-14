import { LS } from './storage';

export type Action = 'up' | 'down' | 'left' | 'right' | 'dash' | 'ult' | 'shiftUp' | 'shiftDown' | 'confirm' | 'pause';
export const ACTION_LABELS: Record<Action, string> = {
  up: 'Steer up', down: 'Steer down', left: 'Steer left', right: 'Steer right',
  dash: 'Dash (ability 1)', ult: 'Ultimate (ability 2)', shiftUp: 'Shift up (harder gear)', shiftDown: 'Shift down (easier gear)',
  confirm: 'Confirm / select', pause: 'Pause',
};
/** Two bindings per action. Defaults stay compatible with Crank Crypt (E/Q shift, Enter, Esc, A/D, F). */
export const DEFAULT_KEYS: Record<Action, [string, string]> = {
  up: ['w', 'ArrowUp'], down: ['s', 'ArrowDown'], left: ['a', 'ArrowLeft'], right: ['d', 'ArrowRight'],
  dash: ['f', ' '], ult: ['r', 'g'], shiftUp: ['e', ']'], shiftDown: ['q', '['], confirm: ['Enter', 'c'], pause: ['Escape', 'p'],
};

export interface Settings {
  ftp: number; maxHr: number; weightKg: number;
  volume: number; music: number; sfx: number; muted: boolean;
  shake: boolean; dmgNumbers: boolean; reduceFx: boolean;
  steer: '8way' | 'turn';
  autopilot: boolean;
  gearMode: 'erg-curve' | 'grade';
  intervalMode: 'erg' | 'gears';
  gearCurve: number; // cadence exponent for the virtual gear curve
  keys: Record<Action, [string, string]>;
  debug: boolean;
  hand: 'right' | 'left';
}
const DEF: Settings = {
  ftp: 250, maxHr: 190, weightKg: 75,
  volume: 0.8, music: 0.55, sfx: 0.8, muted: false,
  shake: true, dmgNumbers: true, reduceFx: false,
  steer: '8way', autopilot: false,
  gearMode: 'erg-curve', intervalMode: 'erg', gearCurve: 1.6,
  keys: DEFAULT_KEYS,
  debug: false, hand: 'right',
};
function load(): Settings {
  const s = Object.assign({}, DEF, LS.get<Partial<Settings>>('settings', {}));
  s.keys = Object.assign({}, DEFAULT_KEYS, s.keys || {});
  s.ftp = Math.max(80, Math.min(600, +s.ftp || 250));
  s.maxHr = Math.max(120, Math.min(230, +s.maxHr || 190));
  return s;
}
export const settings: Settings = load();
export const saveSettings = () => LS.set('settings', settings);
export const FTP = () => settings.ftp;
export function resetSettings() { Object.assign(settings, DEF, { keys: { ...DEFAULT_KEYS } }); saveSettings(); }
