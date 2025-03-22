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
};

let settings = DEFAULT_SETTINGS;

// Initialize settings from storage
chrome.storage.sync.get(['settings'], (result) => {
  if (result.settings) {
    settings = result.settings;
  } else {
    chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
  }
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings) {
    settings = changes.settings.newValue;
  }
});

// Estimate memory usage based on tab properties
const estimateTabMemory = (tab: chrome.tabs.Tab): number => {
  // Base memory usage
  let memory = 50; // Base memory in MB

  // Add memory based on tab properties
  if (tab.audible) memory += 50; // Audio tabs use more memory
  if (tab.discarded) memory += 20; // Discarded tabs still use some memory
  if (tab.autoDiscardable === false) memory += 30; // Non-discardable tabs use more memory
  
  // Add memory based on tab type
  if (tab.url?.startsWith('chrome://')) memory += 100;
  else if (tab.url?.startsWith('chrome-extension://')) memory += 75;
  else if (tab.url?.startsWith('devtools://')) memory += 150;
  else if (tab.url?.startsWith('file://')) memory += 50;
  else memory += 100; // Regular web pages

  // Add memory based on tab status
  if (tab.status === 'complete') memory += 50;
  if (tab.active) memory += 25;

  return memory;
};

// Get memory info for all tabs
const getTabsMemoryInfo = async (): Promise<TabInfo[]> => {
  try {
    // Get all tabs
    const tabs = await chrome.tabs.query({});
    
    // Get detailed tab information
    const tabInfos: TabInfo[] = await Promise.all(
      tabs.map(async (tab) => {
        if (!tab.id) return null;
        
        try {
          // Get detailed tab information
          const detailedTab = await chrome.tabs.get(tab.id);
          
          // Estimate memory usage
          const memoryMB = estimateTabMemory(detailedTab);
          
          // Send memory info to content script
          if (tab.url && !tab.url.startsWith('chrome://')) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'UPDATE_TAB_MEMORY',
              memory: memoryMB
            }).catch(() => {
              // Ignore errors for tabs that can't receive messages
            });
          }

          // Handle high memory tabs
          if (memoryMB > settings.memoryThreshold) {
            if (settings.autoReload && !tab.url?.startsWith('chrome://')) {
              chrome.tabs.reload(tab.id);
            }
            if (settings.autoSnooze && !tab.url?.startsWith('chrome://')) {
              chrome.tabs.discard(tab.id);
            }
          }
          
          return {
            id: tab.id,
            title: tab.title || 'Untitled',
            url: tab.url || '',
            favIconUrl: tab.favIconUrl,
            status: tab.status || 'unknown',
            memoryInfo: {
              privateMemory: memoryMB,
              sharedMemory: 0
            }
          };
        } catch (error) {
          console.error(`Error getting memory info for tab ${tab.id}:`, error);
          return null;
        }
      })
    );

    return tabInfos.filter((info): info is TabInfo => info !== null);
  } catch (error) {
    console.error('Error getting tab information:', error);
    return [];
  }
};

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TABS') {
    getTabsMemoryInfo().then(tabs => {
      sendResponse({ tabs });
    });
    return true; // Will respond asynchronously
  }
  
  if (message.type === 'GET_TAB_MEMORY' && sender.tab?.id) {
    // Get memory info for the current tab
    chrome.tabs.get(sender.tab.id).then((tab) => {
      const memoryMB = estimateTabMemory(tab);
      sendResponse({ memory: memoryMB });
    });
    return true; // Will respond asynchronously
  }
  
  if (message.type === 'CLOSE_TAB') {
    chrome.tabs.remove(message.tabId);
  }
  
  if (message.type === 'RELOAD_TAB') {
    chrome.tabs.reload(message.tabId);
  }
}); 