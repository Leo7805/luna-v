/** Renders one keyboard shortcut and its description in LunaV's popup. */
import { ShortcutKey } from './ShortcutKey';
import type { PopupShortcutGroup } from './shortcuts';

/** Props for one keyboard shortcut row. */
interface ShortcutItemProps {
  /** The keyboard-control groups displayed in the row. */
  groups: readonly PopupShortcutGroup[];
}

/**
 * Renders a compact shortcut row with its keys before the description.
 *
 * @param props - The shortcut row configuration.
 * @returns The shortcut row definition elements.
 */
export function ShortcutItem({ groups }: ShortcutItemProps) {
  return (
    <div className="grid grid-cols-2 items-center gap-x-4">
      {groups.map((group) => (
        <div
          key={group.description}
          className={`flex min-w-0 items-center gap-1.5 ${groups.length === 1 ? 'col-span-2' : ''}`}
        >
          <div className="flex shrink-0 gap-1">
            {group.keys.map((key) => (
              <ShortcutKey key={key} label={key} />
            ))}
          </div>
          <span className="min-w-0 whitespace-nowrap text-xs leading-tight text-slate-300">
            {group.description}
          </span>
        </div>
      ))}
    </div>
  );
}
