/** Renders one keyboard shortcut and its description in LunaV's popup. */
import { ShortcutKey } from './ShortcutKey';

/** Props for one keyboard shortcut row. */
interface ShortcutItemProps {
  /** The keyboard labels that activate the shortcut. */
  keys: readonly string[];
  /** The user-facing description of the shortcut. */
  description: string;
}

/**
 * Renders a compact shortcut row with its keys before the description.
 *
 * @param props - The shortcut row configuration.
 * @returns The shortcut row definition elements.
 */
export function ShortcutItem({ keys, description }: ShortcutItemProps) {
  return (
    <div className="flex items-center gap-3">
      <dt className="flex gap-1">
        {keys.map((key) => (
          <ShortcutKey key={key} label={key} />
        ))}
      </dt>
      <dd className="text-sm text-slate-300">{description}</dd>
    </div>
  );
}
