import { vi } from 'vitest';

export interface Chrome {
  processes: Processes;
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
  getProcessInfo(): Promise<ProcessInfo[]>;
}

// Mock chrome API
const mockChrome = {
  storage: {
    sync: {
      get: vi.fn().mockImplementation((
        keys: string | string[] | Record<string, unknown> | null,
        callback: (items: Record<string, unknown>) => void
      ) => {
        callback({ settings: {} });
      }),
      set: vi.fn().mockImplementation((
        items: Record<string, unknown>,
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
        (mockChrome.runtime.onMessage.addListener as { callback: (message: unknown) => void }).callback = callback;
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
