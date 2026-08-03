/** Renders one consistently styled keyboard key in LunaV's popup. */

/** Props for a single keyboard key label. */
interface ShortcutKeyProps {
  /** The keyboard label to display. */
  label: string;
}

/**
 * Renders one green keyboard key label.
 *
 * @param props - The keyboard key configuration.
 * @returns The keyboard key element.
 */
export function ShortcutKey({ label }: ShortcutKeyProps) {
  const isSpeedResetKey = label === '\\';

  return (
    <kbd className={`rounded-md border border-emerald-300/30 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-300${isSpeedResetKey ? ' min-w-13 text-center' : ''}`}>
      {label}
    </kbd>
  );
}
