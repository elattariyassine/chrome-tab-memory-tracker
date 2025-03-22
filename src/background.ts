import { TabInfo, Settings, TabMemoryHistory } from './types';

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
  overlayColor: '#000000',
  historyLength: 50,
};

let currentSettings: Settings = DEFAULT_SETTINGS;
const snoozeTimeouts: { [tabId: number]: number } = {};
const tabsHistory: { [tabId: number]: TabMemoryHistory[] } = {};

// Function to update tab memory history
export function updateTabMemoryHistory(tab: TabInfo, memoryUsage: number, historyLength: number = 50): TabInfo {
  if (!tabsHistory[tab.id]) {
    tabsHistory[tab.id] = [];
  }

  // Add new memory usage to history
  tabsHistory[tab.id].unshift({
    timestamp: Date.now(),
    memory: memoryUsage,
  });

  // Limit history length
  if (tabsHistory[tab.id].length > historyLength) {
    tabsHistory[tab.id] = tabsHistory[tab.id].slice(0, historyLength);
  }

  return {
    ...tab,
    history: [...tabsHistory[tab.id]],
    isHighMemory: memoryUsage > currentSettings.memoryThreshold,
  };
}

// Function to get accurate memory usage for a tab
export async function getTabMemoryUsage(tab: chrome.tabs.Tab): Promise<number> {
  try {
    // Get process info for the tab
    const processes = await chrome.processes.getProcessInfo(["memory"]);
    const tabProcess = processes.find(process => {
      return process.tasks?.some(task => task.tabId === tab.id);
    });

    if (tabProcess) {
      // Convert bytes to MB
      const privateMemory = Math.round(tabProcess.privateMemory! / (1024 * 1024));
      const jsMemory = Math.round((tabProcess.jsMemoryAllocated || 0) / (1024 * 1024));
      const sharedMemory = Math.round((tabProcess.sharedMemory || 0) / (1024 * 1024));

      // Calculate total memory usage
      let totalMemory = privateMemory;

      // Add JS memory if available and not included in private memory
      if (jsMemory > 0) {
        totalMemory += jsMemory;
      }

      // Add a portion of shared memory (we'll count 1/3 of shared memory)
      totalMemory += Math.round(sharedMemory / 3);

      return totalMemory;
    }
  } catch (error) {
    console.log('Falling back to estimation for tab:', tab.id);
  }

  // Fallback to estimation if process info is not available
  return estimateTabMemory(tab);
}

// Function to handle high memory tabs
export async function handleHighMemoryTab(tab: chrome.tabs.Tab, memoryUsage: number) {
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
              await chrome.tabs.reload(tab.id!);
              console.log(`Waking up snoozed tab: ${tab.id}`);
              delete snoozeTimeouts[tab.id!];
            } catch (error) {
              console.error(`Error waking up tab ${tab.id}:`, error);
            }
          }, currentSettings.snoozeDuration * 60 * 1000);
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
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
    } else {
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
    // Ignore errors for restricted tabs
  }
}

// Load settings from storage
export function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['settings'], (result) => {
      if (result.settings) {
        currentSettings = result.settings;
      }
      resolve(currentSettings);
    });
  });
}

// Save settings to storage
export function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ settings }, () => {
      currentSettings = settings;
      resolve();
    });
  });
}

// Initialize
loadSettings().then(() => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) updateContentScriptForTab(tab.id);
    });
  });
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings) {
    const oldSettings = currentSettings;
    currentSettings = changes.settings.newValue;
    
    if (oldSettings.showOverlay !== currentSettings.showOverlay) {
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

// Fallback memory estimation function
function estimateTabMemory(tab: chrome.tabs.Tab): number {
  let memory = 150;

  if (tab.audible) memory += 100;
  if (tab.discarded) memory += 30;
  if (!tab.autoDiscardable) memory += 50;
  if (tab.url?.startsWith('chrome://')) memory += 80;
  if (tab.url?.startsWith('chrome-extension://')) memory += 60;
  if (tab.status === 'complete') memory += 50;
  if (tab.active) memory += 40;

  return memory;
}

// Function to get memory info for all tabs
async function getTabsMemoryInfo() {
  const tabs = await chrome.tabs.query({});
  const tabsInfo: TabInfo[] = [];

  for (const tab of tabs) {
    const memoryUsage = await getTabMemoryUsage(tab);

    // Handle high memory tabs
    await handleHighMemoryTab(tab, memoryUsage);

    // Create tab info with history
    const tabInfo = updateTabMemoryHistory({
      id: tab.id || 0,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      favIconUrl: tab.favIconUrl,
      status: tab.status || 'unknown',
      memoryInfo: {
        privateMemory: memoryUsage,
        sharedMemory: 0
      },
      history: [],
      isHighMemory: false,
    }, memoryUsage, currentSettings.historyLength || 50); // Add default value of 50

    // Send memory update to content script if overlay is enabled
    if (tab.id && !tab.url?.startsWith('chrome://') && currentSettings.showOverlay) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'UPDATE_MEMORY',
          memoryUsage,
          settings: currentSettings
        });
      } catch (error) {
        await updateContentScriptForTab(tab.id);
      }
    }

    tabsInfo.push(tabInfo);
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
    getTabMemoryUsage(sender.tab).then(memoryUsage => {
      sendResponse({
        type: 'UPDATE_MEMORY',
        memoryUsage,
        settings: currentSettings
      });
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

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (snoozeTimeouts[tabId]) {
    clearTimeout(snoozeTimeouts[tabId]);
    delete snoozeTimeouts[tabId];
  }
  delete tabsHistory[tabId];
});

// Set up periodic memory updates
setInterval(() => {
  getTabsMemoryInfo();
}, currentSettings.refreshInterval);
