export interface MemoryInfo {
  availableCapacity: number; // in MB
  capacity: number; // in MB
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
}

export interface Settings {
  darkMode: boolean;
  detailedView: boolean;
  autoReload: boolean;
  autoSnooze: boolean;
  memoryThreshold: number; // in MB
  snoozeDuration: number; // in minutes
  refreshInterval: number; // in milliseconds
  showOverlay: boolean; // whether to show memory overlay on tabs
  overlayPosition: 'corner' | 'title'; // where to display the overlay
}

// Chrome API types
declare global {
  interface Window {
    chrome: typeof chrome;
  }
} 