/**
 * UUID generation utility that works in both browser and Node.js environments
 */

/**
 * Generate a UUID v4 string
 * Falls back to a polyfill if crypto.randomUUID is not available
 */
export const makeUUID = (): string => {
  // Check if we're in a browser environment with crypto.randomUUID support
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Check if we're in Node.js environment with crypto module
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  
  // Fallback polyfill for UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Generate a short UUID (8 characters) for use in filenames
 */
export const makeShortUUID = (): string => {
  const fullUUID = makeUUID();
  return fullUUID.replace(/-/g, '').substring(0, 8);
};