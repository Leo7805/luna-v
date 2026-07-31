/** Mounts LunaV's isolated React feedback overlay in the current page. */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from './Overlay';
import overlayStyles from './overlay.css?inline';
import type { VideoFeedback } from '../video/actions';

/** Presents transient video-control feedback above the current page. */
export interface OverlayPresenter {
  /** Displays one new feedback animation. */
  show: (feedback: VideoFeedback, seconds?: number) => void;
}

/**
 * Creates and schedules the isolated overlay host for the current page.
 *
 * @returns A presenter that displays feedback once the document root is available.
 */
export function createOverlayPresenter(): OverlayPresenter {
  let root: ReturnType<typeof createRoot> | null = null;
  let overlayKey = 0;

  /**
   * Mounts the React overlay inside an isolated shadow root.
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

  if (document.documentElement) mountOverlay();
  else document.addEventListener('DOMContentLoaded', mountOverlay, { once: true });

  return {
    show(feedback: VideoFeedback, seconds?: number): void {
      if (!root) return;

      overlayKey += 1;
      root.render(createElement(Overlay, { ...feedback, key: overlayKey, seconds }));
    },
  };
}
