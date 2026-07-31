/** Maps supported keyboard shortcuts and detects editable page targets. */

/** Represents one native video operation supported by the first release. */
export type VideoAction =
  | 'toggle-playback'
  | 'seek-backward'
  | 'seek-forward'
  | 'seek-backward-far'
  | 'seek-forward-far';

/** Describes the operation and user feedback associated with one shortcut. */
export interface Shortcut {
  /** The native video operation to perform. */
  action: VideoAction;
  /** The user-facing feedback displayed after the operation. */
  message: string;
}

const SHORTCUTS: Readonly<Record<string, Shortcut>> = {
  ' ': { action: 'toggle-playback', message: 'Play / Pause' },
  ArrowLeft: { action: 'seek-backward', message: 'Back 5 seconds' },
  ArrowRight: { action: 'seek-forward', message: 'Forward 5 seconds' },
  ArrowUp: { action: 'seek-backward-far', message: 'Back 15 seconds' },
  ArrowDown: { action: 'seek-forward-far', message: 'Forward 15 seconds' },
};

/**
 * Gets the native video action for one supported keyboard event.
 *
 * @param event - The page keyboard event.
 * @returns The shortcut definition, or null when the key is unsupported.
 */
export function getShortcut(event: KeyboardEvent): Shortcut | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  return SHORTCUTS[event.key] ?? null;
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
