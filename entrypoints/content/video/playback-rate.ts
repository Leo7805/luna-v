/** Adjusts native and site-specific video playback speeds. */
import { VIDEO_CONTROL_CONFIG } from '../config';
import { getSiteAdapter } from './site-adapters';
import type { PlaybackRateAction } from '../keyboard/shortcut';
import type { VideoFeedback } from './actions';

/**
 * Formats a playback rate without unnecessary trailing zeroes.
 *
 * @param playbackRate - The rate to format.
 * @returns The formatted multiplier.
 */
function formatPlaybackRate(playbackRate: number): string {
  return `${Number(playbackRate.toFixed(2))}×`;
}

/**
 * Calculates the native playback speed that one direction would produce.
 *
 * @param video - The native video whose playback speed is read.
 * @param direction - The requested lower or higher speed direction.
 * @returns The bounded target playback speed.
 */
function getNativePlaybackRateTarget(video: HTMLVideoElement, direction: -1 | 1): number {
  const { min, max, step } = VIDEO_CONTROL_CONFIG.playbackRate;
  return Math.min(max, Math.max(min, video.playbackRate + direction * step));
}

/**
 * Adjusts a video's playback rate within LunaV's configured bounds.
 *
 * @param video - The native video whose playback rate changes.
 * @param direction - The signed direction of the rate change.
 * @returns Feedback containing the actual resulting playback rate.
 */
function adjustNativePlaybackRate(video: HTMLVideoElement, direction: -1 | 1): VideoFeedback {
  const nextRate = getNativePlaybackRateTarget(video, direction);
  video.playbackRate = nextRate;

  return { icon: 'speed', label: `Speed ${formatPlaybackRate(video.playbackRate)}` };
}

/**
 * Creates immediate feedback for a requested playback-speed adjustment without changing video state.
 *
 * @param video - The selected native video.
 * @param action - The requested playback-speed action.
 * @returns Feedback for the expected speed, or null when a site cannot adjust safely.
 */
export function getPlaybackRateFeedback(
  video: HTMLVideoElement,
  action: PlaybackRateAction,
): VideoFeedback | null {
  const direction = action === 'increase-playback-rate' ? 1 : -1;
  const siteAdapter = getSiteAdapter(window.location.hostname);
  const playbackRate = siteAdapter?.getPlaybackRateTarget
    ? siteAdapter.getPlaybackRateTarget(direction)
    : getNativePlaybackRateTarget(video, direction);

  return playbackRate === null
    ? null
    : { icon: 'speed', label: `Speed ${formatPlaybackRate(playbackRate)}` };
}

/**
 * Adjusts playback speed through a dedicated site adapter or the native video element.
 *
 * @param video - The selected native video.
 * @param action - The requested playback-speed action.
 * @returns Feedback for the resulting speed, or null when a site adapter cannot adjust safely.
 */
export async function performPlaybackRateAction(
  video: HTMLVideoElement,
  action: PlaybackRateAction,
): Promise<VideoFeedback | null> {
  const direction = action === 'increase-playback-rate' ? 1 : -1;
  const siteAdapter = getSiteAdapter(window.location.hostname);

  if (siteAdapter?.adjustPlaybackRate) {
    const playbackRate = await siteAdapter.adjustPlaybackRate(direction);
    return playbackRate === null
      ? null
      : { icon: 'speed', label: `Speed ${formatPlaybackRate(playbackRate)}` };
  }

  return adjustNativePlaybackRate(video, direction);
}
