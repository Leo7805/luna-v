/** Keeps active user-configurable values for LunaV's in-page video controls. */
import type { VideoControlSettings } from '@/utils/settings';

/** Provides the default behavior values for keyboard controls and visual feedback. */
export const DEFAULT_VIDEO_CONTROL_CONFIG: VideoControlSettings = {
  enabled: true,
  feedback: { accumulationWindowMs: 1_000, displayDurationMs: 600, fadeDurationMs: 400 },
  seek: { fineSeconds: 1, nearSeconds: 5, farSeconds: 30 },
  playbackRate: { default: 1, step: 0.25, min: 0.25, max: 5 },
  volume: { step: 0.05, min: 0, max: 1, defaultUnmuted: 0.6 },
};

/** Represents the settings currently active in the page controller. */
export let VIDEO_CONTROL_CONFIG: VideoControlSettings = structuredClone(DEFAULT_VIDEO_CONTROL_CONFIG);

let hasReceivedSettings = false;
const configListeners = new Set<(settings: VideoControlSettings) => void>();

/** Determines whether persisted settings are ready and LunaV is enabled. */
export function isVideoControlEnabled(): boolean {
  return hasReceivedSettings && VIDEO_CONTROL_CONFIG.enabled;
}

/** Watches active page configuration changes. */
export function subscribeVideoControlConfig(
  listener: (settings: VideoControlSettings) => void,
): () => void {
  configListeners.add(listener);
  return () => configListeners.delete(listener);
}

/** Replaces active settings after a persisted preference change. */
export function setVideoControlConfig(settings: VideoControlSettings): void {
  VIDEO_CONTROL_CONFIG = settings;
  hasReceivedSettings = true;
  for (const listener of configListeners) listener(settings);
}
