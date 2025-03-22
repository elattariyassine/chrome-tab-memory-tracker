import { TabInfo, Settings } from './types';

// Default settings
const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  detailedView: true,
  autoReload: false,
  autoSnooze: false,
  memoryThreshold: 500,
  snoozeDuration: 30,
  refreshInterval: 5000,
  showOverlay: true,
  overlayPosition: 'corner',
};

let currentSettings: Settings = DEFAULT_SETTINGS;
const snoozeTimeouts: { [tabId: number]: number } = {};

// Function to handle high memory tabs
async function handleHighMemoryTab(tab: chrome.tabs.Tab, memoryUsage: number) {
  if (!tab.id || tab.url?.startsWith('chrome://')) return;

  const isHighMemory = memoryUsage > currentSettings.memoryThreshold;
  
  if (isHighMemory) {
    if (currentSettings.autoReload) {
      try {
        await chrome.tabs.reload(tab.id);
        console.log(`Auto-reloaded high memory tab: ${tab.id}`);
      } catch (error) {
        console.error(`Error auto-reloading tab ${tab.id}:`, error);
      }
    }

    if (currentSettings.autoSnooze && !tab.url.startsWith('chrome://')) {
      try {
        // Clear any existing snooze timeout for this tab
        if (snoozeTimeouts[tab.id]) {
          clearTimeout(snoozeTimeouts[tab.id]);
          delete snoozeTimeouts[tab.id];
        }

        // Discard the tab
        await chrome.tabs.discard(tab.id);
        console.log(`Auto-snoozed high memory tab: ${tab.id}`);

        // Set up wake timeout if snooze duration is set
        if (currentSettings.snoozeDuration > 0) {
          snoozeTimeouts[tab.id] = window.setTimeout(async () => {
            try {
              // Reload the tab after snooze duration
              await chrome.tabs.reload(tab.id!);
              console.log(`Waking up snoozed tab: ${tab.id}`);
              delete snoozeTimeouts[tab.id!];
            } catch (error) {
              console.error(`Error waking up tab ${tab.id}:`, error);
            }
          }, currentSettings.snoozeDuration * 60 * 1000); // Convert minutes to milliseconds
        }
      } catch (error) {
        console.error(`Error auto-snoozing tab ${tab.id}:`, error);
      }
    }
  }
}

// Function to inject or remove content script based on settings
async function updateContentScriptForTab(tabId: number) {
  try {
    if (currentSettings.showOverlay) {
      // Inject content script if overlay is enabled
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
    } else {
      // Send message to remove overlay if it exists
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'UPDATE_MEMORY',
          memoryUsage: 0,
          settings: currentSettings
        });
      } catch (error) {
        // Content script not loaded, which is fine in this case
      }
    }
  } catch (error) {
    // Ignore errors for restricted tabs (chrome://, etc.)
  }
}

// Load settings from storage
chrome.storage.sync.get(['settings'], (result) => {
  if (result.settings) {
    currentSettings = result.settings;
    // Update content scripts for all tabs when settings are loaded
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) updateContentScriptForTab(tab.id);
      });
    });
  } else {
    chrome.storage.sync.set({ settings: currentSettings });
  }
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings) {
    const oldSettings = currentSettings;
    currentSettings = changes.settings.newValue;
    
    // If overlay setting changed, update all tabs
    if (oldSettings.showOverlay !== currentSettings.showOverlay ||
        oldSettings.overlayPosition !== currentSettings.overlayPosition) {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) updateContentScriptForTab(tab.id);
        });
      });
    }
  }
});

// Listen for new tabs
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id && currentSettings.showOverlay) {
    updateContentScriptForTab(tab.id);
  }
});

// Function to estimate memory usage for a tab
function estimateTabMemory(tab: chrome.tabs.Tab): number {
  let memory = 100; // Base memory usage

  // Add memory based on tab properties
  if (tab.audible) memory += 50;
  if (tab.discarded) memory += 20;
  if (!tab.autoDiscardable) memory += 30;

  // Add memory based on URL type
  if (tab.url?.startsWith('chrome://')) memory += 40;
  if (tab.url?.startsWith('chrome-extension://')) memory += 30;

  return memory;
}

// Function to get memory info for all tabs
async function getTabsMemoryInfo() {
  const tabs = await chrome.tabs.query({});
  const tabsInfo: TabInfo[] = [];

  for (const tab of tabs) {
    const memoryUsage = estimateTabMemory(tab);
    
    // Handle high memory tabs
    await handleHighMemoryTab(tab, memoryUsage);
    
    // Send memory update to content script if overlay is enabled
    if (tab.id && !tab.url?.startsWith('chrome://') && currentSettings.showOverlay) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'UPDATE_MEMORY',
          memoryUsage,
          settings: currentSettings
        });
      } catch (error) {
        // If content script is not loaded, inject it
        await updateContentScriptForTab(tab.id);
      }
    }

    tabsInfo.push({
      id: tab.id || 0,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      favIconUrl: tab.favIconUrl,
      status: tab.status || 'unknown',
      memoryInfo: {
        privateMemory: memoryUsage,
        sharedMemory: 0
      }
    });
  }

  return tabsInfo;
}

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TABS') {
    getTabsMemoryInfo().then(tabs => {
      sendResponse({ tabs });
    });
    return true;
  }

  if (message.type === 'GET_TAB_MEMORY' && sender.tab?.id) {
    const memoryUsage = estimateTabMemory(sender.tab);
    sendResponse({
      type: 'UPDATE_MEMORY',
      memoryUsage,
      settings: currentSettings
    });
    return true;
  }

  if (message.type === 'CLOSE_TAB' && message.tabId) {
    chrome.tabs.remove(message.tabId);
    return true;
  }

  if (message.type === 'RELOAD_TAB' && message.tabId) {
    chrome.tabs.reload(message.tabId);
    return true;
  }
});

// Clean up snooze timeouts when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (snoozeTimeouts[tabId]) {
    clearTimeout(snoozeTimeouts[tabId]);
    delete snoozeTimeouts[tabId];
  }
});

// Set up periodic memory updates
setInterval(() => {
  getTabsMemoryInfo();
}, currentSettings.refreshInterval); 