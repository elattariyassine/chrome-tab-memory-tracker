export const formatMemory = (bytes: number): string => {
  const mb = bytes;
  if (mb < 1024) {
    return `${Math.round(mb)} MB`;
  } else {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
}; 