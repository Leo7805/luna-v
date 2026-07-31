/** Resolves dedicated native video selectors for supported video-hosting sites. */
import { echo360Adapter } from './echo360';
import type { SiteAdapter } from './types';

const SITE_ADAPTERS: Readonly<Record<string, SiteAdapter>> = {
  'echo360.net.au': echo360Adapter,
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
 * Finds the registered adapter for the current website.
 *
 * @param hostname - The current page hostname.
 * @returns The adapter, or null when no adapter applies.
 */
export function getSiteAdapter(hostname: string): SiteAdapter | null {
  for (const [domain, adapter] of Object.entries(SITE_ADAPTERS)) {
    if (matchesDomain(hostname, domain)) return adapter;
  }

  return null;
}

/**
 * Finds a dedicated video target for the current website when an adapter is registered.
 *
 * @param hostname - The current page hostname.
 * @returns The dedicated target, or null when no adapter applies or finds a video.
 */
export function findSiteVideoTarget(hostname: string): HTMLVideoElement | null {
  return getSiteAdapter(hostname)?.selectVideo() ?? null;
}
