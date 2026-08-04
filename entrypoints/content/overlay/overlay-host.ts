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
  let host: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;
  let overlayKey = 0;

  /**
   * Moves the overlay into the current fullscreen subtree when one is active.
   *
   * @returns Nothing.
   */
  function moveOverlayHost(): void {
    if (!host || !document.documentElement) return;

    const container = document.fullscreenElement ?? document.documentElement;
    if (host.parentElement !== container) container.append(host);
  }

  /**
   * Mounts the React overlay inside an isolated shadow root.
   *
   * @returns Nothing.
   */
  function mountOverlay(): void {
    if (root || !document.documentElement) return;

    host = document.createElement('div');
    host.dataset.lunaVOverlay = 'true';
    host.style.pointerEvents = 'none';

    const shadowRoot = host.attachShadow({ mode: 'open' });
    const mountPoint = document.createElement('div');
    const styleElement = document.createElement('style');
    styleElement.textContent = overlayStyles;
    shadowRoot.append(styleElement, mountPoint);
    moveOverlayHost();

    root = createRoot(mountPoint);
    document.addEventListener('fullscreenchange', moveOverlayHost);
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
