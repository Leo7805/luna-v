/** Maps supported keyboard shortcuts and detects editable page targets. */

/** Represents one native video operation supported by the first release. */
export type VideoAction =
  | 'toggle-playback'
  | 'seek-backward'
  | 'seek-forward'
  | 'seek-backward-far'
  | 'seek-forward-far';

/** Describes the operation associated with one shortcut. */
export interface Shortcut {
  /** The native video operation to perform. */
  action: VideoAction;
}

const SHORTCUTS: Readonly<Record<string, Shortcut>> = {
  ' ': { action: 'toggle-playback' },
  ArrowLeft: { action: 'seek-backward' },
  ArrowRight: { action: 'seek-forward' },
  ArrowUp: { action: 'seek-backward-far' },
  ArrowDown: { action: 'seek-forward-far' },
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
