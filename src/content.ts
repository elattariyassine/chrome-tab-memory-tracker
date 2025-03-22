// Create and inject the overlay element
const createOverlay = () => {
  const overlay = document.createElement('div');
  overlay.id = 'tab-ram-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    pointer-events: none;
    transition: all 0.3s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
  `;
  document.body.appendChild(overlay);
  return overlay;
};

// Update the overlay with memory usage
const updateOverlay = (memory: number) => {
  let overlay = document.getElementById('tab-ram-overlay');
  if (!overlay) {
    overlay = createOverlay();
  }

  const memoryText = memory >= 1024 
    ? `${(memory / 1024).toFixed(1)} GB`
    : `${memory.toFixed(0)} MB`;

  // Color code based on memory usage
  let color;
  if (memory >= 1024) { // More than 1GB
    color = '#ef4444'; // Red
  } else if (memory >= 500) { // More than 500MB
    color = '#f59e0b'; // Yellow
  } else {
    color = '#22c55e'; // Green
  }

  overlay.style.backgroundColor = `${color}dd`; // Semi-transparent
  overlay.style.color = 'white';
  overlay.textContent = `RAM: ${memoryText}`;
};

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_TAB_MEMORY') {
    updateOverlay(message.memory);
  }
});

// Request initial memory data
chrome.runtime.sendMessage({ type: 'GET_TAB_MEMORY' }, (response) => {
  if (response?.memory) {
    updateOverlay(response.memory);
  }
}); 