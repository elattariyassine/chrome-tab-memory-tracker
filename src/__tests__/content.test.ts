import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('Content Script', () => {
  let messageListener: (message: { type: 'UPDATE_MEMORY'; memoryUsage: number; settings: { showOverlay: boolean; overlayColor: string } }) => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    
    // Mock chrome.runtime.onMessage.addListener before importing the content script
    vi.spyOn(chrome.runtime.onMessage, 'addListener').mockImplementation((callback) => {
      messageListener = callback as typeof messageListener;
    });

    // Import the content script after setting up the mock
    await import('../content');
  });

  describe('Overlay Management', () => {
    it('should create overlay with correct styles', () => {
      // Simulate the message that triggers overlay creation
      messageListener({
        type: 'UPDATE_MEMORY',
        memoryUsage: 1000,
        settings: {
          showOverlay: true,
          overlayColor: '#ff0000'
        }
      });

      const overlay = document.querySelector('div') as HTMLDivElement;
      expect(overlay).toBeDefined();
      expect(overlay?.style.position).toBe('fixed');
      expect(overlay?.style.top).toBe('0px');
      expect(overlay?.style.right).toBe('0px');
      expect(overlay?.style.padding).toBe('4px 8px');
      expect(overlay?.style.fontSize).toBe('12px');
      expect(overlay?.style.fontFamily).toBe('monospace');
      expect(overlay?.style.zIndex).toBe('9999999');
      expect(overlay?.style.borderRadius).toBe('0px 0px 0px 4px');
      expect(overlay?.style.opacity).toBe('0.9');
      expect(overlay?.style.transition).toBe('opacity 0.2s ease-in-out');
      expect(overlay?.textContent).toBe('1000 MB');
      expect(overlay?.style.backgroundColor).toBe('rgb(255, 0, 0)');
      expect(overlay?.style.color).toBe('rgb(255, 255, 255)'); // White text for dark background
    });

    it('should remove overlay when showOverlay is false', () => {
      // First create the overlay
      messageListener({
        type: 'UPDATE_MEMORY',
        memoryUsage: 1000,
        settings: {
          showOverlay: true,
          overlayColor: '#ff0000'
        }
      });

      // Then hide it
      messageListener({
        type: 'UPDATE_MEMORY',
        memoryUsage: 1000,
        settings: {
          showOverlay: false,
          overlayColor: '#ff0000'
        }
      });

      const overlay = document.querySelector('div');
      expect(overlay).toBeNull();
    });

    it('should update overlay text and colors on new messages', () => {
      // First message
      messageListener({
        type: 'UPDATE_MEMORY',
        memoryUsage: 1000,
        settings: {
          showOverlay: true,
          overlayColor: '#ff0000'
        }
      });

      // Second message
      messageListener({
        type: 'UPDATE_MEMORY',
        memoryUsage: 2000,
        settings: {
          showOverlay: true,
          overlayColor: '#00ff00'
        }
      });

      const overlay = document.querySelector('div') as HTMLDivElement;
      expect(overlay?.textContent).toBe('2000 MB');
      expect(overlay?.style.backgroundColor).toBe('rgb(0, 255, 0)');
      expect(overlay?.style.color).toBe('rgb(0, 0, 0)'); // Black text for light background
    });
  });
});
