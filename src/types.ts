export interface MemoryInfo {
  availableCapacity: number; // in MB
  capacity: number; // in MB
}

export interface TabMemoryHistory {
  timestamp: number;
  memory: number;
}

export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  status: string;
  memoryInfo: {
    privateMemory: number; // in MB
    sharedMemory: number; // in MB
  };
  history: TabMemoryHistory[];
  isHighMemory: boolean;
}

export interface Settings {
  darkMode: boolean;
  detailedView: boolean;
  autoReload: boolean;
  autoSnooze: boolean;
  memoryThreshold: number; // in MB
  snoozeDuration: number; // in minutes
  refreshInterval: number; // in milliseconds
  showOverlay: boolean;
  overlayColor: string; // hex color code
  historyLength: number; // number of history entries to keep
}

// Chrome API types
declare global {
  interface Window {
    chrome: typeof chrome;
  }
}

// Chrome Processes API types
declare global {
  namespace chrome {
    namespace processes {
      interface ProcessInfo {
        id: number;
        osProcessId: number;
        type: string;
        profile: string;
        naclDebugPort?: number;
        title: string;
        privateMemory?: number;
        jsMemoryAllocated?: number;
        sharedMemory?: number;
        tasks?: {
          osProcessId: number;
          title: string;
          tabId?: number;
        }[];
      }

      function getProcessInfo(
        flags: string[],
      ): Promise<ProcessInfo[]>;
    }
  }
} 