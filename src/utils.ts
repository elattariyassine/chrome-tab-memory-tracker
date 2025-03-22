export const formatMemory = (mb: number): string => {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${Math.round(mb)} MB`;
};

export const formatTimestamp = (timestamp: number): string => {
  if (isNaN(timestamp)) {
    return 'Invalid Date';
  }
  return new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });
}; 