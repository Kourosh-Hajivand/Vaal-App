import { NativeModules, NativeEventEmitter, Platform, EmitterSubscription } from "react-native";

// ── Types ───────────────────────────────────────────────────────

/** Messages the native side can send to the web page */
export interface SensorUpdateMessage {
    type: "sensor_update";
    isPresence: boolean;
    statusText: string;
    distance: number;
    ts: number;
}

export interface AppStateMessage {
    type: "app_state";
    isOnline: boolean;
    tokenPresent: boolean;
    androidId: string;
    appVersion: string;
}

export interface SensorUnavailableMessage {
    type: "sensor_unavailable";
    reason: string;
}

export type NativeToWebMessage = SensorUpdateMessage | AppStateMessage | SensorUnavailableMessage;

/** Messages the web page can send to native */
export interface RequestResetMessage {
    type: "request_reset";
}

export interface RequestStatusMessage {
    type: "request_status";
}

export type WebToNativeMessage = RequestResetMessage | RequestStatusMessage;

/** Events emitted by the native module */
export type TwaEvent = "onTwaReady" | "onTwaMessage" | "onTwaClosed";

interface TwaMessageEvent {
    message: string; // JSON string of WebToNativeMessage
}

// ── Native Module interface ─────────────────────────────────────

interface TwaBridgeNative {
    launch(url: string): Promise<void>;
    sendMessage(json: string): Promise<boolean>;
    close(): Promise<void>;
    isReady(): Promise<boolean>;
    addListener(eventName: string): void;
    removeListeners(count: number): void;
}

// ── Singleton wrapper ───────────────────────────────────────────

const NativeModule: TwaBridgeNative | undefined =
    Platform.OS === "android" ? NativeModules.TwaBridge : undefined;

const eventEmitter: NativeEventEmitter | null =
    NativeModule ? new NativeEventEmitter(NativeModule as any) : null;

// Debug logging
if (Platform.OS === "android") {
    if (NativeModule) {
        console.log("✅ [TwaBridge] Native module loaded successfully");
    } else {
        console.error("❌ [TwaBridge] Native module NOT FOUND");
        console.error("Available modules:", Object.keys(NativeModules).filter(k => k.includes("Twa") || k.includes("Bridge")).join(", ") || "none");
    }
}

/**
 * TwaBridge — typed JS wrapper around the TwaBridge native module.
 *
 * Usage:
 *   await TwaBridge.launch("https://vaal.pixlink.ir");
 *   TwaBridge.onReady(() => console.log("channel open"));
 *   TwaBridge.onMessage((msg) => handleWebMessage(msg));
 *   await TwaBridge.send({ type: "sensor_update", ... });
 *   await TwaBridge.close();
 */
export const TwaBridge = {
    /** True when the native module is available (Android only). */
    isAvailable: !!NativeModule,

    /**
     * Launch a Trusted Web Activity in Chrome.
     * The promise resolves once the intent has been fired.
     */
    launch: async (url: string): Promise<void> => {
        if (!NativeModule) throw new Error("TwaBridge not available on this platform");
        return NativeModule.launch(url);
    },

    /**
     * Send a JSON message to the TWA page via postMessage.
     * Queues automatically if the channel is not yet ready.
     */
    send: async (message: NativeToWebMessage): Promise<boolean> => {
        if (!NativeModule) return false;
        return NativeModule.sendMessage(JSON.stringify(message));
    },

    /**
     * Close the TWA and bring the RN activity back to foreground.
     */
    close: async (): Promise<void> => {
        if (!NativeModule) return;
        return NativeModule.close();
    },

    /** Check whether the postMessage channel is established. */
    isReady: async (): Promise<boolean> => {
        if (!NativeModule) return false;
        return NativeModule.isReady();
    },

    // ── Event subscriptions ─────────────────────────────────────

    /** Called when the postMessage channel becomes ready. */
    onReady: (callback: () => void): EmitterSubscription | null => {
        if (!eventEmitter) return null;
        return eventEmitter.addListener("onTwaReady", callback);
    },

    /**
     * Called when the web page sends a message to native.
     * The callback receives the parsed WebToNativeMessage.
     */
    onMessage: (callback: (msg: WebToNativeMessage) => void): EmitterSubscription | null => {
        if (!eventEmitter) return null;
        return eventEmitter.addListener("onTwaMessage", (event: TwaMessageEvent) => {
            try {
                const parsed = JSON.parse(event.message) as WebToNativeMessage;
                callback(parsed);
            } catch (e) {
                console.warn("[TwaBridge] Failed to parse web message:", event.message);
            }
        });
    },

    /** Called when the TWA is closed or the service disconnects. */
    onClosed: (callback: () => void): EmitterSubscription | null => {
        if (!eventEmitter) return null;
        return eventEmitter.addListener("onTwaClosed", callback);
    },

    /** Remove all event listeners (call on unmount). */
    removeAllListeners: () => {
        eventEmitter?.removeAllListeners("onTwaReady");
        eventEmitter?.removeAllListeners("onTwaMessage");
        eventEmitter?.removeAllListeners("onTwaClosed");
    },
};
