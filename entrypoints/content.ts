/** Mounts LunaV's isolated in-page user interface. */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from './content/Overlay';
import overlayStyles from './content/overlay.css?inline';
import { getShortcut, isEditableTarget } from './content/shortcut';
import { findTargetVideo, performVideoAction } from './content/video';

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

    /**
     * Shows a fresh overlay instance and restarts its fade-out timer.
     *
     * @param message - The shortcut feedback to present.
     * @returns Nothing.
     */
    function showOverlay(message: string): void {
      overlayKey += 1;
      root.render(createElement(Overlay, { key: overlayKey, message }));
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

      const message = performVideoAction(video, shortcut.action);
      event.preventDefault();
      showOverlay(message);
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true });
  },
});
