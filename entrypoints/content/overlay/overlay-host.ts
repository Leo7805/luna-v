/** Mounts LunaV's isolated React feedback overlay in the current page. */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from './Overlay';
import overlayStyles from './overlay.css?inline';
import type { VideoFeedback } from '@/entrypoints/content/video/actions';

/** Presents transient video-control feedback above the current page. */
export interface OverlayPresenter {
  /**
   * Displays one new feedback animation centered on the active video element.
   *
   * @param feedback - The feedback payload to render.
   * @param seconds - Optional accumulated seek distance in seconds.
   * @param target - The active video element to center the overlay upon.
   */
  show: (feedback: VideoFeedback, seconds?: number, target?: HTMLVideoElement | null) => void;
  /** Removes any currently visible feedback without mounting a new host. */
  hide: () => void;
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
   * Promotes the host into the browser's top layer via the Popover API, or falls back to safe DOM placement.
   *
   * @returns Nothing.
   */
  function ensureTopLayer(): void {
    if (!host) return;

    if (typeof host.showPopover === 'function') {
      try {
        if (host.matches(':popover-open')) {
          host.hidePopover();
        }
        host.showPopover();
        return;
      } catch {
        // Fall through to container positioning if popover throws
      }
    }

    moveOverlayHostFallback();
  }

  /**
   * Moves the overlay into the current fullscreen subtree when one is active and safe.
   *
   * @returns Nothing.
   */
  function moveOverlayHostFallback(): void {
    if (!host || !document.documentElement) return;

    const fullscreenEl = document.fullscreenElement;
    const isReplaced =
      fullscreenEl instanceof HTMLVideoElement ||
      fullscreenEl instanceof HTMLIFrameElement ||
      fullscreenEl instanceof HTMLImageElement;
    const container = (fullscreenEl && !isReplaced ? fullscreenEl : null) ?? document.documentElement;
    if (host.parentElement !== container) container.append(host);
  }

  /**
   * Refreshes the overlay's top-layer position when the page enters or exits fullscreen.
   *
   * @returns Nothing.
   */
  function handleFullscreenChange(): void {
    if (!host) return;

    if (typeof host.showPopover === 'function') {
      if (host.matches(':popover-open')) {
        ensureTopLayer();
      }
    } else {
      moveOverlayHostFallback();
    }
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
    host.setAttribute('popover', 'manual');
    host.style.border = 'none';
    host.style.background = 'transparent';
    host.style.padding = '0';
    host.style.margin = '0';
    host.style.inset = '0';
    host.style.width = '100vw';
    host.style.height = '100vh';
    host.style.maxWidth = 'none';
    host.style.maxHeight = 'none';
    host.style.pointerEvents = 'none';
    host.style.overflow = 'visible';

    document.documentElement.append(host);

    const shadowRoot = host.attachShadow({ mode: 'open' });
    const mountPoint = document.createElement('div');
    const styleSheet = new CSSStyleSheet();
    styleSheet.replaceSync(overlayStyles);
    shadowRoot.adoptedStyleSheets = [styleSheet];
    shadowRoot.append(mountPoint);

    root = createRoot(mountPoint);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
  }

  return {
    show(feedback: VideoFeedback, seconds?: number, target?: HTMLVideoElement | null): void {
      ensureMounted();
      if (!root) return;

      ensureTopLayer();
      overlayKey += 1;
      const thisKey = overlayKey;
      let isDismissed = false;

      root.render(
        createElement(Overlay, {
          ...feedback,
          key: thisKey,
          seconds,
          video: target,
          onDismiss: () => {
            if (isDismissed || thisKey !== overlayKey) return;
            isDismissed = true;
            try {
              if (host?.matches(':popover-open')) {
                host.hidePopover();
              }
            } catch {
              // Gracefully ignore popover hide errors
            }
          },
        }),
      );
    },
    hide(): void {
      overlayKey += 1; // Invalidate any pending dismissal from the previous overlay instance
      root?.render(null);
      try {
        if (host?.matches(':popover-open')) {
          host.hidePopover();
        }
      } catch {
        // Gracefully ignore popover hide errors
      }
    },
  };
}
