/** Defines and persists LunaV's configurable video-control settings. */
import { DEFAULT_VIDEO_CONTROL_CONFIG } from '../entrypoints/content/config';

export interface VideoControlSettings {
  feedback: { accumulationWindowMs: number; displayDurationMs: number; fadeDurationMs: number };
  seek: { fineSeconds: number; nearSeconds: number; farSeconds: number };
  playbackRate: { default: number; step: number; min: number; max: number };
  volume: { step: number; min: number; max: number; defaultUnmuted: number };
}

export const SETTINGS_KEY = 'lunaV:settings';

type SeekDurationKey = keyof VideoControlSettings['seek'];

const SEEK_DURATION_LIMITS: Readonly<Record<SeekDurationKey, { label: string; min: number; max: number }>> = {
  fineSeconds: { label: 'Fine seek', min: 0.1, max: 5 },
  nearSeconds: { label: 'Medium seek', min: 1, max: 60 },
  farSeconds: { label: 'Large seek', min: 5, max: 300 },
};

/** Rounds a finite numeric setting to two decimal places. */
export function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Formats a numeric setting with at most two decimal places and no trailing zeroes. */
export function formatCompactNumber(value: number): string {
  return roundToTwoDecimals(value).toFixed(2).replace(/\.?0+$/, '');
}

/** Validates one editable playback-speed step against LunaV's supported range. */
export function getPlaybackRateStepValidationError(step: number): string | null {
  if (!Number.isFinite(step) || step < 0.05 || step > 1) {
    return 'Step must be between 0.05 and 1.';
  }
  return null;
}

/** Validates editable playback-speed range values against LunaV's supported range. */
export function getPlaybackRateRangeValidationError(
  playbackRate: VideoControlSettings['playbackRate'],
): string | null {
  const { default: defaultRate, max, min } = playbackRate;
  if (!Number.isFinite(min) || min < 0.1 || min > 10) {
    return 'Minimum speed must be between 0.1 and 10.';
  }
  if (!Number.isFinite(max) || max < 0.1 || max > 10) {
    return 'Maximum speed must be between 0.1 and 10.';
  }
  if (min >= max) return 'Minimum speed must be less than maximum speed.';
  if (defaultRate < min || defaultRate > max) return 'Range must include the default speed of 1×.';
  return null;
}

/** Validates the editable playback-rate values against LunaV's supported range. */
export function getPlaybackRateValidationError(
  playbackRate: VideoControlSettings['playbackRate'],
): string | null {
  return (
    getPlaybackRateStepValidationError(playbackRate.step) ??
    getPlaybackRateRangeValidationError(playbackRate)
  );
}

/** Validates one editable volume step against the native video volume range. */
export function getVolumeStepValidationError(step: number): string | null {
  if (!Number.isFinite(step) || step <= 0 || step > 1) {
    return 'Volume step must be greater than 0 and no more than 1.';
  }
  return null;
}

/** Validates one editable seek duration against its supported range. */
export function getSeekDurationValidationError(
  key: SeekDurationKey,
  seconds: number,
): string | null {
  const { label, max, min } = SEEK_DURATION_LIMITS[key];
  if (!Number.isFinite(seconds) || seconds < min || seconds > max) {
    return `${label} must be between ${min} and ${max} seconds.`;
  }
  return null;
}

/** Validates all seek durations, including their increasing fine-to-large order. */
export function getSeekValidationError(seek: VideoControlSettings['seek']): string | null {
  for (const key of Object.keys(SEEK_DURATION_LIMITS) as SeekDurationKey[]) {
    const error = getSeekDurationValidationError(key, seek[key]);
    if (error) return error;
  }
  if (seek.fineSeconds >= seek.nearSeconds) return 'Medium seek must be greater than Fine seek.';
  if (seek.nearSeconds >= seek.farSeconds) return 'Large seek must be greater than Medium seek.';
  return null;
}

/** Validates persisted values and falls back to defaults when invalid. */
export function normalizeSettings(value: unknown): VideoControlSettings {
  const next = structuredClone(DEFAULT_VIDEO_CONTROL_CONFIG);
  if (!value || typeof value !== 'object') return next;
  for (const section of Object.keys(next) as (keyof VideoControlSettings)[]) {
    const source = (value as Record<string, unknown>)[section];
    if (!source || typeof source !== 'object') continue;
    for (const key of Object.keys(next[section]) as string[]) {
      const number = (source as Record<string, unknown>)[key];
      if (typeof number === 'number' && Number.isFinite(number)) {
        (next[section] as Record<string, number>)[key] = number;
      }
    }
  }
  next.playbackRate.step = roundToTwoDecimals(next.playbackRate.step);
  next.playbackRate.min = roundToTwoDecimals(next.playbackRate.min);
  next.playbackRate.max = roundToTwoDecimals(next.playbackRate.max);
  next.volume.step = roundToTwoDecimals(next.volume.step);
  if (getPlaybackRateValidationError(next.playbackRate)) return structuredClone(DEFAULT_VIDEO_CONTROL_CONFIG);
  if (next.volume.min < 0 || next.volume.max > 1 || getVolumeStepValidationError(next.volume.step) || next.volume.min > next.volume.defaultUnmuted || next.volume.defaultUnmuted > next.volume.max) return structuredClone(DEFAULT_VIDEO_CONTROL_CONFIG);
  if (getSeekValidationError(next.seek) || Object.values(next.feedback).some((n) => n <= 0)) return structuredClone(DEFAULT_VIDEO_CONTROL_CONFIG);
  return next;
}

/** Reads saved settings. */
export async function readSettings(): Promise<VideoControlSettings> {
  return normalizeSettings((await browser.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY]);
}

/** Writes validated settings. */
export async function writeSettings(settings: VideoControlSettings): Promise<void> {
  await browser.storage.local.set({ [SETTINGS_KEY]: normalizeSettings(settings) });
}

/** Watches settings changes. */
export function subscribeSettings(listener: (settings: VideoControlSettings) => void): () => void {
  const handle = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && changes[SETTINGS_KEY]) listener(normalizeSettings(changes[SETTINGS_KEY].newValue));
  };
  browser.storage.onChanged.addListener(handle);
  return () => browser.storage.onChanged.removeListener(handle);
}
