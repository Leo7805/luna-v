/** Adjusts native and site-specific video playback speeds. */
import { VIDEO_CONTROL_CONFIG } from '@/entrypoints/content/config';
import { getSiteAdapter } from './site-adapters';
import type { PlaybackRateAction } from '@/entrypoints/content/keyboard/shortcut';
import type { VideoFeedback } from './actions';

const PLAYBACK_RATE_EPSILON = 0.001;
const MAX_SITE_RATE_ADJUSTMENTS = 40;

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
 * Gets the playback speed that one supported action would produce.
 *
 * @param video - The native video whose playback speed is read.
 * @param action - The requested playback-speed action.
 * @returns The target playback speed.
 */
function getPlaybackRateTarget(video: HTMLVideoElement, action: PlaybackRateAction): number {
  if (action === 'reset-playback-rate') {
    const { default: defaultRate, max } = VIDEO_CONTROL_CONFIG.playbackRate;
    return Math.abs(video.playbackRate - defaultRate) <= PLAYBACK_RATE_EPSILON
      ? max
      : defaultRate;
  }

  const direction = action === 'increase-playback-rate' ? 1 : -1;
  return getNativePlaybackRateTarget(video, direction);
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
  const siteAdapter = getSiteAdapter(window.location.hostname);
  let playbackRate: number | null;

  if (action === 'reset-playback-rate') {
    const { default: defaultRate, max } = VIDEO_CONTROL_CONFIG.playbackRate;
    const siteMaximum = Math.min(max, siteAdapter?.maxPlaybackRate ?? max);
    playbackRate =
      Math.abs(video.playbackRate - defaultRate) <= PLAYBACK_RATE_EPSILON
        ? siteMaximum
        : defaultRate;
  } else {
    playbackRate = siteAdapter?.getPlaybackRateTarget
      ? siteAdapter.getPlaybackRateTarget(action === 'increase-playback-rate' ? 1 : -1)
      : getPlaybackRateTarget(video, action);
  }

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
  const siteAdapter = getSiteAdapter(window.location.hostname);

  if (action === 'reset-playback-rate') {
    const { default: defaultRate, max } = VIDEO_CONTROL_CONFIG.playbackRate;
    const targetRate =
      Math.abs(video.playbackRate - defaultRate) <= PLAYBACK_RATE_EPSILON
        ? Math.min(max, siteAdapter?.maxPlaybackRate ?? max)
        : defaultRate;

    if (siteAdapter?.adjustPlaybackRate) {
      let currentRate = video.playbackRate;
      for (let attempts = 0; attempts < MAX_SITE_RATE_ADJUSTMENTS; attempts++) {
        if (Math.abs(currentRate - targetRate) <= PLAYBACK_RATE_EPSILON) break;
        const direction: -1 | 1 = currentRate < targetRate ? 1 : -1;
        const adjustedRate = await siteAdapter.adjustPlaybackRate(direction);
        if (adjustedRate === null || Math.abs(adjustedRate - currentRate) <= PLAYBACK_RATE_EPSILON) {
          break;
        }
        currentRate = adjustedRate;
      }
      return { icon: 'speed', label: `Speed ${formatPlaybackRate(currentRate)}` };
    }

    video.playbackRate = targetRate;
    return { icon: 'speed', label: `Speed ${formatPlaybackRate(video.playbackRate)}` };
  }

  if (siteAdapter?.adjustPlaybackRate) {
    const playbackRate = await siteAdapter.adjustPlaybackRate(
      action === 'increase-playback-rate' ? 1 : -1,
    );
    return playbackRate === null
      ? null
      : { icon: 'speed', label: `Speed ${formatPlaybackRate(playbackRate)}` };
  }

  return adjustNativePlaybackRate(video, action === 'increase-playback-rate' ? 1 : -1);
}
