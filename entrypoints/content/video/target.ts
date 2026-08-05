/** Selects the deliberate native video target for LunaV controls. */
import { findSiteVideoTarget } from '@/entrypoints/content/video/site-adapters';

/**
 * Determines whether a video is visible enough to be a generic interaction target.
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
 * Determines whether an element's bounding rect intersects the viewport at all.
 *
 * @param element - The element to inspect.
 * @returns True when any part of the element is inside the viewport.
 */
function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
}

/**
 * Calculates the squared distance from an element's centre to the viewport centre.
 *
 * @param element - The element whose centre distance is required.
 * @returns The squared distance in CSS pixels.
 */
function getViewportCenterDistanceSquared(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const vcx = window.innerWidth / 2;
  const vcy = window.innerHeight / 2;

  return (cx - vcx) ** 2 + (cy - vcy) ** 2;
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
 * Selects one native video by picking:
 *
 * 1. A site-adapter dedicated target.
 * 2. A focused visible video inside the viewport.
 * 3. The playing video closest to the viewport centre.
 * 4. The paused video closest to the viewport centre.
 * 5. The playing visible video closest to the viewport centre (when nothing's on-screen).
 * 6. The paused visible video closest to the viewport centre.
 * 7. The largest visible video (last-resort fallback).
 *
 * @returns The selected video, or null when no visible native video exists.
 */
export function findTargetVideo(): HTMLVideoElement | null {
  const siteVideo = findSiteVideoTarget(window.location.hostname);
  if (siteVideo) return siteVideo;

  const focusedElement = document.activeElement;
  if (
    focusedElement instanceof HTMLVideoElement &&
    isVisibleVideo(focusedElement) &&
    isInViewport(focusedElement)
  ) {
    return focusedElement;
  }

  const videos = [...document.querySelectorAll('video')].filter(isVisibleVideo);

  const inViewport = videos.filter((v) => isInViewport(v));
  const sourceCandidates = inViewport.length > 0 ? inViewport : videos;

  const playingInViewport = sourceCandidates.filter((v) => !v.paused);
  if (playingInViewport.length > 0) {
    return playingInViewport.sort(
      (a, b) => getViewportCenterDistanceSquared(a) - getViewportCenterDistanceSquared(b),
    )[0];
  }

  const pausedInViewport = sourceCandidates.filter((v) => v.paused);
  if (pausedInViewport.length > 0) {
    return pausedInViewport.sort(
      (a, b) => getViewportCenterDistanceSquared(a) - getViewportCenterDistanceSquared(b),
    )[0];
  }

  return videos.sort((a, b) => getVideoArea(b) - getVideoArea(a))[0] ?? null;
}
