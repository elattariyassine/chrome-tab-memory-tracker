import { Settings } from './types';

let memoryOverlay: HTMLElement | null = null;
let currentSettings: Settings | null = null;

function createCornerOverlay() {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '8px';
  overlay.style.right = '8px';
  overlay.style.padding = '4px 8px';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  overlay.style.color = 'white';
  overlay.style.borderRadius = '4px';
  overlay.style.fontSize = '12px';
  overlay.style.zIndex = '9999999';
  overlay.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  overlay.style.pointerEvents = 'none';
  return overlay;
}

function createTitleOverlay() {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.right = '40px'; // Space for the close button
  overlay.style.padding = '2px 6px';
  overlay.style.margin = '8px';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  overlay.style.color = 'white';
  overlay.style.borderRadius = '4px';
  overlay.style.fontSize = '11px';
  overlay.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  overlay.style.lineHeight = '16px';
  overlay.style.zIndex = '9999999';
  overlay.style.pointerEvents = 'none';
  return overlay;
}

function updateOverlay(memoryUsage: number, settings: Settings) {
  if (!settings.showOverlay) {
    if (memoryOverlay) {
      memoryOverlay.remove();
      memoryOverlay = null;
    }
    return;
  }

  const memoryText = `${Math.round(memoryUsage)} MB`;

  if (settings.overlayPosition === 'corner') {
    if (!memoryOverlay || memoryOverlay.style.top !== '8px') {
      if (memoryOverlay) memoryOverlay.remove();
      memoryOverlay = createCornerOverlay();
      document.body.appendChild(memoryOverlay);
    }
    memoryOverlay.textContent = `RAM: ${memoryText}`;
  } else {
    // Title position
    if (!memoryOverlay || memoryOverlay.style.top !== '0') {
      if (memoryOverlay) memoryOverlay.remove();
      memoryOverlay = createTitleOverlay();
      document.body.appendChild(memoryOverlay);
    }
    memoryOverlay.textContent = memoryText;
  }
}

// Listen for memory updates from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_MEMORY') {
    currentSettings = message.settings;
    updateOverlay(message.memoryUsage, message.settings);
  }
  sendResponse({});
  return true;
});

// Request initial memory data
chrome.runtime.sendMessage({ type: 'GET_TAB_MEMORY' }); 