/** Coordinates page keyboard events with LunaV's video controls and feedback. */
import { VIDEO_CONTROL_CONFIG } from '../config';
import { createOverlayPresenter } from '../overlay/overlay-host';
import { getPlaybackRateFeedback, performPlaybackRateAction } from '../video/playback-rate';
import { getSiteAdapter } from '../video/site-adapters';
import { findTargetVideo } from '../video/target';
import {
  getShortcut,
  isEditableTarget,
  isPlaybackRateAction,
  type VideoAction,
} from '../keyboard/shortcut';
import { getToggledPlaybackFeedback, performVideoAction } from '../video/actions';

/** Stores the most recent seek action for short-window feedback accumulation. */
interface SeekAccumulation {
  /** The seek action that may continue accumulating. */
  action: VideoAction;
  /** The total seek distance currently displayed. */
  seconds: number;
  /** The time at which the latest matching key was pressed. */
  timestamp: number;
}

/**
 * Registers LunaV's page-level keyboard controls and visual feedback.
 *
 * @returns Nothing.
 */
export function startKeyboardController(): void {
  const overlayPresenter = createOverlayPresenter();
  let latestSeek: SeekAccumulation | null = null;
  let playbackRateAdjustmentQueue: Promise<void> = Promise.resolve();
  const handledShortcutCodes = new Set<string>();

  /**
   * Calculates the displayed distance for a seek repeated within the accumulation window.
   *
   * @param action - The newly performed seek action.
   * @param seconds - The action's base seek distance.
   * @returns The total seek distance to display.
   */
  function getAccumulatedSeconds(action: VideoAction, seconds: number): number {
    const now = Date.now();
    const previousSeek = latestSeek;
    const canAccumulate =
      previousSeek?.action === action &&
      now - previousSeek.timestamp <= VIDEO_CONTROL_CONFIG.feedback.accumulationWindowMs;
    const totalSeconds = canAccumulate && previousSeek ? previousSeek.seconds + seconds : seconds;

    latestSeek = { action, seconds: totalSeconds, timestamp: now };
    return totalSeconds;
  }

  /**
   * Stops a handled shortcut event before the page can process it.
   *
   * @param event - The captured page keyboard event.
   * @returns Nothing.
   */
  function consumeShortcutEvent(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  /**
   * Serializes playback-speed adjustments so rapid bracket presses use the latest site state.
   *
   * @param video - The selected native video.
   * @param action - The requested playback-speed action.
   * @returns Nothing.
   */
  function queuePlaybackRateAdjustment(
    video: HTMLVideoElement,
    action: Extract<VideoAction, 'decrease-playback-rate' | 'increase-playback-rate'>,
  ): void {
    playbackRateAdjustmentQueue = playbackRateAdjustmentQueue
      .then(() => performPlaybackRateAction(video, action))
      .then(() => undefined)
      .catch(() => undefined);
  }

  /**
   * Controls a selected native video for supported shortcuts outside editable controls.
   *
   * @param event - The captured page keyboard event.
   * @returns Nothing.
   */
  function handleShortcutKeyDown(event: KeyboardEvent): void {
    if (isEditableTarget(event.target)) return;

    const shortcut = getShortcut(event);
    if (!shortcut) return;

    const siteAdapter = getSiteAdapter(window.location.hostname);
    const video = findTargetVideo();
    if (!video) return;

    if (shortcut.action === 'toggle-playback' && siteAdapter?.nativeSpaceFeedback) {
      overlayPresenter.show(getToggledPlaybackFeedback(video));
      return;
    }

    if (isPlaybackRateAction(shortcut.action)) {
      const feedback = getPlaybackRateFeedback(video, shortcut.action);
      if (!feedback) return;

      handledShortcutCodes.add(event.code);
      consumeShortcutEvent(event);
      overlayPresenter.show(feedback);
      queuePlaybackRateAdjustment(video, shortcut.action);
      return;
    }

    const feedback = performVideoAction(video, shortcut.action);
    const seconds = feedback.seconds
      ? getAccumulatedSeconds(shortcut.action, feedback.seconds)
      : undefined;
    if (!feedback.seconds) latestSeek = null;

    handledShortcutCodes.add(event.code);
    consumeShortcutEvent(event);
    overlayPresenter.show(feedback, seconds);
  }

  /**
   * Blocks compatibility events emitted after a LunaV-handled keydown.
   *
   * @param event - The captured page keyboard event.
   * @returns Nothing.
   */
  function blockHandledShortcutEvent(event: KeyboardEvent): void {
    if (!handledShortcutCodes.has(event.code)) return;

    consumeShortcutEvent(event);
    if (event.type === 'keyup') handledShortcutCodes.delete(event.code);
  }

  window.addEventListener('keydown', handleShortcutKeyDown, { capture: true });
  window.addEventListener('keypress', blockHandledShortcutEvent, { capture: true });
  window.addEventListener('keyup', blockHandledShortcutEvent, { capture: true });
}
