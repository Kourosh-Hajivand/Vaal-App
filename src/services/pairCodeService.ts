import { storage } from "@/src/utils/storage";

const PAIR_CODE_KEY = "device_pair_code";

/**
 * Pair Code Service - Manage device pair code
 */
export const pairCodeService = {
    /**
     * Save pair code
     */
    save: async (pairCode: string): Promise<void> => {
        await storage.save(PAIR_CODE_KEY, pairCode);
    },

    /**
     * Get pair code
     */
    get: async (): Promise<string | null> => {
        return await storage.get(PAIR_CODE_KEY);
    },

    /**
     * Remove pair code
     */
    remove: async (): Promise<void> => {
        await storage.remove(PAIR_CODE_KEY);
    },
};
