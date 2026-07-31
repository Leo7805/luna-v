/** Displays a short-lived, isolated status message above the current page. */
import { useEffect, useState } from 'react';

const DISPLAY_DURATION_MS = 2_000;
const FADE_DURATION_MS = 400;

/**
 * Props for the temporary in-page status overlay.
 */
interface OverlayProps {
  /** The short status message presented to the user. */
  message: string;
}

/**
 * Renders a message that remains visible briefly and then fades away.
 *
 * @param props - Overlay configuration.
 * @returns The overlay element while its animation is active.
 */
export function Overlay({ message }: OverlayProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setIsVisible(false), DISPLAY_DURATION_MS);
    const removeTimer = window.setTimeout(
      () => setIsMounted(false),
      DISPLAY_DURATION_MS + FADE_DURATION_MS,
    );

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!isMounted) return null;

  return (
    <div
      className="pointer-events-none fixed top-[45%] left-1/2 z-2147483647 flex w-[min(320px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 justify-center"
      aria-live="polite"
    >
      <div
        className={`rounded-xl border border-cyan-300/30 bg-slate-950/85 px-5 py-3 text-center text-xl font-semibold leading-tight text-cyan-200 shadow-lg shadow-cyan-950/40 transition duration-400 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-1 scale-[.98] opacity-0'}`}
      >
        {message}
      </div>
    </div>
  );
}
