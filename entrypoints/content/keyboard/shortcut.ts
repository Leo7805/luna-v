/** Maps supported keyboard shortcuts and detects editable page targets. */

/** Represents one native video operation supported by the first release. */
export type VideoAction =
  | 'toggle-playback'
  | 'seek-backward-fine'
  | 'seek-forward-fine'
  | 'seek-backward'
  | 'seek-forward'
  | 'seek-backward-far'
  | 'seek-forward-far'
  | 'seek-start'
  | 'seek-end'
  | 'decrease-playback-rate'
  | 'increase-playback-rate'
  | 'reset-playback-rate'
  | 'decrease-volume'
  | 'increase-volume'
  | 'toggle-muted';

/** Represents one supported playback-speed action. */
export type PlaybackRateAction =
  | 'decrease-playback-rate'
  | 'increase-playback-rate'
  | 'reset-playback-rate';

/** Represents one supported native volume action. */
export type VolumeAction = 'decrease-volume' | 'increase-volume' | 'toggle-muted';

/** Describes the operation associated with one shortcut. */
export interface Shortcut {
  /** The native video operation to perform. */
  action: VideoAction;
}

const SHORTCUTS: Readonly<Record<string, Shortcut>> = {
  ' ': { action: 'toggle-playback' },
  Enter: { action: 'toggle-muted' },
  ',': { action: 'seek-backward-fine' },
  '.': { action: 'seek-forward-fine' },
  ArrowLeft: { action: 'seek-backward' },
  ArrowRight: { action: 'seek-forward' },
  ArrowUp: { action: 'seek-backward-far' },
  ArrowDown: { action: 'seek-forward-far' },
  '<': { action: 'seek-start' },
  '>': { action: 'seek-end' },
};

const CODE_SHORTCUTS: Readonly<Record<string, Shortcut>> = {
  BracketLeft: { action: 'decrease-playback-rate' },
  BracketRight: { action: 'increase-playback-rate' },
  Backslash: { action: 'reset-playback-rate' },
  Semicolon: { action: 'decrease-volume' },
  Quote: { action: 'increase-volume' },
};

/**
 * Gets the native video action for one supported keyboard event.
 *
 * @param event - The page keyboard event.
 * @returns The shortcut definition, or null when the key is unsupported.
 */
export function getShortcut(event: KeyboardEvent): Shortcut | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  return SHORTCUTS[event.key] ?? CODE_SHORTCUTS[event.code] ?? null;
}

/**
 * Determines whether an action changes playback speed instead of playback position or state.
 *
 * @param action - The supported video action to inspect.
 * @returns True when the action changes playback speed.
 */
export function isPlaybackRateAction(action: VideoAction): action is PlaybackRateAction {
  return (
    action === 'decrease-playback-rate' ||
    action === 'increase-playback-rate' ||
    action === 'reset-playback-rate'
  );
}

/**
 * Determines whether an action changes a video's native volume or mute state.
 *
 * @param action - The supported video action to inspect.
 * @returns True when the action changes volume or mute state.
 */
export function isVolumeAction(action: VideoAction): action is VolumeAction {
  return (
    action === 'decrease-volume' || action === 'increase-volume' || action === 'toggle-muted'
  );
}

/** Represents one directional seek operation. */
export type SeekAction = Extract<
  VideoAction,
  | 'seek-backward-fine'
  | 'seek-forward-fine'
  | 'seek-backward'
  | 'seek-forward'
  | 'seek-backward-far'
  | 'seek-forward-far'
>;

/** Describes the direction and distance of one seek action. */
export interface SeekParams {
  /** The seek direction (-1 for backward, 1 for forward). */
  direction: -1 | 1;
  /** The absolute seek distance in seconds (0 for start/end). */
  seconds: number;
}

/**
 * Maps a seek action to its direction and distance.
 *
 * @param action - The seek action to resolve.
 * @param fineSeconds - Configured fine-seek distance (default 1).
 * @param nearSeconds - Configured near-seek distance (default 5).
 * @param farSeconds - Configured far-seek distance (default 30).
 * @returns The resolved seek parameters.
 */
export function resolveSeekAction(
  action: VideoAction,
  fineSeconds: number,
  nearSeconds: number,
  farSeconds: number,
): SeekParams {
  const isBackward = action.includes('backward') || action === 'seek-start';
  const direction: -1 | 1 = isBackward ? -1 : 1;

  switch (action) {
    case 'seek-start':
    case 'seek-end':
      return { direction, seconds: 0 };
    case 'seek-backward-fine':
    case 'seek-forward-fine':
      return { direction, seconds: fineSeconds };
    case 'seek-backward-far':
    case 'seek-forward-far':
      return { direction, seconds: farSeconds };
    default:
      return { direction, seconds: nearSeconds };
  }
}

const SEEK_ACTIONS = new Set<VideoAction>([
  'seek-backward-fine',
  'seek-forward-fine',
  'seek-backward',
  'seek-forward',
  'seek-backward-far',
  'seek-forward-far',
  'seek-start',
  'seek-end',
]);

/**
 * Determines whether an action changes the video timeline position.
 *
 * @param action - The supported video action to inspect.
 * @returns True when the action is a seek operation.
 */
export function isSeekAction(action: VideoAction): action is SeekAction | 'seek-start' | 'seek-end' {
  return SEEK_ACTIONS.has(action);
}

/**
 * Determines whether an event target belongs to an editable page control.
 *
 * @param target - The event target to inspect.
 * @returns True when keyboard input must remain available to the page.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'),
  );
}
