/** Renders transient feedback icons and labels above video controls. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { VIDEO_CONTROL_CONFIG } from '@/entrypoints/content/config';
import type { OverlayIcon } from '@/entrypoints/content/video/actions';

type OverlayPhase = 'visible' | 'fading';

interface OverlayProps {
  /** The icon that illustrates the action. */
  icon: OverlayIcon;
  /** The short, localisable action description. */
  label: string;
  /** The accumulated seek distance shown for timeline operations. */
  seconds?: number;
  /** The target video element to center the overlay upon. */
  video?: HTMLVideoElement | null;
  /** Optional callback fired when the overlay completes its exit animation. */
  onDismiss?: () => void;
}

/**
 * Calculates the center coordinates of an active video element relative to the viewport.
 * Returns null if the target video is disconnected or has non-positive/non-finite dimensions.
 *
 * @param video - The target video element.
 * @returns Center X and Y coordinates in viewport CSS pixels, or null if geometry is invalid.
 */
function getVideoCenter(video?: HTMLVideoElement | null): { x: number; y: number } | null {
  if (!video) {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
  }

  if (!video.isConnected) {
    return null;
  }

  const rect = video.getBoundingClientRect();
  if (
    rect.width > 0 &&
    rect.height > 0 &&
    Number.isFinite(rect.left) &&
    Number.isFinite(rect.top) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height)
  ) {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  return null;
}

/**
 * Returns SVG path data for the supported overlay feedback icons.
 *
 * @param props - Icon identifier.
 * @returns The matching SVG path element.
 */
function PlaybackIcon({ name }: { name: OverlayIcon }) {
  if (name === 'play') {
    return <path d="m7 5 10 7-10 7V5Z" fill="currentColor" stroke="none" />;
  }

  if (name === 'pause') {
    return (
      <>
        <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
        <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
      </>
    );
  }

  if (name === 'volume-muted') {
    return (
      <path
        d="M11 5 6 9H2v6h4l5 4V5Zm6.5 4.5 4 4m0-4-4 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    );
  }

  if (name === 'volume-down') {
    return (
      <path
        d="M11 5 6 9H2v6h4l5 4V5Zm4.5 4a4.5 4.5 0 0 1 0 6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    );
  }

  if (name === 'volume-up') {
    return (
      <path
        d="M11 5 6 9H2v6h4l5 4V5Zm4.5 4a4.5 4.5 0 0 1 0 6m3-9a8.5 8.5 0 0 1 0 12"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    );
  }

  if (name === 'fast-forward') {
    return (
      <path
        d="m13 19 9-7-9-7v14ZM2 19l9-7-9-7v14Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    );
  }

  if (name === 'rewind') {
    return (
      <path
        d="m11 19-9-7 9-7v14Zm11 0-9-7 9-7v14Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    );
  }

  return (
    <path
      d="M12 2v4m0 12v4m-8-10H2m18 0h-2m-1.93-6.07-2.83 2.83m-6.48 6.48-2.83 2.83m0-12.14 2.83 2.83m6.48 6.48 2.83 2.83"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  );
}

/** Formats seek distance for human-friendly feedback. */
function formatSeconds(seconds: number): string {
  const rounded = Math.round(seconds * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

/**
 * Displays transient, centered playback feedback animations.
 * Tracks the target video's bounding rectangle in real-time while active.
 *
 * @param props - Overlay configuration.
 * @returns The overlay element while its animation is active.
 */
export function Overlay({ icon, label, seconds, video, onDismiss }: OverlayProps) {
  const [phase, setPhase] = useState<OverlayPhase>('visible');
  const [isMounted, setIsMounted] = useState(true);
  const pillRef = useRef<HTMLDivElement>(null);
  const dismissedRef = useRef(false);

  // Case 1: No target video supplied -> viewport-centered and visible
  // Case 2: Valid target video supplied -> video-centered and visible
  // Case 3: Target video supplied but invalid (disconnected or zero-sized) -> hidden, not viewport-centered
  const initialCenter = getVideoCenter(video);
  const isInitiallyVisible = initialCenter !== null;
  const initialPos = initialCenter ?? { x: 0, y: 0 };

  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setIsMounted(false);
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (video && !video.isConnected) {
      handleDismiss();
      return;
    }

    const fadeTimer = window.setTimeout(
      () => setPhase('fading'),
      VIDEO_CONTROL_CONFIG.feedback.displayDurationMs,
    );
    const removeTimer = window.setTimeout(
      handleDismiss,
      VIDEO_CONTROL_CONFIG.feedback.displayDurationMs + VIDEO_CONTROL_CONFIG.feedback.fadeDurationMs,
    );

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [video, handleDismiss]);

  useEffect(() => {
    if (!isMounted) return;

    let rafId: number | null = null;
    let lastX = initialCenter?.x ?? -1;
    let lastY = initialCenter?.y ?? -1;

    function updatePosition(): boolean {
      const pill = pillRef.current;
      if (!pill) return false;

      if (video) {
        if (!video.isConnected) {
          handleDismiss();
          return false;
        }

        const center = getVideoCenter(video);
        if (!center) {
          // Target video temporarily has zero dimensions: hide without moving to viewport center
          pill.style.visibility = 'hidden';
          return true; // Keep RAF tracking active during feedback lifetime
        }

        pill.style.visibility = 'visible';
        if (Math.abs(center.x - lastX) > 0.1 || Math.abs(center.y - lastY) > 0.1) {
          lastX = center.x;
          lastY = center.y;
          pill.style.left = `${center.x}px`;
          pill.style.top = `${center.y}px`;
        }
        return true;
      }

      // No target video supplied: viewport center
      const center = getVideoCenter();
      if (center) {
        pill.style.visibility = 'visible';
        if (Math.abs(center.x - lastX) > 0.1 || Math.abs(center.y - lastY) > 0.1) {
          lastX = center.x;
          lastY = center.y;
          pill.style.left = `${center.x}px`;
          pill.style.top = `${center.y}px`;
        }
      }

      return true;
    }

    // Apply immediate positioning synchronously before first paint
    if (!updatePosition()) {
      return;
    }

    function loop() {
      if (updatePosition()) {
        rafId = requestAnimationFrame(loop);
      } else {
        rafId = null;
      }
    }

    rafId = requestAnimationFrame(loop);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }, [video, isMounted, handleDismiss, initialCenter]);

  if (!isMounted) return null;

  const phaseClass =
    phase === 'visible'
      ? 'translate-x-0 translate-y-0 scale-100 opacity-100 duration-150'
      : 'translate-x-0 translate-y-[.2em] scale-[.98] opacity-0 duration-400';

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[2147483647] overflow-visible"
      aria-live="polite"
    >
      <div
        ref={pillRef}
        style={{
          position: 'fixed',
          left: `${initialPos.x}px`,
          top: `${initialPos.y}px`,
          visibility: isInitiallyVisible ? 'visible' : 'hidden',
          transform: 'translate(-50%, -50%)',
        }}
        className={`grid grid-cols-[1.2em_auto_1.2em] items-center gap-[.4em] rounded-[.6em] border border-cyan-300/30 bg-slate-950/85 px-[1em] py-[.6em] text-[1.25em] font-semibold leading-tight text-cyan-200 shadow-lg shadow-cyan-950/40 transition ease-out ${phaseClass}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.2em] shrink-0 justify-self-center">
          <PlaybackIcon name={icon} />
        </svg>
        <span className="text-center tabular-nums whitespace-nowrap">
          {seconds ? `${formatSeconds(seconds)}s` : label}
        </span>
        <span aria-hidden="true" className="size-[1.2em] shrink-0" />
      </div>
    </div>
  );
}
