import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getTabMemoryUsage, handleHighMemoryTab, updateTabMemoryHistory, loadSettings, saveSettings } from '../background';
import type { TabInfo, Settings } from '../types';

const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  detailedView: false,
  autoReload: true,
  autoSnooze: false,
  memoryThreshold: 100,
  snoozeDuration: 30,
  refreshInterval: 60000,
  showOverlay: true,
  overlayColor: '#ff0000',
  historyLength: 10,
};

describe('Background Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock chrome.storage.sync.get to return default settings
    vi.spyOn(chrome.storage.sync, 'get').mockImplementation((
        _keys: string | string[] | { [key: string]: unknown } | null,
      callback: (items: { [key: string]: unknown }) => void
    ) => {
      callback({ settings: DEFAULT_SETTINGS });
    });
  });

  describe('Memory Usage Calculation', () => {
    it('should calculate memory usage correctly from process info', async () => {
      const tab = { id: 1, url: 'https://example.com' } as chrome.tabs.Tab;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      vi.spyOn(chrome.processes, 'getProcessInfo').mockResolvedValue([
        {
          id: 1,
          osProcessId: 123,
          type: 'renderer',
          privateMemory: 1000 * 1024 * 1024, // 1000MB in bytes
          jsMemoryAllocated: 200 * 1024 * 1024, // 200MB in bytes
          sharedMemory: 300 * 1024 * 1024, // 300MB in bytes
          tasks: [{ tabId: 1 }]
        }
      ]);

      const memoryUsage = await getTabMemoryUsage(tab);
      expect(memoryUsage).toBe(1300); // 1000MB + 200MB + (300MB/3)
    });

    it('should fall back to estimation when process info is not available', async () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        audible: true,
        discarded: false,
        autoDiscardable: true,
        status: 'complete',
        active: true
      } as chrome.tabs.Tab;

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      vi.spyOn(chrome.processes, 'getProcessInfo').mockResolvedValue([]);

      const memoryUsage = await getTabMemoryUsage(tab);
      expect(memoryUsage).toBe(340); // 150 + 100 + 50 + 40
    });
  });

  describe('High Memory Tab Handling', () => {
    it('should auto-reload high memory tabs when enabled', async () => {
      const tab = { id: 1, url: 'https://example.com' } as chrome.tabs.Tab;
      await handleHighMemoryTab(tab, 1000);
      expect(chrome.tabs.reload).toHaveBeenCalledWith(1);
    });

    it('should auto-snooze high memory tabs when enabled', async () => {
      const settings = { ...DEFAULT_SETTINGS, autoReload: false, autoSnooze: true };
      vi.spyOn(chrome.storage.sync, 'get').mockImplementation((
          _keys: string | string[] | { [key: string]: unknown } | null,
        callback: (items: { [key: string]: unknown }) => void
      ) => {
        callback({ settings });
      });

      const tab = { id: 1, url: 'https://example.com' } as chrome.tabs.Tab;
      await handleHighMemoryTab(tab, 1000);
      expect(chrome.tabs.discard).toHaveBeenCalledWith(1);
    });

    it('should not handle chrome:// tabs', async () => {
      const tab = { id: 1, url: 'chrome://settings' } as chrome.tabs.Tab;
      await handleHighMemoryTab(tab, 1000);
      expect(chrome.tabs.reload).not.toHaveBeenCalled();
      expect(chrome.tabs.discard).not.toHaveBeenCalled();
    });
  });

  describe('Memory History Tracking', () => {
    it('should maintain memory history for tabs', () => {
      const tab: TabInfo = {
        id: 1,
        title: 'Test Tab',
        url: 'https://example.com',
        status: 'complete',
        memoryInfo: {
          privateMemory: 1000,
          sharedMemory: 0
        },
        history: [],
        isHighMemory: false
      };

      let updatedTab = updateTabMemoryHistory(tab, 1000);
      expect(updatedTab.history).toHaveLength(1);
      expect(updatedTab.history[0].memory).toBe(1000);

      updatedTab = updateTabMemoryHistory(updatedTab, 2000);
      expect(updatedTab.history).toHaveLength(2);
      expect(updatedTab.history[0].memory).toBe(2000);
      expect(updatedTab.history[1].memory).toBe(1000);
    });

    it('should limit history length', async () => {
      const tab: TabInfo = {
        id: 1,
        title: 'Test Tab',
        url: 'https://example.com',
        status: 'complete',
        memoryInfo: {
          privateMemory: 0,
          sharedMemory: 0
        },
        history: [],
        isHighMemory: false
      };

      const settings = { ...DEFAULT_SETTINGS, historyLength: 2 };
      vi.spyOn(chrome.storage.sync, 'get').mockImplementation((
          _keys: string | string[] | { [key: string]: unknown } | null,
        callback: (items: { [key: string]: unknown }) => void
      ) => {
        callback({ settings });
      });

      let updatedTab = updateTabMemoryHistory(tab, 1000);
      updatedTab = updateTabMemoryHistory(updatedTab, 2000);
      updatedTab = updateTabMemoryHistory(updatedTab, 3000);

      expect(updatedTab.history).toHaveLength(5);
      expect(updatedTab.history[0].memory).toBe(3000);
      expect(updatedTab.history[1].memory).toBe(2000);
    });
  });

  describe('Settings Management', () => {
    it('should load default settings when none exist', async () => {
      vi.spyOn(chrome.storage.sync, 'get').mockImplementation((
          _keys: string | string[] | { [key: string]: unknown } | null,
        callback: (items: { [key: string]: unknown }) => void
      ) => {
        callback({});
      });

      const settings = await loadSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should save settings correctly', async () => {
      const newSettings: Settings = { ...DEFAULT_SETTINGS, darkMode: true };
      vi.spyOn(chrome.storage.sync, 'set').mockImplementation((
          _items: { [key: string]: unknown },
        callback?: () => void
      ) => {
        callback?.();
      });

      await saveSettings(newSettings);
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(
        { settings: newSettings },
        expect.any(Function)
      );
    });
  });
}); 
