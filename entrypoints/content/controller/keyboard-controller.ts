/** Coordinates page keyboard events with LunaV's video controls and feedback. */
import { VIDEO_CONTROL_CONFIG } from '@/entrypoints/content/config';
import { createOverlayPresenter } from '@/entrypoints/content/overlay/overlay-host';
import { getPlaybackRateFeedback, performPlaybackRateAction } from '@/entrypoints/content/video/playback-rate';
import { getSiteAdapter } from '@/entrypoints/content/video/site-adapters';
import { findTargetVideo } from '@/entrypoints/content/video/target';
import {
  getShortcut,
  isEditableTarget,
  isPlaybackRateAction,
  isSeekAction,
  isVolumeAction,
  resolveSeekAction,
  type VideoAction,
} from '@/entrypoints/content/keyboard/shortcut';
import { getToggledPlaybackFeedback, performVideoAction } from '@/entrypoints/content/video/actions';
import { performVolumeAction } from '@/entrypoints/content/video/volume';

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
    action: Extract<
      VideoAction,
      'decrease-playback-rate' | 'increase-playback-rate' | 'reset-playback-rate'
    >,
  ): void {
    playbackRateAdjustmentQueue = playbackRateAdjustmentQueue
      .then(() => performPlaybackRateAction(video, action))
      .then(() => undefined)
      .catch(() => undefined);
  }

  /**
   * Performs the named video action on the selected local video and shows overlay feedback.
   *
   * @param video - The video selected within the frame receiving the keyboard event.
   * @param action - The supported video action to perform.
   * @param event - The native keyboard event to consume after confirming a local target.
   * @returns Nothing.
   */
  function executeShortcutAction(
    video: HTMLVideoElement,
    action: VideoAction,
    event: KeyboardEvent,
  ): void {
    const siteAdapter = getSiteAdapter(window.location.hostname);

    if (action === 'toggle-playback' && siteAdapter?.nativeSpaceFeedback) {
      overlayPresenter.show(getToggledPlaybackFeedback(video));
      return;
    }

    if (isPlaybackRateAction(action)) {
      const feedback = getPlaybackRateFeedback(video, action);
      if (!feedback) return;

      handledShortcutCodes.add(event.code);
      consumeShortcutEvent(event);
      overlayPresenter.show(feedback);
      queuePlaybackRateAdjustment(video, action);
      return;
    }

    if (isVolumeAction(action)) {
      const feedback = performVolumeAction(video, action);
      latestSeek = null;
      handledShortcutCodes.add(event.code);
      consumeShortcutEvent(event);
      overlayPresenter.show(feedback);
      return;
    }

    if (isSeekAction(action) && siteAdapter?.seek) {
      const { direction, seconds: actionSeconds } = resolveSeekAction(
        action,
        VIDEO_CONTROL_CONFIG.seek.fineSeconds,
        VIDEO_CONTROL_CONFIG.seek.nearSeconds,
        VIDEO_CONTROL_CONFIG.seek.farSeconds,
      );

      // Consume the event immediately so the page doesn't double-handle it
      handledShortcutCodes.add(event.code);
      consumeShortcutEvent(event);

      void siteAdapter.seek(direction, actionSeconds).then((movedSeconds) => {
        if (movedSeconds === null) return;
        if (actionSeconds === 0 || movedSeconds < actionSeconds - 0.01) {
          latestSeek = null;
          overlayPresenter.show({
            icon: direction === -1 ? 'rewind' : 'fast-forward',
            label: direction === -1 ? 'Start' : 'End',
          });
          return;
        }
        const total = getAccumulatedSeconds(action, movedSeconds);
        overlayPresenter.show(
          {
            icon: direction === -1 ? 'rewind' : 'fast-forward',
            label: direction === -1 ? `Back ${total}s` : `Forward ${total}s`,
            seconds: total,
          },
          total,
        );
      });
      return;
    }

    const feedback = performVideoAction(video, action);
    const seconds = feedback.seconds
      ? getAccumulatedSeconds(action, feedback.seconds)
      : undefined;
    if (!feedback.seconds) latestSeek = null;

    handledShortcutCodes.add(event.code);
    consumeShortcutEvent(event);
    overlayPresenter.show(feedback, seconds);
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

    const video = findTargetVideo();
    if (!video) return;

    executeShortcutAction(video, shortcut.action, event);
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
