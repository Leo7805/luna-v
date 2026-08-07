/** Defines shared capabilities for website-specific native video adapters. */

/** Identifies the direction of one playback-speed adjustment. */
export type PlaybackRateDirection = -1 | 1;

/** Configures native video behavior that differs on one supported website. */
export interface SiteAdapter {
  /** Selects the website's deliberate native video target. */
  selectVideo: () => HTMLVideoElement | null;
  /** Lets the website own Space playback while LunaV displays immediate expected-state feedback. */
  nativeSpaceFeedback?: true;
  /** The highest playback rate supported by the site's own controls. */
  maxPlaybackRate?: number;
  /** Calculates the next playback speed before the website's asynchronous controls are used. */
  getPlaybackRateTarget?: (direction: PlaybackRateDirection) => number | null;
  /** Adjusts playback speed through the website's own player controls. */
  adjustPlaybackRate?: (direction: PlaybackRateDirection) => Promise<number | null>;
  /**
   * Seeks through the website's own player controls instead of setting
   * {@link HTMLVideoElement.currentTime}.
   *
   * @param direction - The seek direction (-1 for backward, 1 for forward).
   * @param seconds - The absolute seek distance in seconds.
   * @returns The actual distance sought in seconds, or null when unavailable.
   */
  seek?: (direction: -1 | 1, seconds: number) => Promise<number | null>;
}
