/** Composes LunaV's keyboard shortcut reference popup. */
import { useEffect, useState } from 'react';
import { DEFAULT_VIDEO_CONTROL_CONFIG } from '../content/config';
import { readSettings, subscribeSettings, type VideoControlSettings } from '../../utils/settings';
import { ShortcutItem } from './ShortcutItem';
import { getPopupShortcuts } from './shortcuts';

/**
 * Renders LunaV's complete popup interface.
 *
 * @returns The popup interface.
 */
export function Popup() {
  const [settings, setSettings] = useState<VideoControlSettings>(
    structuredClone(DEFAULT_VIDEO_CONTROL_CONFIG),
  );

  useEffect(() => {
    void readSettings().then(setSettings);
    return subscribeSettings(setSettings);
  }, []);

  /** Opens LunaV's dedicated extension settings page. */
  function openSettings(): void {
    void browser.runtime.openOptionsPage();
  }

  return (
    <main className="w-full bg-slate-950 p-2 text-slate-100">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-xl">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold tracking-widest text-violet-300">LunaV</h1>
          <p className="text-sm text-slate-400">Keyboard Video Controls</p>
        </div>

        <dl className="mt-3 space-y-1.5">
          {getPopupShortcuts(settings).map((shortcut) => (
            <ShortcutItem
              key={shortcut.groups.map((group) => group.description).join('-')}
              {...shortcut}
            />
          ))}
        </dl>
        <footer className="mt-3 border-t border-slate-800 pt-2">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-cyan-200"
            onClick={openSettings}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current stroke-2">
              <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2m9-9h-2M5 12H3m15.36-6.36-1.42 1.42M7.06 16.94l-1.42 1.42m12.72 0-1.42-1.42M7.06 7.06 5.64 5.64" />
            </svg>
            Settings
          </button>
        </footer>
      </section>
    </main>
  );
}
