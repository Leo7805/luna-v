/** Selects Echo360's leader video as the dedicated player target. */

/**
 * Finds Echo360's primary media element instead of a synchronized follower video.
 *
 * @returns The leader video, or null when Echo360's expected element is absent.
 */
export function findEcho360Video(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>('video[data-test="leader"]');
}
