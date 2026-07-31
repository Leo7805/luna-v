/** Mounts LunaV's isolated in-page user interface. */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from './content/Overlay';
import overlayStyles from './content/overlay.css?inline';
import { getShortcut, isEditableTarget, type VideoAction } from './content/shortcut';
import { findTargetVideo, performVideoAction, type VideoFeedback } from './content/video';

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
  main() {
    const host = document.createElement('div');
    host.dataset.lunaVOverlay = 'true';
    host.style.pointerEvents = 'none';

    const shadowRoot = host.attachShadow({ mode: 'open' });
    const mountPoint = document.createElement('div');
    const styleElement = document.createElement('style');
    styleElement.textContent = overlayStyles;
    shadowRoot.append(styleElement, mountPoint);
    document.documentElement.append(host);

    const root = createRoot(mountPoint);
    let overlayKey = 0;
    let latestSeek: SeekAccumulation | null = null;

    /**
     * Shows a fresh overlay instance and starts a distinct visual feedback animation.
     *
     * @param feedback - The shortcut feedback to present.
     * @param seconds - The accumulated seek distance to present when applicable.
     * @returns Nothing.
     */
    function showOverlay(feedback: VideoFeedback, seconds?: number): void {
      overlayKey += 1;
      root.render(createElement(Overlay, { ...feedback, key: overlayKey, seconds }));
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
     * Controls a selected native video for supported shortcuts outside editable controls.
     *
     * @param event - The captured page keyboard event.
     * @returns Nothing.
     */
    function handleKeyDown(event: KeyboardEvent): void {
      if (isEditableTarget(event.target)) return;

      const shortcut = getShortcut(event);
      if (!shortcut) return;

      const video = findTargetVideo();
      if (!video) return;

      const feedback = performVideoAction(video, shortcut.action);
      const seconds = feedback.seconds
        ? getAccumulatedSeconds(shortcut.action, feedback.seconds)
        : undefined;
      if (!feedback.seconds) latestSeek = null;

      event.preventDefault();
      showOverlay(feedback, seconds);
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true });
  },
});
