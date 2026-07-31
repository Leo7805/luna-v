/** Defines shared capabilities for website-specific native video adapters. */

/** Configures native video behavior that differs on one supported website. */
export interface SiteAdapter {
  /** Selects the website's deliberate native video target. */
  selectVideo: () => HTMLVideoElement | null;
  /** Lets the website own Space playback while LunaV displays immediate expected-state feedback. */
  nativeSpaceFeedback?: true;
}
