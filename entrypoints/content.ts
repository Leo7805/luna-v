/** Starts LunaV's in-page keyboard video controls. */
import { startKeyboardController } from './content/controller/keyboard-controller';
import { setVideoControlConfig } from './content/config';
import { normalizeSettings } from '../utils/settings';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  globalName: false,
  main() {
    window.addEventListener('message', (event) => {
      if (event.source === window && event.data?.type === 'luna-v:settings') {
        setVideoControlConfig(normalizeSettings(event.data.settings));
      }
    });
    startKeyboardController();
  },
});
