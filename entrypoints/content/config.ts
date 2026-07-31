/** Centralizes adjustable defaults for LunaV's in-page video controls. */

/** Provides the default behavior values for keyboard controls and visual feedback. */
export const VIDEO_CONTROL_CONFIG = {
  feedback: {
    accumulationWindowMs: 1_000,
    displayDurationMs: 600,
    fadeDurationMs: 400,
  },
  seek: {
    nearSeconds: 5,
    farSeconds: 30,
  },
  playbackRate: {
    step: 0.25,
    min: 0.25,
    max: 3,
  },
} as const;
