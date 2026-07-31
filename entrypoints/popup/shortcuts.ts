/** Defines the keyboard shortcut reference displayed in LunaV's popup. */

/** Describes one row in the popup shortcut reference. */
export interface PopupShortcut {
  /** The keyboard labels that activate the shortcut. */
  keys: readonly string[];
  /** The user-facing description of the shortcut. */
  description: string;
}

/** Lists every keyboard shortcut currently supported by LunaV. */
export const POPUP_SHORTCUTS: readonly PopupShortcut[] = [
  { keys: ['Space'], description: 'Play or pause' },
  { keys: ['[', ']'], description: 'Speed ±0.25× (0.25×–3×)' },
  { keys: ['↑', '↓'], description: 'Seek 30 seconds' },
  { keys: ['←', '→'], description: 'Seek 5 seconds' },
  { keys: [',', '.'], description: 'Fine seek 0.5 seconds' },
];
