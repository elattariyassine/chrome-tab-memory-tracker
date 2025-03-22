import React, { useEffect, useState } from 'react';
import Popup from './components/Popup';

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Load dark mode preference from storage
    chrome.storage.sync.get(['settings'], (result) => {
      if (result.settings?.darkMode) {
        setDarkMode(result.settings.darkMode);
        document.documentElement.classList.toggle('dark', result.settings.darkMode);
      }
    });
  }, []);

  useEffect(() => {
    // Listen for settings changes
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.settings?.newValue?.darkMode !== undefined) {
        setDarkMode(changes.settings.newValue.darkMode);
        document.documentElement.classList.toggle('dark', changes.settings.newValue.darkMode);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  return (
    <div className="w-[400px] h-[600px]">
      <Popup />
    </div>
  );
};

export default App;
