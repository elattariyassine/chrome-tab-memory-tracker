import { vi } from 'vitest';

export interface Chrome {
  processes: Processes;
  storage: {
    sync: {
      get: (keys: string | string[] | Record<string, unknown> | null, callback: (items: Record<string, unknown>) => void) => void;
      set: (items: Record<string, unknown>, callback?: () => void) => void;
    };
    onChanged: {
      addListener: (callback: () => void) => void;
    };
  };
  runtime: {
    sendMessage: (message: unknown, responseCallback?: (response: unknown) => void) => void;
    onMessage: {
      addListener: (callback: (message: unknown) => void) => void;
    };
  };
  tabs: {
    query: (queryInfo: unknown) => Promise<chrome.tabs.Tab[]>;
    get: (tabId: number) => Promise<chrome.tabs.Tab>;
    reload: (tabId: number) => Promise<void>;
    sendMessage: (tabId: number, message: unknown) => Promise<unknown>;
    discard: (tabId: number) => Promise<void>;
    onCreated: {
      addListener: (callback: (tab: chrome.tabs.Tab) => void) => void;
    };
    onUpdated: {
      addListener: (callback: (tabId: number, changeInfo: unknown, tab: chrome.tabs.Tab) => void) => void;
    };
    onRemoved: {
      addListener: (callback: (tabId: number) => void) => void;
    };
  };
  scripting: {
    executeScript: (details: unknown) => Promise<unknown[]>;
  };
  system: {
    memory: {
      getInfo: (callback: (info: { availableCapacity: number; capacity: number }) => void) => void;
    };
  };
}

export interface ProcessInfo {
  id: number;
  osProcessId: number;
  type: string;
  privateMemory: number;
  jsMemoryAllocated: number;
  sharedMemory: number;
  tasks: { tabId: number }[];
}

export interface Processes {
  getProcessInfo(flags: string[]): Promise<ProcessInfo[]>;
}

// Mock chrome API
const mockChrome = {
  storage: {
    sync: {
      get: vi.fn().mockImplementation((
          _keys: string | string[] | Record<string, unknown> | null,
        callback: (items: Record<string, unknown>) => void
      ) => {
        callback({ settings: {} });
      }),
      set: vi.fn().mockImplementation((
          _items: Record<string, unknown>,
        callback?: () => void
      ) => {
        callback?.();
      })
    },
    onChanged: {
      addListener: vi.fn()
    }
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn().mockImplementation((callback: (message: unknown) => void) => {
        (mockChrome.runtime.onMessage.addListener as unknown as { callback: (message: unknown) => void }).callback = callback;
      })
    }
  },
  tabs: {
    query: vi.fn(),
    get: vi.fn(),
    reload: vi.fn(),
    sendMessage: vi.fn(),
    discard: vi.fn(),
    onCreated: {
      addListener: vi.fn()
    },
    onUpdated: {
      addListener: vi.fn()
    },
    onRemoved: {
      addListener: vi.fn()
    }
  },
  processes: {
    getProcessInfo: vi.fn()
  },
  scripting: {
    executeScript: vi.fn()
  }
};

// Mock chrome global
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
global.chrome = mockChrome as unknown as Chrome;

// Mock Chart.js
declare global {
  interface Window {
    Chart: {
      register: () => void;
      CategoryScale: object;
      LinearScale: object;
      PointElement: object;
      LineElement: object;
      Title: object;
      Tooltip: object;
      Legend: object;
    };
  }
}

window.Chart = {
  register: vi.fn(),
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {}
};

// Mock ResizeObserver
window.ResizeObserver = class ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};
