/** Defines shared capabilities for website-specific native video adapters. */

/** Identifies the direction of one playback-speed adjustment. */
export type PlaybackRateDirection = -1 | 1;

/** Configures native video behavior that differs on one supported website. */
export interface SiteAdapter {
  /** Selects the website's deliberate native video target. */
  selectVideo: () => HTMLVideoElement | null;
  /** Lets the website own Space playback while LunaV displays immediate expected-state feedback. */
  nativeSpaceFeedback?: true;
  /** Calculates the next playback speed before the website's asynchronous controls are used. */
  getPlaybackRateTarget?: (direction: PlaybackRateDirection) => number | null;
  /** Adjusts playback speed through the website's own player controls. */
  adjustPlaybackRate?: (direction: PlaybackRateDirection) => Promise<number | null>;
}
