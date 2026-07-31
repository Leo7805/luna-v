/** Selects and controls one eligible native video element on the current page. */
import type { VideoAction } from './shortcut';
import { findSiteVideoTarget } from './site-adapters';

const NEAR_SEEK_SECONDS = 5;
const FAR_SEEK_SECONDS = 15;

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
 * @returns The feedback message after initiating the operation.
 */
export function performVideoAction(video: HTMLVideoElement, action: VideoAction): string {
  switch (action) {
    case 'toggle-playback':
      if (video.paused) {
        void video.play().catch(() => undefined);
        return 'Playing';
      }

      video.pause();
      return 'Paused';
    case 'seek-backward':
      seekVideo(video, -NEAR_SEEK_SECONDS);
      return 'Back 5 seconds';
    case 'seek-forward':
      seekVideo(video, NEAR_SEEK_SECONDS);
      return 'Forward 5 seconds';
    case 'seek-backward-far':
      seekVideo(video, -FAR_SEEK_SECONDS);
      return 'Back 15 seconds';
    case 'seek-forward-far':
      seekVideo(video, FAR_SEEK_SECONDS);
      return 'Forward 15 seconds';
  }
}
