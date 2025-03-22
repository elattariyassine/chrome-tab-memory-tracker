import React, { useEffect, useState } from 'react';
import { TabInfo, MemoryInfo, Settings } from '../types';
import { formatMemory } from '../utils';

const Popup: React.FC = () => {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [systemMemory, setSystemMemory] = useState<MemoryInfo | null>(null);
  const [settings, setSettings] = useState<Settings>({
    darkMode: false,
    detailedView: true,
    autoReload: false,
    autoSnooze: false,
    memoryThreshold: 500,
    snoozeDuration: 30,
    refreshInterval: 5000,
    showOverlay: true,
    overlayPosition: 'corner',
  });
  const [activeTab, setActiveTab] = useState<'tabs' | 'settings'>('tabs');
  const [sortBy, setSortBy] = useState<'memory' | 'title'>('memory');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load settings from storage
    chrome.storage.sync.get(['settings'], (result) => {
      if (result.settings) {
        setSettings(result.settings);
        document.documentElement.classList.toggle('dark', result.settings.darkMode);
      } else {
        // Initialize settings if they don't exist
        const defaultSettings = {
          darkMode: false,
          detailedView: true,
          autoReload: false,
          autoSnooze: false,
          memoryThreshold: 500,
          snoozeDuration: 30,
          refreshInterval: 5000,
          showOverlay: true,
          overlayPosition: 'corner' as const,
        };
        chrome.storage.sync.set({ settings: defaultSettings });
        setSettings(defaultSettings);
      }
    });

    // Load system memory info and set up periodic updates
    const updateSystemMemory = () => {
      chrome.system.memory.getInfo((info) => {
        // Convert bytes to MB
        setSystemMemory({
          availableCapacity: info.availableCapacity / (1024 * 1024),
          capacity: info.capacity / (1024 * 1024)
        });
      });
    };
    updateSystemMemory();
    const intervalId = setInterval(updateSystemMemory, settings.refreshInterval);

    // Load tabs and memory info
    loadTabs();
    const tabsIntervalId = setInterval(loadTabs, settings.refreshInterval);

    return () => {
      clearInterval(intervalId);
      clearInterval(tabsIntervalId);
    };
  }, [settings.refreshInterval]);

  const loadTabs = async () => {
    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_TABS' });
      if (response?.tabs) {
        setTabs(response.tabs);
      }
    } catch (error) {
      console.error('Error loading tabs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseTab = async (tabId: number) => {
    try {
      await chrome.runtime.sendMessage({ type: 'CLOSE_TAB', tabId });
      setTabs(tabs.filter(tab => tab.id !== tabId));
    } catch (error) {
      console.error('Error closing tab:', error);
    }
  };

  const handleReloadTab = async (tabId: number) => {
    try {
      await chrome.runtime.sendMessage({ type: 'RELOAD_TAB', tabId });
      await loadTabs();
    } catch (error) {
      console.error('Error reloading tab:', error);
    }
  };

  const handleSettingsChange = (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    chrome.storage.sync.set({ settings: updatedSettings });
    if (newSettings.darkMode !== undefined) {
      document.documentElement.classList.toggle('dark', newSettings.darkMode);
    }
  };

  const sortedTabs = [...tabs].sort((a, b) => {
    if (sortBy === 'memory') {
      return b.memoryInfo.privateMemory - a.memoryInfo.privateMemory;
    }
    return a.title.localeCompare(b.title);
  });

  const totalMemory = tabs.reduce((sum, tab) => sum + tab.memoryInfo.privateMemory, 0);
  const totalMemoryPercentage = systemMemory ? (totalMemory / systemMemory.capacity) * 100 : 0;

  return (
    <div className="w-[400px] h-[600px] flex flex-col bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Tab RAM Tracker</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSettingsChange({ darkMode: !settings.darkMode })}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {settings.darkMode ? '🌞' : '🌙'}
            </button>
            <button
              onClick={() => handleSettingsChange({ detailedView: !settings.detailedView })}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {settings.detailedView ? '📊' : '📋'}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Memory Usage:</span>
            <span className="text-sm font-medium">
              {formatMemory(totalMemory)} / {systemMemory ? formatMemory(systemMemory.capacity) : '0 MB'}
            </span>
          </div>
          <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full transition-all duration-300"
              style={{
                width: `${Math.min(totalMemoryPercentage, 100)}%`,
                backgroundColor: totalMemoryPercentage > 80 ? '#ef4444' : totalMemoryPercentage > 60 ? '#f59e0b' : '#22c55e'
              }}
            />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="sticky top-[116px] z-10 bg-white dark:bg-gray-800 flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('tabs')}
            className={`px-3 py-1 rounded-md ${
              activeTab === 'tabs'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Tabs
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1 rounded-md ${
              activeTab === 'settings'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Settings
          </button>
        </div>
        {activeTab === 'tabs' && (
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'memory' | 'title')}
            className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <option value="memory">Sort by Memory</option>
            <option value="title">Sort by Title</option>
          </select>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'tabs' ? (
          isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedTabs.map((tab) => (
                <div
                  key={tab.id}
                  className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      {tab.favIconUrl && (
                        <img
                          src={tab.favIconUrl}
                          alt=""
                          className="w-4 h-4 flex-shrink-0"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      )}
                      <span className="font-medium truncate">{tab.title}</span>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatMemory(tab.memoryInfo.privateMemory)}
                      </span>
                      <button
                        onClick={() => handleReloadTab(tab.id)}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        🔄
                      </button>
                      <button
                        onClick={() => handleCloseTab(tab.id)}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                  {settings.detailedView && (
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="flex-shrink-0">URL:</span>
                        <span className="truncate">{tab.url}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="flex-shrink-0">Status:</span>
                        <span>
                          {tab.status === 'complete' ? 'Loaded' : tab.status === 'unloaded' ? 'Suspended' : tab.status}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Refresh Interval (ms)</label>
              <input
                type="number"
                min="1000"
                max="10000"
                step="1000"
                value={settings.refreshInterval}
                onChange={(e) => handleSettingsChange({ refreshInterval: Math.max(1000, parseInt(e.target.value)) })}
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                How often to update memory information (1000ms - 10000ms)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Memory Threshold (MB)</label>
              <input
                type="number"
                min="100"
                max="5000"
                value={settings.memoryThreshold}
                onChange={(e) => handleSettingsChange({ memoryThreshold: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Tabs using more than this amount of memory will be considered high-memory tabs
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Snooze Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.snoozeDuration}
                onChange={(e) => handleSettingsChange({ snoozeDuration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                How long to wait before reactivating snoozed tabs
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                checked={settings.autoReload}
                onChange={(e) => handleSettingsChange({ autoReload: e.target.checked })}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 focus:ring-offset-white bg-white"
              />
              <label className="flex-1">
                <span className="text-sm font-medium block">Auto Reload High Memory Tabs</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically reload tabs that exceed the memory threshold
                </p>
              </label>
            </div>
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                checked={settings.autoSnooze}
                onChange={(e) => handleSettingsChange({ autoSnooze: e.target.checked })}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 focus:ring-offset-white bg-white"
              />
              <label className="flex-1">
                <span className="text-sm font-medium block">Auto Snooze High Memory Tabs</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically suspend tabs that exceed the memory threshold
                </p>
              </label>
            </div>

            {/* Overlay Settings */}
            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  checked={settings.showOverlay}
                  onChange={(e) => handleSettingsChange({ showOverlay: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 focus:ring-offset-white bg-white"
                />
                <label className="flex-1">
                  <span className="text-sm font-medium block">Show Memory Overlay</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Display memory usage overlay on each tab
                  </p>
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Overlay Position</label>
                <div className="flex items-center space-x-4">
                  <label className={`flex items-center space-x-2 ${!settings.showOverlay ? 'opacity-50' : ''}`}>
                    <input
                      type="radio"
                      checked={settings.overlayPosition === 'corner'}
                      onChange={() => handleSettingsChange({ overlayPosition: 'corner' })}
                      disabled={!settings.showOverlay}
                      className="w-4 h-4 text-blue-500 focus:ring-blue-500 focus:ring-offset-white bg-white"
                    />
                    <span className="text-sm">Corner</span>
                  </label>
                  <label className={`flex items-center space-x-2 ${!settings.showOverlay ? 'opacity-50' : ''}`}>
                    <input
                      type="radio"
                      checked={settings.overlayPosition === 'title'}
                      onChange={() => handleSettingsChange({ overlayPosition: 'title' })}
                      disabled={!settings.showOverlay}
                      className="w-4 h-4 text-blue-500 focus:ring-blue-500 focus:ring-offset-white bg-white"
                    />
                    <span className="text-sm">Tab Title</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Choose where to display the memory usage overlay
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Popup; 