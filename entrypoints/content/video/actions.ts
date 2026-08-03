/** Performs native playback and timeline operations for the selected video. */
import { VIDEO_CONTROL_CONFIG } from '../config';
import type { PlaybackRateAction, VideoAction, VolumeAction } from '../keyboard/shortcut';

/** Identifies the visual symbol used for one overlay feedback item. */
export type OverlayIcon =
  | 'rewind'
  | 'fast-forward'
  | 'play'
  | 'pause'
  | 'speed'
  | 'volume-down'
  | 'volume-up'
  | 'volume-muted';

/** Represents a video action that does not change playback speed. */
type NativeVideoAction = Exclude<VideoAction, PlaybackRateAction | VolumeAction>;

/** Describes the visual feedback produced by a completed video operation. */
export interface VideoFeedback {
  /** The symbol that communicates the operation direction. */
  icon: OverlayIcon;
  /** The accessible description of the completed operation. */
  label: string;
  /** The seek distance in seconds when the operation changes the timeline. */
  seconds?: number;
}

/** Identifies a reached edge of a video's seekable timeline. */
type SeekBoundary = 'start' | 'end';

/** Describes the actual result of one timeline seek. */
interface SeekResult {
  /** The rounded distance displayed for the completed seek. */
  seconds: number;
  /** The reached edge when no further movement was possible. */
  boundary: SeekBoundary | null;
}

/** Describes the valid timeline range reported by a native video. */
interface SeekBounds {
  /** The earliest seekable time. */
  start: number;
  /** The latest seekable time, when the video has a finite end. */
  end: number | null;
}

const SEEK_EPSILON_SECONDS = 0.01;
const END_SEEK_OFFSET_SECONDS = 0.5;

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
 * Gets a video's current native seekable bounds.
 *
 * @param video - The video to seek.
 * @returns The available seek bounds.
 */
function getSeekBounds(video: HTMLVideoElement): SeekBounds {
  const { seekable } = video;
  if (seekable.length) {
    return {
      start: seekable.start(0),
      end: seekable.end(seekable.length - 1),
    };
  }

  return {
    start: 0,
    end: Number.isFinite(video.duration) ? video.duration : null,
  };
}

/**
 * Rounds a seek result while preserving sub-second fine-control feedback.
 *
 * @param movedSeconds - The distance actually moved by the video.
 * @param requestedSeconds - The signed distance originally requested.
 * @returns The stable distance to display.
 */
function getDisplayedSeekSeconds(movedSeconds: number, requestedSeconds: number): number {
  const precision = Math.abs(requestedSeconds) < 1 ? 10 : 1;
  return Math.round(movedSeconds * precision) / precision;
}

/**
 * Seeks one video by a signed duration while respecting its actual seekable bounds.
 *
 * @param video - The video to seek.
 * @param seconds - The signed seek distance in seconds.
 * @returns The actual seek result.
 */
function seekVideo(video: HTMLVideoElement, seconds: number): SeekResult {
  const { start, end } = getSeekBounds(video);
  const requestedTime = video.currentTime + seconds;
  const nextTime = Math.max(start, end === null ? requestedTime : Math.min(requestedTime, end));
  const movedSeconds = Math.abs(nextTime - video.currentTime);

  if (movedSeconds <= SEEK_EPSILON_SECONDS) {
    return {
      seconds: 0,
      boundary: seconds < 0 ? 'start' : end === null ? null : 'end',
    };
  }

  video.currentTime = nextTime;
  if (Math.abs(nextTime - start) <= SEEK_EPSILON_SECONDS) {
    return { seconds: 0, boundary: 'start' };
  }
  if (end !== null && Math.abs(nextTime - end) <= SEEK_EPSILON_SECONDS) {
    return { seconds: 0, boundary: 'end' };
  }

  const displayedSeconds = getDisplayedSeekSeconds(movedSeconds, seconds);
  if (displayedSeconds === 0) {
    return {
      seconds: 0,
      boundary: seconds < 0 ? 'start' : end === null ? null : 'end',
    };
  }

  return { seconds: displayedSeconds, boundary: null };
}

/**
 * Performs one timeline seek and creates feedback for its actual result.
 *
 * @param video - The video to seek.
 * @param seconds - The signed seek distance in seconds.
 * @param icon - The visual direction icon for the seek.
 * @param label - The fallback description for a successful seek.
 * @returns Feedback for the actual seek result.
 */
function performSeek(
  video: HTMLVideoElement,
  seconds: number,
  icon: Extract<OverlayIcon, 'rewind' | 'fast-forward'>,
  label: string,
): VideoFeedback {
  const result = seekVideo(video, seconds);
  if (result.boundary === 'start') return { icon, label: 'Start' };
  if (result.boundary === 'end') return { icon, label: 'End' };

  return { icon, label, seconds: result.seconds };
}

/**
 * Seeks a video to the start or just before the end of its native seekable range.
 *
 * @param video - The native video to seek.
 * @param edge - The requested start or end of the seekable range.
 * @returns Feedback for the reached position or unavailable end.
 */
function seekToEdge(video: HTMLVideoElement, edge: SeekBoundary): VideoFeedback {
  const { start, end } = getSeekBounds(video);
  if (edge === 'start') {
    video.currentTime = start;
    return { icon: 'rewind', label: 'Start' };
  }

  if (end === null) {
    return { icon: 'fast-forward', label: 'Live' };
  }

  video.currentTime = Math.max(start, end - END_SEEK_OFFSET_SECONDS);
  return { icon: 'fast-forward', label: 'End' };
}

/**
 * Performs a supported native video operation and returns its overlay feedback.
 *
 * @param video - The selected native video.
 * @param action - The requested native video operation.
 * @returns The visual feedback after initiating the operation.
 */
export function performVideoAction(video: HTMLVideoElement, action: NativeVideoAction): VideoFeedback {
  switch (action) {
    case 'toggle-playback':
      if (video.paused) {
        void video.play().catch(() => undefined);
        return { icon: 'play', label: 'Playing' };
      }

      video.pause();
      return { icon: 'pause', label: 'Paused' };
    case 'seek-backward-fine':
      return performSeek(
        video,
        -VIDEO_CONTROL_CONFIG.seek.fineSeconds,
        'rewind',
        `Back ${VIDEO_CONTROL_CONFIG.seek.fineSeconds} seconds`,
      );
    case 'seek-forward-fine':
      return performSeek(
        video,
        VIDEO_CONTROL_CONFIG.seek.fineSeconds,
        'fast-forward',
        `Forward ${VIDEO_CONTROL_CONFIG.seek.fineSeconds} seconds`,
      );
    case 'seek-backward':
      return performSeek(
        video,
        -VIDEO_CONTROL_CONFIG.seek.nearSeconds,
        'rewind',
        `Back ${VIDEO_CONTROL_CONFIG.seek.nearSeconds} seconds`,
      );
    case 'seek-forward':
      return performSeek(
        video,
        VIDEO_CONTROL_CONFIG.seek.nearSeconds,
        'fast-forward',
        `Forward ${VIDEO_CONTROL_CONFIG.seek.nearSeconds} seconds`,
      );
    case 'seek-backward-far':
      return performSeek(
        video,
        -VIDEO_CONTROL_CONFIG.seek.farSeconds,
        'rewind',
        `Back ${VIDEO_CONTROL_CONFIG.seek.farSeconds} seconds`,
      );
    case 'seek-forward-far':
      return performSeek(
        video,
        VIDEO_CONTROL_CONFIG.seek.farSeconds,
        'fast-forward',
        `Forward ${VIDEO_CONTROL_CONFIG.seek.farSeconds} seconds`,
      );
    case 'seek-start':
      return seekToEdge(video, 'start');
    case 'seek-end':
      return seekToEdge(video, 'end');
  }
}
