/** Starts LunaV's in-page keyboard video controls. */
import { startKeyboardController } from './content/controller/keyboard-controller';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  globalName: false,
  main() {
    startKeyboardController();
  },
});
