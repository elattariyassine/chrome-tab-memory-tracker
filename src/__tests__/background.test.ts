import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TabInfo, Settings } from '../types';

// Mock chrome API
const mockChrome = {
  tabs: {
    query: vi.fn(),
    reload: vi.fn(),
    remove: vi.fn(),
    discard: vi.fn(),
    sendMessage: vi.fn(),
  },
  processes: {
    getProcessInfo: vi.fn(),
  },
  storage: {
    sync: {
      get: vi.fn(),
      set: vi.fn(),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
  scripting: {
    executeScript: vi.fn(),
  },
};

// Setup global chrome mock
global.chrome = mockChrome as any;

describe('Background Script', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Memory Usage Calculation', () => {
    it('should calculate memory usage correctly from process info', async () => {
      const mockProcesses = [{
        id: 1,
        privateMemory: 1024 * 1024 * 100, // 100MB
        tasks: [{ tabId: 123 }],
      }];

      mockChrome.processes.getProcessInfo.mockResolvedValue(mockProcesses);

      const { getTabMemoryUsage } = await import('../background');
      const result = await getTabMemoryUsage({ id: 123 } as chrome.tabs.Tab);

      expect(result).toBe(100); // Should be 100MB
    });

    it('should fall back to estimation when process info is not available', async () => {
      mockChrome.processes.getProcessInfo.mockRejectedValue(new Error('Not available'));

      const { getTabMemoryUsage } = await import('../background');
      const result = await getTabMemoryUsage({
        id: 123,
        audible: true,
        status: 'complete',
        active: true,
      } as chrome.tabs.Tab);

      expect(result).toBeGreaterThan(0);
    });
  });

  describe('High Memory Tab Handling', () => {
    it('should auto-reload high memory tabs when enabled', async () => {
      const { handleHighMemoryTab } = await import('../background');
      const tab = { id: 123, url: 'https://example.com' } as chrome.tabs.Tab;
      const settings: Settings = {
        autoReload: true,
        memoryThreshold: 100,
        // ... other settings
      } as Settings;

      await handleHighMemoryTab(tab, 150, settings);
      expect(mockChrome.tabs.reload).toHaveBeenCalledWith(123);
    });

    it('should auto-snooze high memory tabs when enabled', async () => {
      const { handleHighMemoryTab } = await import('../background');
      const tab = { id: 123, url: 'https://example.com' } as chrome.tabs.Tab;
      const settings: Settings = {
        autoSnooze: true,
        memoryThreshold: 100,
        snoozeDuration: 5,
        // ... other settings
      } as Settings;

      await handleHighMemoryTab(tab, 150, settings);
      expect(mockChrome.tabs.discard).toHaveBeenCalledWith(123);
    });
  });

  describe('Memory History Tracking', () => {
    it('should maintain memory history for tabs', async () => {
      const { updateTabMemoryHistory } = await import('../background');
      const tab: TabInfo = {
        id: 123,
        title: 'Test Tab',
        url: 'https://example.com',
        memoryInfo: { privateMemory: 100, sharedMemory: 0 },
        history: [],
        isHighMemory: false,
      };

      const updatedTab = updateTabMemoryHistory(tab, 150, 5);
      expect(updatedTab.history).toHaveLength(1);
      expect(updatedTab.history[0].memory).toBe(150);
    });

    it('should limit history length', async () => {
      const { updateTabMemoryHistory } = await import('../background');
      const tab: TabInfo = {
        id: 123,
        title: 'Test Tab',
        url: 'https://example.com',
        memoryInfo: { privateMemory: 100, sharedMemory: 0 },
        history: Array(5).fill(null).map((_, i) => ({
          timestamp: Date.now() - i * 1000,
          memory: 100 + i,
        })),
        isHighMemory: false,
      };

      const updatedTab = updateTabMemoryHistory(tab, 150, 5);
      expect(updatedTab.history).toHaveLength(5);
      expect(updatedTab.history[0].memory).toBe(150);
    });
  });

  describe('Settings Management', () => {
    it('should load default settings when none exist', async () => {
      mockChrome.storage.sync.get.mockImplementation((_, callback) => {
        callback({});
      });

      const { loadSettings } = await import('../background');
      const settings = await loadSettings();

      expect(settings).toMatchObject({
        darkMode: false,
        detailedView: true,
        showOverlay: true,
        overlayColor: '#000000',
        historyLength: 50,
      });
    });

    it('should save settings correctly', async () => {
      const { saveSettings } = await import('../background');
      const settings: Settings = {
        darkMode: true,
        detailedView: false,
        showOverlay: true,
        overlayColor: '#FF0000',
        historyLength: 10,
        // ... other settings
      } as Settings;

      await saveSettings(settings);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({ settings });
    });
  });
}); 