/** Mounts LunaV's isolated in-page user interface. */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from './content/Overlay';
import overlayStyles from './content/overlay.css?inline';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    const host = document.createElement('div');
    host.dataset.lunaVOverlay = 'true';
    host.style.pointerEvents = 'none';

    const shadowRoot = host.attachShadow({ mode: 'open' });
    const mountPoint = document.createElement('div');
    const styleElement = document.createElement('style');
    styleElement.textContent = overlayStyles;
    shadowRoot.append(styleElement, mountPoint);
    document.documentElement.append(host);

    createRoot(mountPoint).render(createElement(Overlay, { message: 'LunaV 已就绪' }));
  },
});
