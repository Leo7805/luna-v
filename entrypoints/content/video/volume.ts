/** Performs native volume and mute operations for the selected video. */
import { VIDEO_CONTROL_CONFIG } from '../config';
import type { VolumeAction } from '../keyboard/shortcut';
import type { VideoFeedback } from './actions';

/** Remembers the last audible native volume for each video during the current page session. */
const lastAudibleVolumes = new WeakMap<HTMLVideoElement, number>();

/**
 * Formats a native volume value as a whole-number percentage.
 *
 * @param volume - The native volume value to format.
 * @returns The formatted percentage.
 */
function formatVolume(volume: number): string {
  return `${Math.round(volume * 100)}%`;
}

/**
 * Remembers a video's volume when it can produce audible output.
 *
 * @param video - The native video whose volume is recorded.
 * @returns Nothing.
 */
function rememberAudibleVolume(video: HTMLVideoElement): void {
  if (video.volume > VIDEO_CONTROL_CONFIG.volume.min) {
    lastAudibleVolumes.set(video, video.volume);
  }
}

/**
 * Determines whether a video is effectively silent to the user.
 *
 * @param video - The native video whose audio state is inspected.
 * @returns True when the video is muted or its volume is zero.
 */
function isEffectivelyMuted(video: HTMLVideoElement): boolean {
  return video.muted || video.volume <= VIDEO_CONTROL_CONFIG.volume.min;
}

/**
 * Restores a video's remembered audible volume, or the shared safe default.
 *
 * @param video - The native video whose audible volume is restored.
 * @returns The restored native volume.
 */
function restoreAudibleVolume(video: HTMLVideoElement): number {
  const restoredVolume =
    lastAudibleVolumes.get(video) ?? VIDEO_CONTROL_CONFIG.volume.defaultUnmuted;
  video.volume = restoredVolume;
  rememberAudibleVolume(video);
  return video.volume;
}

/**
 * Adjusts a video's native volume, restoring sound when it was muted.
 *
 * @param video - The native video whose volume changes.
 * @param direction - The signed adjustment direction.
 * @returns Feedback containing the resulting volume.
 */
function adjustVolume(video: HTMLVideoElement, direction: -1 | 1): VideoFeedback {
  const { min, max, step } = VIDEO_CONTROL_CONFIG.volume;
  const nextVolume = Math.min(max, Math.max(min, video.volume + direction * step));

  video.muted = false;
  video.volume = Number(nextVolume.toFixed(2));
  rememberAudibleVolume(video);

  return {
    icon: direction < 0 ? 'volume-down' : 'volume-up',
    label: `Volume ${formatVolume(video.volume)}`,
  };
}

/**
 * Performs a supported native volume operation and returns its overlay feedback.
 *
 * @param video - The selected native video.
 * @param action - The requested volume operation.
 * @returns Feedback for the resulting volume or mute state.
 */
export function performVolumeAction(video: HTMLVideoElement, action: VolumeAction): VideoFeedback {
  if (action === 'decrease-volume') return adjustVolume(video, -1);
  if (action === 'increase-volume') return adjustVolume(video, 1);

  if (isEffectivelyMuted(video)) {
    video.muted = false;
    const volume = video.volume > VIDEO_CONTROL_CONFIG.volume.min
      ? video.volume
      : restoreAudibleVolume(video);
    rememberAudibleVolume(video);
    return { icon: 'volume-up', label: `Volume ${formatVolume(volume)}` };
  }

  rememberAudibleVolume(video);
  video.muted = true;
  return { icon: 'volume-muted', label: 'Muted' };
}
