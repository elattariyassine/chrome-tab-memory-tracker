import {ProcessInfo} from "./__tests__/setup.ts";

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
export interface Chrome {
  processes: {
    getProcessInfo(flags: string[]): Promise<ProcessInfo[]>;
  };
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    chrome: Chrome;
  }
} 
