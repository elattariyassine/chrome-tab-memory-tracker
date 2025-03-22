import { Settings } from './types';

let overlay: HTMLDivElement | null = null;

function createOverlay() {
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0px';
  overlay.style.right = '0px';
  overlay.style.padding = '4px 8px';
  overlay.style.fontSize = '12px';
  overlay.style.fontFamily = 'monospace';
  overlay.style.zIndex = '9999999';
  overlay.style.borderRadius = '0px 0px 0px 4px';
  overlay.style.opacity = '0.9';
  overlay.style.transition = 'opacity 0.2s ease-in-out';

  // Add hover effect
  overlay.addEventListener('mouseenter', (event: MouseEvent) => {
    const target = event.currentTarget as HTMLDivElement;
    target.style.opacity = '0.5';
  });
  overlay.addEventListener('mouseleave', (event: MouseEvent) => {
    const target = event.currentTarget as HTMLDivElement;
    target.style.opacity = '0.9';
  });

  document.body.appendChild(overlay);
}

function updateOverlay(memoryUsage: number, settings: Settings) {
  if (!settings.showOverlay) {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    return;
  }

  if (!overlay) {
    createOverlay();
  }

  if (overlay) {
    overlay.textContent = `${memoryUsage} MB`;
    overlay.style.backgroundColor = settings.overlayColor;
    overlay.style.color = getContrastColor(settings.overlayColor);
  }
}

// Helper function to determine text color based on background color
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const color = hexColor.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black or white based on luminance
  return luminance > 0.5 ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
}

// Listen for memory updates from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'UPDATE_MEMORY') {
    updateOverlay(message.memoryUsage, message.settings);
  }
});

// Request initial memory data
chrome.runtime.sendMessage({ type: 'GET_TAB_MEMORY' }); 