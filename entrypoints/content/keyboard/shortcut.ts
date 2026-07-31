/** Maps supported keyboard shortcuts and detects editable page targets. */

/** Represents one native video operation supported by the first release. */
export type VideoAction =
  | 'toggle-playback'
  | 'seek-backward-fine'
  | 'seek-forward-fine'
  | 'seek-backward'
  | 'seek-forward'
  | 'seek-backward-far'
  | 'seek-forward-far'
  | 'decrease-playback-rate'
  | 'increase-playback-rate';

/** Represents one supported playback-speed action. */
export type PlaybackRateAction = 'decrease-playback-rate' | 'increase-playback-rate';

/** Describes the operation associated with one shortcut. */
export interface Shortcut {
  /** The native video operation to perform. */
  action: VideoAction;
}

const SHORTCUTS: Readonly<Record<string, Shortcut>> = {
  ' ': { action: 'toggle-playback' },
  ',': { action: 'seek-backward-fine' },
  '.': { action: 'seek-forward-fine' },
  ArrowLeft: { action: 'seek-backward' },
  ArrowRight: { action: 'seek-forward' },
  ArrowUp: { action: 'seek-backward-far' },
  ArrowDown: { action: 'seek-forward-far' },
};

const CODE_SHORTCUTS: Readonly<Record<string, Shortcut>> = {
  BracketLeft: { action: 'decrease-playback-rate' },
  BracketRight: { action: 'increase-playback-rate' },
};

/**
 * Gets the native video action for one supported keyboard event.
 *
 * @param event - The page keyboard event.
 * @returns The shortcut definition, or null when the key is unsupported.
 */
export function getShortcut(event: KeyboardEvent): Shortcut | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  return SHORTCUTS[event.key] ?? CODE_SHORTCUTS[event.code] ?? null;
}

/**
 * Determines whether an action changes playback speed instead of playback position or state.
 *
 * @param action - The supported video action to inspect.
 * @returns True when the action changes playback speed.
 */
export function isPlaybackRateAction(action: VideoAction): action is PlaybackRateAction {
  return action === 'decrease-playback-rate' || action === 'increase-playback-rate';
}

/**
 * Determines whether an event target belongs to an editable page control.
 *
 * @param target - The event target to inspect.
 * @returns True when keyboard input must remain available to the page.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'),
  );
}
