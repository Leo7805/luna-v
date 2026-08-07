/**
 * Netflix site adapter — seeks through Netflix's Cadmium player instead
 * of setting {@link HTMLVideoElement.currentTime}, which triggers DRM errors.
 *
 * Cadmium reports and accepts elapsed playback time in milliseconds.
 */
import type { SiteAdapter } from './types';

const EDGE_SEEK_OFFSET_MS = 1_000;
const WATCH_CREDITS_BUTTON_SELECTOR = '[data-uia="watch-credits-seamless-button"]';

interface CadmiumTimecode {
  /** Identifies the playback landmark, such as Netflix's Post Play boundary. */
  type?: string;
  /** Elapsed playback time in milliseconds. */
  startOffsetMs?: number;
}

/** Describes the Cadmium methods LunaV uses. */
interface CadmiumPlayer {
  /** Gets elapsed playback time in milliseconds. */
  getCurrentTime: () => number;
  /** Gets total duration in milliseconds. */
  getDuration: () => number;
  /** Gets the current video's playback landmarks. */
  getTimeCodes: () => CadmiumTimecode[];
  /** Seeks to an elapsed playback time in milliseconds. */
  seek: (timeMs: number) => void;
}

/** Gets Netflix's current application state. */
function getNetflixState(): any | null {
  return (window as any).netflix?.appContext?.state?.playerApp?.getState() ?? null;
}

/** Gets the active Cadmium player from Netflix's Redux state. */
function getCadmiumPlayer(): CadmiumPlayer | null {
  const repository = getNetflixState()?.videoPlayer?.cadmiumPlayerRepository;
  const playerId = repository ? Object.keys(repository.playersById)[0] : undefined;
  return playerId ? repository.playersById[playerId] : null;
}

/**
 * Gets the video's Post Play boundary, falling back to its media duration.
 *
 * @param player - The active Cadmium player.
 * @param durationMs - The media duration in milliseconds.
 * @returns The ending boundary in elapsed milliseconds.
 */
function getEndingBoundaryMs(player: CadmiumPlayer, durationMs: number): number {
  const endingTimecode = player
    .getTimeCodes()
    .find((timecode) => timecode.type === 'ending' && Number.isFinite(timecode.startOffsetMs));
  if (endingTimecode?.startOffsetMs !== undefined) return endingTimecode.startOffsetMs;

  const experiences = getNetflixState()?.postPlay?.experienceByVideoId ?? {};
  for (const experience of Object.values(experiences) as any[]) {
    const seamlessEndMs = experience?.currentEpisodeSeamlessData?.seamlessEndMillis;
    if (Number.isFinite(seamlessEndMs)) return seamlessEndMs;
  }

  return durationMs;
}

/** Finds Netflix's "Watch credits" button while Seamless Post Play is active. */
function findWatchCreditsButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>(WATCH_CREDITS_BUTTON_SELECTOR);
}

/**
 * Waits one animation frame so Netflix can remount its standard controls.
 *
 * @returns A promise that resolves on the next frame.
 */
function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

/**
 * Finds Netflix's native video element.
 *
 * @returns The video, or null when one is not present.
 */
function findNetflixVideo(): HTMLVideoElement | null {
  return document.querySelector('video');
}

/**
 * Seeks through Netflix's Cadmium player using elapsed milliseconds.
 *
 * @param direction - The seek direction (-1 for backward, 1 for forward).
 * @param seconds - The absolute seek distance in seconds (0 for start/end).
 * @returns The actual distance sought in seconds, or null when unavailable.
 */
async function netflixSeek(direction: -1 | 1, seconds: number): Promise<number | null> {
  const player = getCadmiumPlayer();
  if (!player) return null;

  const currentTimeMs = player.getCurrentTime();
  const durationMs = player.getDuration();
  if (!Number.isFinite(currentTimeMs) || !Number.isFinite(durationMs)) return null;

  const watchCreditsButton = findWatchCreditsButton();
  const minSeekTimeMs = Math.min(EDGE_SEEK_OFFSET_MS, durationMs);
  const mediaMaxSeekTimeMs = Math.max(minSeekTimeMs, durationMs - EDGE_SEEK_OFFSET_MS);
  const endingBoundaryMs = Math.min(durationMs, getEndingBoundaryMs(player, durationMs));
  const normalMaxSeekTimeMs = Math.max(
    minSeekTimeMs,
    endingBoundaryMs - EDGE_SEEK_OFFSET_MS,
  );
  const isCreditsState = watchCreditsButton !== null || currentTimeMs >= endingBoundaryMs;
  const isSeekEnd = seconds === 0 && direction === 1;

  // Netflix already considers credits/Post Play to be the logical end.
  // Seeking to its earlier boundary here would move backward unexpectedly.
  if (isCreditsState && isSeekEnd) return 0;

  const maxSeekTimeMs = isCreditsState ? mediaMaxSeekTimeMs : normalMaxSeekTimeMs;
  const requestedTimeMs =
    seconds === 0
      ? direction === -1
        ? minSeekTimeMs
        : normalMaxSeekTimeMs
      : currentTimeMs + direction * seconds * 1_000;
  const targetTimeMs = Math.min(maxSeekTimeMs, Math.max(minSeekTimeMs, requestedTimeMs));
  const movedSeconds = Math.abs(targetTimeMs - currentTimeMs) / 1_000;

  if (watchCreditsButton) {
    watchCreditsButton.click();
    await waitForAnimationFrame();
  }

  const activePlayer = getCadmiumPlayer();
  if (!activePlayer) return null;
  activePlayer.seek(targetTimeMs);
  return movedSeconds;
}

/** Netflix owns Space playback — LunaV only reports its expected next state. */
export const netflixAdapter: SiteAdapter = {
  selectVideo: findNetflixVideo,
  nativeSpaceFeedback: true,
  seek: netflixSeek,
};
