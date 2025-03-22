import { vi } from 'vitest';

declare global {
  namespace chrome {
    interface ProcessInfo {
      id: number;
      osProcessId: number;
      type: string;
      privateMemory: number;
      jsMemoryAllocated: number;
      sharedMemory: number;
      tasks: { tabId: number }[];
    }

    interface Processes {
      getProcessInfo(): Promise<ProcessInfo[]>;
    }

    interface Chrome {
      processes: Processes;
    }
  }
}

// Mock chrome API
const mockChrome = {
  storage: {
    sync: {
      get: vi.fn().mockImplementation((keys: string | string[] | { [key: string]: any } | null, callback: (items: { [key: string]: any }) => void) => {
        callback({ settings: {} });
      }),
      set: vi.fn().mockImplementation((items: { [key: string]: any }, callback?: () => void) => {
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
      addListener: vi.fn().mockImplementation((callback) => {
        // Store the callback for testing
        (mockChrome.runtime.onMessage.addListener as any).callback = callback;
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
global.chrome = mockChrome as unknown as typeof chrome;

// Mock Chart.js
declare global {
  interface Window {
    Chart: any;
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
  observe() {}
  unobserve() {}
  disconnect() {}
}; 