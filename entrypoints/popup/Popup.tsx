/** Composes LunaV's keyboard shortcut reference popup. */
import { ShortcutItem } from './ShortcutItem';
import { POPUP_SHORTCUTS } from './shortcuts';

/**
 * Renders LunaV's complete popup interface.
 *
 * @returns The popup interface.
 */
export function Popup() {
  return (
    <main className="w-90 bg-slate-950 p-2 text-slate-100">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold tracking-widest text-violet-300">LunaV</h1>
          <p className="text-sm text-slate-400">Keyboard Video Controls</p>
        </div>

        <dl className="mt-4 space-y-2.5">
          {POPUP_SHORTCUTS.map((shortcut) => (
            <ShortcutItem key={shortcut.description} {...shortcut} />
          ))}
        </dl>
      </section>
    </main>
  );
}
