import { storage } from '@/src/utils/storage';

const TOKEN_KEY = 'device_token';

/**
 * Token Service - Manage device authentication token
 */
export const tokenService = {
  /**
   * Save device token
   */
  save: async (token: string): Promise<void> => {
    await storage.save(TOKEN_KEY, token);
  },

  /**
   * Get device token
   */
  get: async (): Promise<string | null> => {
    return await storage.get(TOKEN_KEY);
  },

  /**
   * Remove device token
   */
  remove: async (): Promise<void> => {
    await storage.remove(TOKEN_KEY);
  },

  /**
   * Check if token exists
   */
  exists: async (): Promise<boolean> => {
    const token = await tokenService.get();
    return token !== null;
  },
};

