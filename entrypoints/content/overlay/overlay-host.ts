/** Mounts LunaV's isolated React feedback overlay in the current page. */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from './Overlay';
import overlayStyles from './overlay.css?inline';
import type { VideoFeedback } from '@/entrypoints/content/video/actions';

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
   * Mounts the React overlay inside an isolated shadow root on first use.
   *
   * @returns Nothing.
   */
  function ensureMounted(): void {
    if (root || !document.documentElement) return;

    host = document.createElement('div');
    host.dataset.lunaVOverlay = 'true';

    const shadowRoot = host.attachShadow({ mode: 'open' });
    const mountPoint = document.createElement('div');
    const styleSheet = new CSSStyleSheet();
    styleSheet.replaceSync(overlayStyles);
    shadowRoot.adoptedStyleSheets = [styleSheet];
    shadowRoot.append(mountPoint);
    moveOverlayHost();

    root = createRoot(mountPoint);
    document.addEventListener('fullscreenchange', moveOverlayHost);
  }

  return {
    show(feedback: VideoFeedback, seconds?: number): void {
      ensureMounted();
      if (!root) return;

      overlayKey += 1;
      root.render(createElement(Overlay, { ...feedback, key: overlayKey, seconds }));
    },
  };
}
