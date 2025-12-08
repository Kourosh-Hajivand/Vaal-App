import { storage } from './storage';

const TOKEN_KEY = 'device_token';

/**
 * Utility functions برای مدیریت token در storage
 * @deprecated Use tokenService instead
 */

export const tokenStorage = {
  /**
   * ذخیره token
   */
  save: async (token: string): Promise<void> => {
    await storage.save(TOKEN_KEY, token);
  },

  /**
   * دریافت token
   */
  get: async (): Promise<string | null> => {
    return await storage.get(TOKEN_KEY);
  },

  /**
   * حذف token
   */
  remove: async (): Promise<void> => {
    await storage.remove(TOKEN_KEY);
  },
};

