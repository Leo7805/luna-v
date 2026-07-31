/** Selects and controls one eligible native video element on the current page. */
import { VIDEO_CONTROL_CONFIG } from './config';
import type { VideoAction } from './shortcut';
import { findSiteVideoTarget } from './site-adapters';

/** Identifies the visual symbol used for one overlay feedback item. */
export type OverlayIcon = 'rewind' | 'fast-forward' | 'play' | 'pause';

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
  }
}
