/** Displays a short-lived, isolated status message above the current page. */
import { useEffect, useState } from 'react';
import { VIDEO_CONTROL_CONFIG } from './config';
import type { OverlayIcon } from './video';

/** Represents one stage of the overlay's visibility animation. */
type OverlayPhase = 'visible' | 'leaving';

/**
 * Props for the temporary in-page status overlay.
 */
interface OverlayProps {
  /** The symbol that communicates the completed operation. */
  icon: OverlayIcon;
  /** The accessible operation description. */
  label: string;
  /** The accumulated seek distance shown for timeline operations. */
  seconds?: number;
}

/**
 * Renders a compact, modern playback operation icon.
 *
 * @param props - Icon configuration.
 * @returns The matching SVG icon.
 */
function PlaybackIcon({ name }: { name: OverlayIcon }) {
  if (name === 'play') {
    return <path d="m9 5 10 7-10 7V5Z" fill="currentColor" stroke="none" />;
  }

  if (name === 'pause') {
    return <path d="M8 5h3v14H8zm5 0h3v14h-3z" fill="currentColor" stroke="none" />;
  }

  if (name === 'speed') {
    return (
      <path
        d="M4 16a8 8 0 1 1 16 0h-2a6 6 0 1 0-12 0H4Zm7-5h2v5h-2zm2.4-3.6 1.4-1.4 1.2 1.2-1.4 1.4zM10 6H8V4h2v2Z"
        fill="currentColor"
        stroke="none"
      />
    );
  }

  const isRewind = name === 'rewind';
  return (
    <path
      d={isRewind ? 'm11 5-7 7 7 7V5Zm9 0-7 7 7 7V5Z' : 'm13 5 7 7-7 7V5Zm-9 0 7 7-7 7V5Z'}
      fill="currentColor"
      stroke="none"
    />
  );
}

/**
 * Renders a feedback item that enters distinctly, remains visible, and then fades away.
 *
 * @param props - Overlay configuration.
 * @returns The overlay element while its animation is active.
 */
export function Overlay({ icon, label, seconds }: OverlayProps) {
  const [phase, setPhase] = useState<OverlayPhase>('visible');
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    const fadeTimer = window.setTimeout(
      () => setPhase('leaving'),
      VIDEO_CONTROL_CONFIG.feedback.displayDurationMs,
    );
    const removeTimer = window.setTimeout(
      () => setIsMounted(false),
      VIDEO_CONTROL_CONFIG.feedback.displayDurationMs + VIDEO_CONTROL_CONFIG.feedback.fadeDurationMs,
    );

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!isMounted) return null;

  const phaseClass =
    phase === 'visible'
      ? 'translate-y-0 scale-100 opacity-100 duration-150'
      : 'translate-y-[.2em] scale-[.98] opacity-0 duration-400';

  return (
    <div
      className="pointer-events-none fixed top-[45%] left-1/2 z-2147483647 flex w-[min(20em,calc(100vw-2em))] -translate-x-1/2 -translate-y-1/2 justify-center"
      aria-label={label}
      aria-live="polite"
    >
      <div
        className={`flex items-center gap-[.4em] rounded-[.6em] border border-cyan-300/30 bg-slate-950/85 px-[1em] py-[.6em] text-center text-[1.25em] font-semibold leading-tight text-cyan-200 shadow-lg shadow-cyan-950/40 transition ease-out ${phaseClass}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.2em] shrink-0">
          <PlaybackIcon name={icon} />
        </svg>
        <span>{seconds ? `${seconds}s` : label}</span>
      </div>
    </div>
  );
}
