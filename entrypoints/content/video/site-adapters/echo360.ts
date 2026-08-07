/** Configures Echo360's dedicated leader video and native Space handling. */
import type { PlaybackRateDirection, SiteAdapter } from './types';

const PLAYBACK_SPEED_MENU_SELECTOR = '#playback-speed-menu';
const PLAYBACK_SPEED_BUTTON_SELECTOR = '[data-testid="playback-speed-button"]';
const PLAYBACK_SPEED_OPTION_SELECTOR = '[role="menuitemradio"]';
const MIN_PLAYBACK_RATE = 0.25;
const MAX_PLAYBACK_RATE = 2;
const PLAYBACK_RATE_EPSILON = 0.001;
const ECHO360_PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/**
 * Finds Echo360's primary media element instead of a synchronized follower video.
 *
 * @returns The leader video, or null when Echo360's expected element is absent.
 */
function findEcho360Video(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>('video[data-test="leader"]');
}

/**
 * Waits until the current animation frame completes without allowing a visual menu flash.
 *
 * @returns A promise that resolves during the next animation frame.
 */
function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

/**
 * Reads the numeric playback speed from one Echo360 menu option.
 *
 * @param option - A playback-speed radio option.
 * @returns The option's speed, or null when its label is unrecognizable.
 */
function getOptionSpeed(option: HTMLElement): number | null {
  const match = option.textContent?.match(/(\d+(?:\.\d+)?)x\s*$/i);
  return match ? Number(match[1]) : null;
}

/**
 * Gets Echo360's mounted playback-speed options.
 *
 * @returns The mounted speed options, or an empty array when the menu is closed.
 */
function getPlaybackSpeedOptions(): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      `${PLAYBACK_SPEED_MENU_SELECTOR} ${PLAYBACK_SPEED_OPTION_SELECTOR}`,
    ),
  ];
}

/**
 * Determines whether a direction would exceed Echo360's supported playback-speed range.
 *
 * @param playbackRate - Echo360's current native playback speed.
 * @param direction - The requested lower or higher speed direction.
 * @returns True when no adjacent speed option exists in the requested direction.
 */
function isPlaybackRateBoundary(playbackRate: number, direction: PlaybackRateDirection): boolean {
  return (
    (direction === -1 && playbackRate <= MIN_PLAYBACK_RATE + PLAYBACK_RATE_EPSILON) ||
    (direction === 1 && playbackRate >= MAX_PLAYBACK_RATE - PLAYBACK_RATE_EPSILON)
  );
}

/**
 * Calculates Echo360's adjacent supported playback speed before opening its menu.
 *
 * @param direction - The requested lower or higher speed direction.
 * @returns The adjacent speed, the current boundary speed, or null when safe control is unavailable.
 */
function getEcho360PlaybackRateTarget(direction: PlaybackRateDirection): number | null {
  const video = findEcho360Video();
  if (!video) return null;
  if (isPlaybackRateBoundary(video.playbackRate, direction)) return video.playbackRate;
  if (!document.querySelector(PLAYBACK_SPEED_BUTTON_SELECTOR)) return null;

  const currentIndex = ECHO360_PLAYBACK_RATES.findIndex(
    (speed) => Math.abs(speed - video.playbackRate) <= PLAYBACK_RATE_EPSILON,
  );
  if (currentIndex === -1) return null;

  return ECHO360_PLAYBACK_RATES[currentIndex + direction] ?? null;
}

/**
 * Opens Echo360's playback-speed menu only when its options are not already mounted.
 *
 * @returns The mounted speed options, or an empty array when the menu cannot be opened.
 */
async function openPlaybackSpeedMenu(): Promise<HTMLElement[]> {
  const mountedOptions = getPlaybackSpeedOptions();
  if (mountedOptions.length) return mountedOptions;

  const button = document.querySelector<HTMLElement>(PLAYBACK_SPEED_BUTTON_SELECTOR);
  if (!button) return [];

  button.click();
  await waitForAnimationFrame();
  return getPlaybackSpeedOptions();
}

/**
 * Selects Echo360's adjacent playback-speed menu option.
 *
 * @param direction - The requested lower or higher speed direction.
 * @returns The selected speed, or null when Echo360's menu cannot be controlled safely.
 */
async function adjustEcho360PlaybackRate(direction: PlaybackRateDirection): Promise<number | null> {
  const video = findEcho360Video();
  if (!video) return null;
  if (isPlaybackRateBoundary(video.playbackRate, direction)) return video.playbackRate;

  const options = await openPlaybackSpeedMenu();
  const optionEntries = options
    .map((option) => ({ option, speed: getOptionSpeed(option) }))
    .filter((entry): entry is { option: HTMLElement; speed: number } => entry.speed !== null)
    .sort((left, right) => left.speed - right.speed);
  const currentIndex = optionEntries.findIndex(
    ({ option }) => option.getAttribute('aria-checked') === 'true',
  );

  if (currentIndex === -1) return null;

  const targetIndex = Math.min(
    optionEntries.length - 1,
    Math.max(0, currentIndex + direction),
  );
  const target = optionEntries[targetIndex];
  target.option.click();
  await waitForAnimationFrame();

  const button = document.querySelector<HTMLElement>(PLAYBACK_SPEED_BUTTON_SELECTOR);
  if (button?.getAttribute('aria-expanded') === 'true') {
    button.click();
    await waitForAnimationFrame();
  }

  return target.speed;
}

/** Echo360 owns Space playback, so LunaV only reports its expected next state. */
export const echo360Adapter: SiteAdapter = {
  selectVideo: findEcho360Video,
  nativeSpaceFeedback: true,
  maxPlaybackRate: MAX_PLAYBACK_RATE,
  getPlaybackRateTarget: getEcho360PlaybackRateTarget,
  adjustPlaybackRate: adjustEcho360PlaybackRate,
};
