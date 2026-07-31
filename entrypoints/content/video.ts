/** Selects and controls one eligible native video element on the current page. */
import { VIDEO_CONTROL_CONFIG } from './config';
import type { PlaybackRateAction, VideoAction } from './shortcut';
import { findSiteVideoTarget, getSiteAdapter } from './site-adapters';

/** Identifies the visual symbol used for one overlay feedback item. */
export type OverlayIcon = 'rewind' | 'fast-forward' | 'play' | 'pause' | 'speed';

/** Describes the visual feedback produced by a completed video operation. */
export interface VideoFeedback {
  /** The symbol that communicates the operation direction. */
  icon: OverlayIcon;
  /** The accessible description of the completed operation. */
  label: string;
  /** The seek distance in seconds when the operation changes the timeline. */
  seconds?: number;
}

/**
 * Determines whether a video is visible enough to be an interaction target.
 *
 * @param video - The native video element to inspect.
 * @returns True when the video has a visible on-screen area.
 */
function isVisibleVideo(video: HTMLVideoElement): boolean {
  const bounds = video.getBoundingClientRect();
  const style = window.getComputedStyle(video);

  return (
    bounds.width > 0 &&
    bounds.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity) > 0
  );
}

/**
 * Calculates a video's rendered area for deterministic target selection.
 *
 * @param video - The video whose rendered area is required.
 * @returns The area in CSS pixels.
 */
function getVideoArea(video: HTMLVideoElement): number {
  const bounds = video.getBoundingClientRect();
  return bounds.width * bounds.height;
}

/**
 * Selects one visible native video, preferring a playing video and then the largest video.
 *
 * @returns The selected video, or null when no visible native video exists.
 */
export function findTargetVideo(): HTMLVideoElement | null {
  const siteVideo = findSiteVideoTarget(window.location.hostname);
  if (siteVideo && isVisibleVideo(siteVideo)) return siteVideo;

  const focusedElement = document.activeElement;
  if (focusedElement instanceof HTMLVideoElement && isVisibleVideo(focusedElement)) {
    return focusedElement;
  }

  const videos = [...document.querySelectorAll('video')].filter(isVisibleVideo);

  return videos.sort((left, right) => {
    const playbackDifference = Number(left.paused) - Number(right.paused);
    return playbackDifference || getVideoArea(right) - getVideoArea(left);
  })[0] ?? null;
}

/**
 * Creates feedback for the playback state that a native toggle is expected to produce.
 *
 * @param video - The native video whose current state determines the next state.
 * @returns Feedback for the expected playback state after the toggle.
 */
export function getToggledPlaybackFeedback(video: HTMLVideoElement): VideoFeedback {
  return video.paused ? { icon: 'play', label: 'Playing' } : { icon: 'pause', label: 'Paused' };
}

/**
 * Seeks one video by a signed duration while respecting finite media bounds.
 *
 * @param video - The video to seek.
 * @param seconds - The signed seek distance in seconds.
 * @returns Nothing.
 */
function seekVideo(video: HTMLVideoElement, seconds: number): void {
  const nextTime = Math.max(0, video.currentTime + seconds);
  video.currentTime = Number.isFinite(video.duration) ? Math.min(nextTime, video.duration) : nextTime;
}

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
function adjustPlaybackRate(video: HTMLVideoElement, direction: -1 | 1): VideoFeedback {
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

  return adjustPlaybackRate(video, direction);
}

/**
 * Performs a supported native video operation and returns its overlay feedback.
 *
 * @param video - The selected native video.
 * @param action - The requested native video operation.
 * @returns The visual feedback after initiating the operation.
 */
export function performVideoAction(video: HTMLVideoElement, action: VideoAction): VideoFeedback {
  switch (action) {
    case 'toggle-playback':
      if (video.paused) {
        void video.play().catch(() => undefined);
        return { icon: 'play', label: 'Playing' };
      }

      video.pause();
      return { icon: 'pause', label: 'Paused' };
    case 'seek-backward':
      seekVideo(video, -VIDEO_CONTROL_CONFIG.seek.nearSeconds);
      return {
        icon: 'rewind',
        label: `Back ${VIDEO_CONTROL_CONFIG.seek.nearSeconds} seconds`,
        seconds: VIDEO_CONTROL_CONFIG.seek.nearSeconds,
      };
    case 'seek-forward':
      seekVideo(video, VIDEO_CONTROL_CONFIG.seek.nearSeconds);
      return {
        icon: 'fast-forward',
        label: `Forward ${VIDEO_CONTROL_CONFIG.seek.nearSeconds} seconds`,
        seconds: VIDEO_CONTROL_CONFIG.seek.nearSeconds,
      };
    case 'seek-backward-far':
      seekVideo(video, -VIDEO_CONTROL_CONFIG.seek.farSeconds);
      return {
        icon: 'rewind',
        label: `Back ${VIDEO_CONTROL_CONFIG.seek.farSeconds} seconds`,
        seconds: VIDEO_CONTROL_CONFIG.seek.farSeconds,
      };
    case 'seek-forward-far':
      seekVideo(video, VIDEO_CONTROL_CONFIG.seek.farSeconds);
      return {
        icon: 'fast-forward',
        label: `Forward ${VIDEO_CONTROL_CONFIG.seek.farSeconds} seconds`,
        seconds: VIDEO_CONTROL_CONFIG.seek.farSeconds,
      };
    case 'decrease-playback-rate':
      return adjustPlaybackRate(video, -1);
    case 'increase-playback-rate':
      return adjustPlaybackRate(video, 1);
  }
}
