# Tab RAM Tracker Chrome Extension

A developer-focused Chrome extension that provides real-time memory usage monitoring for browser tabs. This extension helps developers diagnose browser performance issues by tracking RAM consumption and suggesting optimizations.

## Features

- 🔍 Real-time RAM usage monitoring for each tab
- 📊 Total memory usage indicator
- ⚠️ High-memory tab highlighting
- 🔄 Quick tab reload/close actions
- 🌙 Dark mode support
- ⚙️ Customizable settings
- 📈 Memory usage history
- 🔔 Smart notifications

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/tab-ram-tracker.git
cd tab-ram-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` directory from this project

## Development

1. Start the development server:
```bash
npm run dev
```

2. Watch for changes during development:
```bash
npm run watch
```

3. Build for production:
```bash
npm run build
```

## Usage

1. Click the extension icon in your Chrome toolbar to open the popup
2. View real-time memory usage for all open tabs
3. Sort tabs by memory usage (highest to lowest)
4. Identify high-memory tabs (highlighted in red)
5. Take action:
   - Reload high-memory tabs
   - Close unnecessary tabs
   - Monitor total memory usage

## Settings

- **Update Interval**: Configure how often the memory usage is updated (default: 5 seconds)
- **High Memory Threshold**: Set the memory limit for highlighting tabs (default: 500MB)
- **Total Memory Threshold**: Set the system memory usage alert threshold (default: 75%)
- **Auto Snooze**: Enable automatic suspension of inactive high-memory tabs
- **Auto Reload**: Enable automatic reloading of high-memory tabs

## Privacy

This extension:
- Only requests necessary permissions
- Processes all data locally
- Does not collect or transmit any information
- Respects your privacy

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with React and TypeScript
- Uses Chrome Extension APIs
- Inspired by developer needs for better browser performance monitoring