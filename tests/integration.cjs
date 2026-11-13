/**
 * Luna V & Luna Player Integration and HUD Verification Tests
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('/Users/leo/Projects/luna-player/node_modules/@playwright/test');

const EXTENSION_PATH = fs.existsSync(path.resolve(__dirname, '../build/Keyboard-Video-Controls---LunaV/manifest.json'))
  ? path.resolve(__dirname, '../build/Keyboard-Video-Controls---LunaV')
  : path.resolve(__dirname, '../.output/chrome-mv3');

const FIXTURE_PATH = '/Users/leo/Projects/luna-player/tests/fixtures/sample-library';
const SCREENSHOT_DIR = process.env.LUNA_HUD_ARTIFACT_DIR || '/tmp/luna-v-hud-positioning';

function loadFixtureFiles(dirPath) {
  const results = [];
  function walk(currentDir, currentRelative) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = currentRelative ? `${currentRelative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(fullPath, relPath);
      } else if (entry.isFile()) {
        const buffer = fs.readFileSync(fullPath);
        const mimeType = entry.name.endsWith('.mp4')
          ? 'video/mp4'
          : entry.name.endsWith('.txt')
          ? 'text/plain'
          : 'application/octet-stream';
        results.push({
          relativePath: relPath,
          name: entry.name,
          base64: buffer.toString('base64'),
          mimeType,
        });
      }
    }
  }
  walk(dirPath, '');
  return results;
}

async function installMockDirectoryPicker(page, files) {
  await page.addInitScript(
    ({ files }) => {
      const rootNode = {
        kind: 'directory',
        name: 'Sample Library',
        children: new Map(),
      };

      for (const item of files) {
        const parts = item.relativePath.split('/');
        let current = rootNode;
        for (let i = 0; i < parts.length - 1; i++) {
          const folderName = parts[i];
          if (!current.children.has(folderName)) {
            current.children.set(folderName, {
              kind: 'directory',
              name: folderName,
              children: new Map(),
            });
          }
          current = current.children.get(folderName);
        }

        const fileName = parts[parts.length - 1];
        const binaryString = atob(item.base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let j = 0; j < len; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }

        const fileObj = new File([bytes], fileName, {
          type: item.mimeType,
          lastModified: 1700000000000,
        });

        current.children.set(fileName, {
          kind: 'file',
          name: fileName,
          file: fileObj,
        });
      }

      function createHandle(node) {
        if (node.kind === 'file') {
          return {
            kind: 'file',
            name: node.name,
            queryPermission: async () => 'granted',
            requestPermission: async () => 'granted',
            getFile: async () => node.file,
          };
        }
        return {
          kind: 'directory',
          name: node.name,
          queryPermission: async () => 'granted',
          requestPermission: async () => 'granted',
          async *values() {
            for (const child of node.children.values()) {
              yield createHandle(child);
            }
          },
        };
      }

      window.showDirectoryPicker = async () => createHandle(rootNode);
    },
    { files }
  );
}

async function getHudState(page, videoSelector = 'video') {
  return await page.evaluate((selector) => {
    const host = document.querySelector('[data-luna-v-overlay="true"]');
    const video = document.querySelector(selector);
    const videoBox = video ? video.getBoundingClientRect() : null;
    const fsEl = document.fullscreenElement;

    if (!host || !host.shadowRoot) {
      return { mounted: false, videoBox };
    }
    const hudContainer = host.shadowRoot.querySelector('div[aria-live="polite"]');
    const pill = hudContainer ? hudContainer.firstElementChild : null;
    const textSpan = pill ? pill.querySelector('span:not([aria-hidden])') : null;

    if (!pill || !textSpan) {
      return {
        mounted: true,
        hostParent: host.parentElement?.tagName ?? null,
        isPopoverOpen: host.matches(':popover-open'),
        visible: false,
        videoBox,
      };
    }

    const cBox = hudContainer.getBoundingClientRect();
    const pillBox = pill.getBoundingClientRect();
    const textBox = textSpan.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(pill);
    const cStyle = window.getComputedStyle(hudContainer);

    const hudCenterX = pillBox.left + pillBox.width / 2;
    const hudCenterY = pillBox.top + pillBox.height / 2;
    const textCenterX = textBox.left + textBox.width / 2;

    const videoCenterX = videoBox ? videoBox.left + videoBox.width / 2 : window.innerWidth / 2;
    const videoCenterY = videoBox ? videoBox.top + videoBox.height / 2 : window.innerHeight / 2;

    const hudToVideoCenterXDiff = Math.abs(hudCenterX - videoCenterX);
    const hudToVideoCenterYDiff = Math.abs(hudCenterY - videoCenterY);
    const textToHudCenterDiff = Math.abs(hudCenterX - textCenterX);

    return {
      mounted: true,
      visible: computedStyle.visibility !== 'hidden' && Number(computedStyle.opacity) > 0,
      fsElement: fsEl?.tagName ?? null,
      hostParent: host.parentElement?.tagName ?? null,
      isPopoverOpen: host.matches(':popover-open'),
      text: textSpan.textContent?.trim(),
      opacity: computedStyle.opacity,
      visibility: computedStyle.visibility,
      cBox: { x: cBox.left, y: cBox.top, width: cBox.width, height: cBox.height },
      hudBox: { x: pillBox.left, y: pillBox.top, width: pillBox.width, height: pillBox.height },
      textBox: { x: textBox.left, y: textBox.top, width: textBox.width, height: textBox.height },
      videoBox: videoBox ? { x: videoBox.left, y: videoBox.top, width: videoBox.width, height: videoBox.height } : null,
      hudCenterX,
      hudCenterY,
      videoCenterX,
      videoCenterY,
      textCenterX,
      hudToVideoCenterXDiff,
      hudToVideoCenterYDiff,
      textToHudCenterDiff,
    };
  }, videoSelector);
}

async function triggerAndCaptureHud(page, key, { maxWaitMs = 1500, videoSelector = 'video' } = {}) {
  await page.keyboard.press(key);
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const state = await getHudState(page, videoSelector);
    if (state.mounted && state.visible && Number(state.opacity) > 0.5) {
      return state;
    }
    await page.waitForTimeout(16);
  }
  return await getHudState(page, videoSelector);
}

function assertHudAligned(scenario, state, maxTolerance = 2) {
  if (!state.mounted || !state.visible) {
    throw new Error(`[FAIL] ${scenario}: HUD is not mounted or not visible! State: ${JSON.stringify(state)}`);
  }
  if (state.hudToVideoCenterXDiff > maxTolerance) {
    throw new Error(
      `[FAIL] ${scenario}: HUD horizontal center offset (${state.hudToVideoCenterXDiff.toFixed(2)}px) exceeds ${maxTolerance}px! Video center X: ${state.videoCenterX.toFixed(2)}px, HUD center X: ${state.hudCenterX.toFixed(2)}px`
    );
  }
  if (state.hudToVideoCenterYDiff > maxTolerance) {
    throw new Error(
      `[FAIL] ${scenario}: HUD vertical center offset (${state.hudToVideoCenterYDiff.toFixed(2)}px) exceeds ${maxTolerance}px! Video center Y: ${state.videoCenterY.toFixed(2)}px, HUD center Y: ${state.hudCenterY.toFixed(2)}px`
    );
  }
  if (state.textToHudCenterDiff > maxTolerance) {
    throw new Error(
      `[FAIL] ${scenario}: HUD text center offset (${state.textToHudCenterDiff.toFixed(2)}px) exceeds ${maxTolerance}px! Text center X: ${state.textCenterX.toFixed(2)}px, HUD center X: ${state.hudCenterX.toFixed(2)}px`
    );
  }
  console.log(
    `[PASS] ${scenario}: HUD aligned (dX: ${state.hudToVideoCenterXDiff.toFixed(2)}px, dY: ${state.hudToVideoCenterYDiff.toFixed(2)}px, dText: ${state.textToHudCenterDiff.toFixed(2)}px)`
  );
}

async function runTests() {
  console.log('=== Luna V & Luna Player Integration Test Suite ===');
  console.log('Extension path:', EXTENSION_PATH);
  console.log('Screenshot output dir:', SCREENSHOT_DIR);

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const fixtureFiles = loadFixtureFiles(FIXTURE_PATH);
  console.log(`Loaded ${fixtureFiles.length} fixture files from sample library`);

  const userDataDir = fs.mkdtempSync('/tmp/luna-test-profile-');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--headless=new',
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
    ],
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  await installMockDirectoryPicker(page, fixtureFiles);

  console.log('\nNavigating to Luna Player at http://localhost:5173...');
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('domcontentloaded');

  // Open directory
  const openFolderBtn = page.getByRole('button', { name: /open video folder/i });
  await openFolderBtn.click();
  await page.waitForTimeout(500);

  // Handle autoplay overlay if present
  const clickToPlay = page.getByRole('button', { name: /click to play/i });
  if (await clickToPlay.count() > 0) {
    await clickToPlay.click({ force: true });
    await page.waitForTimeout(500);
  }

  const video = page.locator('video');
  await video.click({ force: true }).catch(() => {});
  await video.evaluate((v) => v.play().catch(() => {}));
  await page.waitForTimeout(500);

  const results = {
    scenarios: [],
    alignmentMatrix: [],
  };

  // --- Scenario 1: Normal playback seek ---
  console.log('\n--- Scenario 1: Normal playback seek ---');
  let hud = await triggerAndCaptureHud(page, 'ArrowRight');
  assertHudAligned('Normal playback seek', hud);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-normal-playback-seek.png') });
  results.scenarios.push({ scenario: 'Normal playback seek', state: hud });
  await page.waitForTimeout(1100); // Allow HUD to dismiss

  // --- Scenario 2: Theater Mode HUD ---
  console.log('\n--- Scenario 2: Theater Mode ---');
  const theaterBtn = page.getByRole('button', { name: /theater mode/i }).or(page.getByTitle(/theater mode/i));
  if (await theaterBtn.count() > 0) {
    await theaterBtn.first().click({ force: true });
    await page.waitForTimeout(300);
  }
  hud = await triggerAndCaptureHud(page, 'Space');
  assertHudAligned('Theater Mode', hud);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-theater-mode.png') });
  results.scenarios.push({ scenario: 'Theater Mode', state: hud });
  await page.waitForTimeout(1100);

  // --- Scenario 3: Custom wrapper fullscreen ---
  console.log('\n--- Scenario 3: Custom wrapper fullscreen ---');
  const fullscreenBtn = page.getByRole('button', { name: /fullscreen/i }).or(page.getByTitle(/fullscreen/i));
  if (await fullscreenBtn.count() > 0) {
    await fullscreenBtn.first().click({ force: true });
    await page.waitForTimeout(500);
  }
  hud = await triggerAndCaptureHud(page, 'ArrowRight');
  assertHudAligned('Custom wrapper fullscreen', hud);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-wrapper-fullscreen.png') });
  results.scenarios.push({ scenario: 'Custom wrapper fullscreen', state: hud });
  await page.waitForTimeout(1100);

  // Exit fullscreen
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // --- Scenario 4: Native video fullscreen ---
  console.log('\n--- Scenario 4: Native video element fullscreen ---');
  await page.evaluate(async () => {
    const v = document.querySelector('video');
    await v.requestFullscreen();
  });
  await page.waitForTimeout(500);
  hud = await triggerAndCaptureHud(page, 'ArrowRight');
  assertHudAligned('Native video fullscreen', hud);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-native-video-fullscreen.png') });
  results.scenarios.push({ scenario: 'Native video fullscreen', state: hud });
  await page.waitForTimeout(1100);

  // Exit fullscreen
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Exit theater mode back to normal
  if (await theaterBtn.count() > 0) {
    await theaterBtn.first().click({ force: true });
    await page.waitForTimeout(300);
  }

  // --- Scenario 5: Repeated shortcuts ---
  console.log('\n--- Scenario 5: Repeated shortcuts ---');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(60);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(60);
  hud = await triggerAndCaptureHud(page, 'ArrowRight');
  assertHudAligned('Repeated shortcuts', hud);
  console.log(`Accumulated text: "${hud.text}"`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-repeated-shortcuts.png') });
  results.scenarios.push({ scenario: 'Repeated shortcuts', state: hud });
  await page.waitForTimeout(1100);

  // --- Scenario 6: Window resize tracking ---
  console.log('\n--- Scenario 6: Window resize tracking ---');
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  // Resize viewport while HUD is active
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(80); // allow RAF to position
  hud = await getHudState(page);
  assertHudAligned('Window resize tracking', hud);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-resize-tracking.png') });
  results.scenarios.push({ scenario: 'Window resize tracking', state: hud });
  // Restore viewport
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(1100);

  // --- Scenario 7: Page scrolling tracking ---
  console.log('\n--- Scenario 7: Page scrolling tracking ---');
  await page.evaluate(() => {
    document.body.style.minHeight = '2000px';
    window.scrollTo(0, 100);
  });
  await page.waitForTimeout(100);
  hud = await triggerAndCaptureHud(page, 'ArrowRight');
  assertHudAligned('Page scrolling tracking', hud);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-scroll-tracking.png') });
  results.scenarios.push({ scenario: 'Page scrolling tracking', state: hud });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.body.style.minHeight = '';
  });
  await page.waitForTimeout(1100);

  // --- Scenario 8: Target switching ---
  console.log('\n--- Scenario 8: Target switching ---');
  // Inject a secondary video element on the page
  await page.evaluate(() => {
    const v2 = document.createElement('video');
    v2.id = 'second-test-video';
    v2.style.position = 'fixed';
    v2.style.top = '20px';
    v2.style.right = '20px';
    v2.style.width = '300px';
    v2.style.height = '180px';
    v2.style.zIndex = '9999';
    v2.tabIndex = 0;
    v2.src = document.querySelector('video').src;
    document.body.appendChild(v2);
    v2.focus();
  });
  await page.waitForTimeout(100);
  hud = await triggerAndCaptureHud(page, 'ArrowRight', { videoSelector: '#second-test-video' });
  assertHudAligned('Target switching (second video)', hud);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-target-switching.png') });
  results.scenarios.push({ scenario: 'Target switching', state: hud });
  // Clean up secondary video
  await page.evaluate(() => {
    document.getElementById('second-test-video')?.remove();
  });
  await page.waitForTimeout(1100);

  // Focus primary video
  await video.click({ force: true }).catch(() => {});

  // --- Scenario 9: Target Disconnection Lifecycle ---
  console.log('\n--- Scenario 9: Target Disconnection Lifecycle ---');
  // 1. Create and explicitly identify the target video element
  await page.evaluate(() => {
    const vTemp = document.createElement('video');
    vTemp.id = 'disconnect-target-video';
    vTemp.style.position = 'fixed';
    vTemp.style.bottom = '20px';
    vTemp.style.left = '20px';
    vTemp.style.width = '200px';
    vTemp.style.height = '120px';
    vTemp.tabIndex = 0;
    vTemp.src = document.querySelector('video')?.src || '';
    document.body.appendChild(vTemp);
    vTemp.focus();
  });

  // 2. Trigger HUD feedback and confirm it is initially visible
  hud = await triggerAndCaptureHud(page, 'ArrowRight', { videoSelector: '#disconnect-target-video' });
  assertHudAligned('Target disconnection initial HUD', hud);

  // 3. Remove that exact video from the DOM
  await page.evaluate(() => {
    document.getElementById('disconnect-target-video')?.remove();
  });

  // 4. Assert that the HUD becomes invisible and the Popover closes promptly
  const disconnectStartTime = Date.now();
  let disconnectedState = await getHudState(page);
  while (Date.now() - disconnectStartTime < 1000) {
    disconnectedState = await getHudState(page);
    if (!disconnectedState.visible && !disconnectedState.isPopoverOpen) {
      break;
    }
    await page.waitForTimeout(16);
  }

  if (disconnectedState.visible || disconnectedState.isPopoverOpen) {
    throw new Error(
      `[FAIL] HUD remained visible or popover open after target video was disconnected: visible=${disconnectedState.visible}, isPopoverOpen=${disconnectedState.isPopoverOpen}`
    );
  }
  console.log(`[PASS] HUD immediately dismissed on video disconnection (elapsed: ${Date.now() - disconnectStartTime}ms)`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-video-removal.png') });
  results.scenarios.push({ scenario: 'Target disconnection lifecycle', state: disconnectedState });

  // 5. Verify that no old RAF or timer resurrects the HUD
  await page.waitForTimeout(600);
  const resurrectionCheck = await getHudState(page);
  if (resurrectionCheck.visible || resurrectionCheck.isPopoverOpen) {
    throw new Error(
      `[FAIL] HUD was resurrected by an orphaned RAF or timer after disconnection: visible=${resurrectionCheck.visible}, isPopoverOpen=${resurrectionCheck.isPopoverOpen}`
    );
  }

  // 6. Verify that subsequent feedback for another valid video still works
  await video.click({ force: true }).catch(() => {});
  const nextHud = await triggerAndCaptureHud(page, 'ArrowRight');
  assertHudAligned('Subsequent feedback for primary video after disconnection', nextHud);
  console.log('[PASS] Subsequent feedback for primary video works normally after disconnection.');
  await page.waitForTimeout(1100);

  // --- Scenario 9b: Zero Dimensions and Recovery ---
  console.log('\n--- Scenario 9b: Zero Dimensions and Recovery ---');
  // 1. Select and identify the exact target video
  await page.evaluate(() => {
    const vZero = document.createElement('video');
    vZero.id = 'zero-dim-target-video';
    vZero.style.position = 'fixed';
    vZero.style.top = '80px';
    vZero.style.left = '80px';
    vZero.style.width = '300px';
    vZero.style.height = '180px';
    vZero.tabIndex = 0;
    vZero.src = document.querySelector('video')?.src || '';
    document.body.appendChild(vZero);
    vZero.focus();
  });

  // 2. Trigger the HUD and confirm its visibility
  hud = await triggerAndCaptureHud(page, 'ArrowRight', { videoSelector: '#zero-dim-target-video' });
  assertHudAligned('Zero-dim target initial HUD', hud);

  // 3. Collapse the same video element to zero dimensions
  await page.evaluate(() => {
    const v = document.getElementById('zero-dim-target-video');
    v.style.width = '0px';
    v.style.height = '0px';
  });

  // 4. Assert that the HUD becomes hidden without moving to the viewport center
  const collapseStartTime = Date.now();
  let collapsedState = await getHudState(page, '#zero-dim-target-video');
  while (Date.now() - collapseStartTime < 500) {
    collapsedState = await getHudState(page, '#zero-dim-target-video');
    if (!collapsedState.visible) {
      break;
    }
    await page.waitForTimeout(16);
  }

  if (collapsedState.visible) {
    throw new Error('[FAIL] HUD must become hidden when target video dimensions collapse to zero');
  }

  // Assert it did not move to viewport center
  const viewportCenterX = await page.evaluate(() => window.innerWidth / 2);
  const viewportCenterY = await page.evaluate(() => window.innerHeight / 2);
  const diffFromViewportCenterX = Math.abs(collapsedState.hudCenterX - viewportCenterX);
  const diffFromViewportCenterY = Math.abs(collapsedState.hudCenterY - viewportCenterY);
  console.log(`[PASS] HUD hidden on zero dimensions (viewport diffs: dx=${diffFromViewportCenterX.toFixed(1)}px, dy=${diffFromViewportCenterY.toFixed(1)}px)`);

  // 5. Restore the same video element's dimensions before its feedback expires (within 600ms display duration)
  await page.evaluate(() => {
    const v = document.getElementById('zero-dim-target-video');
    v.style.width = '300px';
    v.style.height = '180px';
  });

  // 6. Assert that the same HUD becomes visible again without requiring a new keyboard shortcut
  const restoreStartTime = Date.now();
  let recoveredState = await getHudState(page, '#zero-dim-target-video');
  while (Date.now() - restoreStartTime < 500) {
    recoveredState = await getHudState(page, '#zero-dim-target-video');
    if (recoveredState.visible && Number(recoveredState.opacity) > 0.5) {
      break;
    }
    await page.waitForTimeout(16);
  }

  if (!recoveredState.visible) {
    throw new Error('[FAIL] HUD did not resume visibility after video dimensions recovered');
  }

  // 7. Assert that its X and Y center differences relative to the target video are both below 2px
  assertHudAligned('Zero dimensions recovery', recoveredState, 2);
  console.log(`[PASS] HUD restored visibility and alignment on geometry recovery (dx=${recoveredState.hudToVideoCenterXDiff.toFixed(2)}px, dy=${recoveredState.hudToVideoCenterYDiff.toFixed(2)}px)`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09b-zero-dim-recovery.png') });
  results.scenarios.push({ scenario: 'Zero dimensions recovery', state: recoveredState });

  // Clean up test video
  await page.evaluate(() => {
    document.getElementById('zero-dim-target-video')?.remove();
  });
  await page.waitForTimeout(1100);

  // Focus primary video
  await video.click({ force: true }).catch(() => {});

  // --- Scenario 10: Popover dismissal & host count ---
  console.log('\n--- Scenario 10: Popover dismissal & host count ---');
  await page.waitForTimeout(1200);
  const hostInfo = await page.evaluate(() => {
    const hosts = document.querySelectorAll('[data-luna-v-overlay="true"]');
    const firstHost = hosts[0];
    return {
      hostCount: hosts.length,
      isOpen: firstHost ? firstHost.matches(':popover-open') : false,
    };
  });
  if (hostInfo.hostCount !== 1) {
    throw new Error(`[FAIL] Expected exactly 1 overlay host in DOM, found: ${hostInfo.hostCount}`);
  }
  if (hostInfo.isOpen) {
    throw new Error(`[FAIL] Popover should be closed after dismissal, but is still open!`);
  }
  console.log(`[PASS] Popover correctly dismissed. Host count === 1, isPopoverOpen === false`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-dismissal-complete.png') });
  results.scenarios.push({ scenario: 'Popover dismissal complete', state: hostInfo });

  // --- Scenario 11: Alignment Matrix across Luna V keyboard mappings ---
  console.log('\n=== HUD Alignment Test Matrix ===');
  const alignmentLabels = [
    { key: 'ArrowRight', label: 'Seek Forward (5s)' },
    { key: 'ArrowLeft', label: 'Seek Backward (5s)' },
    { key: 'Space', label: 'Play / Pause' },
    { key: 'BracketRight', label: 'Speed Increase' },
    { key: 'BracketLeft', label: 'Speed Decrease' },
    { key: 'Backslash', label: 'Speed Reset' },
    { key: 'Quote', label: 'Volume Up' },
    { key: 'Semicolon', label: 'Volume Down' },
    { key: 'Enter', label: 'Mute / Unmute' },
  ];

  for (const item of alignmentLabels) {
    const alignState = await triggerAndCaptureHud(page, item.key);
    assertHudAligned(`Matrix: ${item.label}`, alignState);
    results.alignmentMatrix.push({
      action: item.label,
      text: alignState.text,
      hudToVideoCenterXDiff: alignState.hudToVideoCenterXDiff,
      hudToVideoCenterYDiff: alignState.hudToVideoCenterYDiff,
      textToHudCenterDiff: alignState.textToHudCenterDiff,
    });
    await page.waitForTimeout(1100); // Allow dismiss before next key
  }

  // Save full results JSON
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'test-results.json'),
    JSON.stringify(results, null, 2),
    'utf8'
  );
  console.log('\nSaved test results to', path.join(SCREENSHOT_DIR, 'test-results.json'));

  await context.close();
  console.log('\nAll integration tests passed successfully with 0 failures!');
}

runTests().catch((err) => {
  console.error('\nTest execution FAILED:', err);
  process.exit(1);
});
