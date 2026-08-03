/** Relays persisted settings from the isolated extension world to LunaV's page controller. */
import { readSettings, subscribeSettings, type VideoControlSettings } from '../utils/settings';

/** Publishes one validated settings snapshot to the page world. */
function publish(settings: VideoControlSettings): void {
  window.postMessage({ type: 'luna-v:settings', settings }, window.location.origin);
}

export default defineContentScript({
  matches: ['<all_urls>'], runAt: 'document_start', world: 'ISOLATED',
  main() { void readSettings().then(publish); subscribeSettings(publish); },
});
