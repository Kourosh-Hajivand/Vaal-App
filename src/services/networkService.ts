import NetInfo from "@react-native-community/netinfo";

/**
 * Network Service - Check internet connectivity and get IP address
 */
export const networkService = {
    /**
     * Check if device is connected to internet
     */
    isConnected: async (): Promise<boolean> => {
        try {
            const state = await NetInfo.fetch();
            return state.isConnected === true && state.isInternetReachable === true;
        } catch (error) {
            console.error("Error checking network:", error);
            return false;
        }
    },

    /**
     * Get device IP address
     */
    getIpAddress: async (): Promise<string | null> => {
        try {
            const state = await NetInfo.fetch();
            if (state.isConnected && state.details) {
                // @ts-ignore - NetInfo types may not include ipAddress
                const ipAddress = state.details.ipAddress || null;
                return ipAddress;
            }
            return null;
        } catch (error) {
            console.error("Error getting IP address:", error);
            return null;
        }
    },

    /**
     * Subscribe to network state changes
     */
    subscribe: (callback: (isConnected: boolean) => void) => {
        return NetInfo.addEventListener((state) => {
            callback(state.isConnected === true && state.isInternetReachable === true);
        });
    },
};
