/** Maps supported keyboard shortcuts and detects editable page targets. */

const SHORTCUT_MESSAGES: Readonly<Record<string, string>> = {
  '[': 'Slower',
  ']': 'Faster',
  ' ': 'Play / Pause',
  ArrowLeft: 'Back 5 seconds',
  ArrowRight: 'Forward 5 seconds',
  ArrowUp: 'Back 15 seconds',
  ArrowDown: 'Forward 15 seconds',
};

/**
 * Gets the overlay message for one supported keyboard event.
 *
 * @param event - The page keyboard event.
 * @returns The message to display, or null when the key is unsupported.
 */
export function getShortcutMessage(event: KeyboardEvent): string | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  return SHORTCUT_MESSAGES[event.key] ?? null;
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
