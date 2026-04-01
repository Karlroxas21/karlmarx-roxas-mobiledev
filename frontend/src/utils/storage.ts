import { Platform } from 'react-native';

export const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    // For native, swap this with AsyncStorage when installed
    return null;
  },

  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    }
    // For native, swap this with AsyncStorage when installed
  },

  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    }
    // For native, swap this with AsyncStorage when installed
  },
};
