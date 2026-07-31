/** Configures Echo360's dedicated leader video and native Space handling. */
import type { SiteAdapter } from './types';

/**
 * Finds Echo360's primary media element instead of a synchronized follower video.
 *
 * @returns The leader video, or null when Echo360's expected element is absent.
 */
function findEcho360Video(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>('video[data-test="leader"]');
}

/** Echo360 owns Space playback, so LunaV only reports its expected next state. */
export const echo360Adapter: SiteAdapter = {
  selectVideo: findEcho360Video,
  nativeSpaceFeedback: true,
};
