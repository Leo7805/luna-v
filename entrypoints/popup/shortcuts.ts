/** Defines the keyboard shortcut reference displayed in LunaV's popup. */
import { formatCompactNumber, type VideoControlSettings } from '../../utils/settings';

/** Describes one compact keyboard-control group in the popup. */
export interface PopupShortcutGroup {
  /** The keyboard labels that activate the shortcut. */
  keys: readonly string[];
  /** The user-facing description of the shortcut. */
  description: string;
}

/** Describes one compact popup row containing one or two keyboard-control groups. */
export interface PopupShortcutRow {
  /** The keyboard-control groups displayed in one row. */
  groups: readonly PopupShortcutGroup[];
}

/** Lists every shortcut using the current speed and volume settings. */
export function getPopupShortcuts(settings: VideoControlSettings): readonly PopupShortcutRow[] {
  return [
  { groups: [{ keys: ['[', ']', '\\'], description: `Speed: − / + ${formatCompactNumber(settings.playbackRate.step)}× / reset` }] },
  { groups: [{ keys: [';', "'", 'Enter'], description: `Volume: − / + ${formatCompactNumber(settings.volume.step * 100)}% / mute` }] },
  {
    groups: [
      { keys: ['<', '>'], description: 'Start / End' },
      { keys: [',', '.'], description: `Fine seek: − / + ${settings.seek.fineSeconds}s` },
    ],
  },
  {
    groups: [
      { keys: ['←', '→'], description: `Medium seek: − / + ${settings.seek.nearSeconds}s` },
      { keys: ['↑', '↓'], description: `Large seek: − / + ${settings.seek.farSeconds}s` },
    ],
  },
  ];
}
