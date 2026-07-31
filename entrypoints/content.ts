/** Mounts LunaV's in-page video controls and isolated visual feedback. */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from './content/Overlay';
import overlayStyles from './content/overlay.css?inline';
import { getSiteAdapter } from './content/site-adapters';
import { getShortcut, isEditableTarget, type VideoAction } from './content/shortcut';
import {
  findTargetVideo,
  getToggledPlaybackFeedback,
  performVideoAction,
  type VideoFeedback,
} from './content/video';

const ACCUMULATION_WINDOW_MS = 1_000;

/** Stores the most recent seek action for short-window feedback accumulation. */
interface SeekAccumulation {
  /** The seek action that may continue accumulating. */
  action: VideoAction;
  /** The total seek distance currently displayed. */
  seconds: number;
  /** The time at which the latest matching key was pressed. */
  timestamp: number;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  globalName: false,
  main() {
    let root: ReturnType<typeof createRoot> | null = null;
    let overlayKey = 0;
    let latestSeek: SeekAccumulation | null = null;
    const handledShortcutCodes = new Set<string>();

    /**
     * Shows a fresh overlay instance and starts a distinct visual feedback animation.
     *
     * @param feedback - The shortcut feedback to present.
     * @param seconds - The accumulated seek distance to present when applicable.
     * @returns Nothing.
     */
    function showOverlay(feedback: VideoFeedback, seconds?: number): void {
      if (!root) return;

      overlayKey += 1;
      root.render(createElement(Overlay, { ...feedback, key: overlayKey, seconds }));
    }

    /**
     * Mounts the isolated React overlay after the document root is available.
     *
     * @returns Nothing.
     */
    function mountOverlay(): void {
      if (root || !document.documentElement) return;

      const host = document.createElement('div');
      host.dataset.lunaVOverlay = 'true';
      host.style.pointerEvents = 'none';

      const shadowRoot = host.attachShadow({ mode: 'open' });
      const mountPoint = document.createElement('div');
      const styleElement = document.createElement('style');
      styleElement.textContent = overlayStyles;
      shadowRoot.append(styleElement, mountPoint);
      document.documentElement.append(host);

      root = createRoot(mountPoint);
    }

    /**
     * Calculates the displayed distance for a seek repeated within the accumulation window.
     *
     * @param action - The newly performed seek action.
     * @param seconds - The action's base seek distance.
     * @returns The total seek distance to display.
     */
    function getAccumulatedSeconds(action: VideoAction, seconds: number): number {
      const now = Date.now();
      const previousSeek = latestSeek;
      const canAccumulate =
        previousSeek?.action === action && now - previousSeek.timestamp <= ACCUMULATION_WINDOW_MS;
      const totalSeconds = canAccumulate && previousSeek ? previousSeek.seconds + seconds : seconds;

      latestSeek = { action, seconds: totalSeconds, timestamp: now };
      return totalSeconds;
    }

    /**
     * Stops a handled shortcut event before the page can process it.
     *
     * @param event - The captured page keyboard event.
     * @returns Nothing.
     */
    function consumeShortcutEvent(event: KeyboardEvent): void {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    /**
     * Controls a selected native video for supported shortcuts outside editable controls.
     *
     * @param event - The captured page keyboard event.
     * @returns Nothing.
     */
    function handleShortcutKeyDown(event: KeyboardEvent): void {
      if (!root) return;
      if (isEditableTarget(event.target)) return;

      const shortcut = getShortcut(event);
      if (!shortcut) return;

      const siteAdapter = getSiteAdapter(window.location.hostname);
      const video = findTargetVideo();
      if (!video) return;

      if (shortcut.action === 'toggle-playback' && siteAdapter?.nativeSpaceFeedback) {
        showOverlay(getToggledPlaybackFeedback(video));
        return;
      }

      const feedback = performVideoAction(video, shortcut.action);
      const seconds = feedback.seconds
        ? getAccumulatedSeconds(shortcut.action, feedback.seconds)
        : undefined;
      if (!feedback.seconds) latestSeek = null;

      handledShortcutCodes.add(event.code);
      consumeShortcutEvent(event);
      showOverlay(feedback, seconds);
    }

    /**
     * Blocks compatibility events emitted after a LunaV-handled keydown.
     *
     * @param event - The captured page keyboard event.
     * @returns Nothing.
     */
    function blockHandledShortcutEvent(event: KeyboardEvent): void {
      if (!handledShortcutCodes.has(event.code)) return;

      consumeShortcutEvent(event);
      if (event.type === 'keyup') handledShortcutCodes.delete(event.code);
    }

    window.addEventListener('keydown', handleShortcutKeyDown, { capture: true });
    window.addEventListener('keypress', blockHandledShortcutEvent, { capture: true });
    window.addEventListener('keyup', blockHandledShortcutEvent, { capture: true });

    if (document.documentElement) mountOverlay();
    else document.addEventListener('DOMContentLoaded', mountOverlay, { once: true });
  },
});
