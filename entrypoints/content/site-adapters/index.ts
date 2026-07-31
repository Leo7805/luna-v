/** Resolves dedicated native video selectors for supported video-hosting sites. */
import { findEcho360Video } from './echo360';

/** Selects a native video for one supported website. */
type SiteVideoSelector = () => HTMLVideoElement | null;

const SITE_VIDEO_SELECTORS: Readonly<Record<string, SiteVideoSelector>> = {
  'echo360.net.au': findEcho360Video,
};

/**
 * Determines whether a hostname is the registered domain or one of its subdomains.
 *
 * @param hostname - The current page hostname.
 * @param domain - A registered adapter domain.
 * @returns True when the adapter applies to the hostname.
 */
function matchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

/**
 * Finds a dedicated video target for the current website when an adapter is registered.
 *
 * @param hostname - The current page hostname.
 * @returns The dedicated target, or null when no adapter applies or finds a video.
 */
export function findSiteVideoTarget(hostname: string): HTMLVideoElement | null {
  for (const [domain, selectVideo] of Object.entries(SITE_VIDEO_SELECTORS)) {
    if (matchesDomain(hostname, domain)) return selectVideo();
  }

  return null;
}
