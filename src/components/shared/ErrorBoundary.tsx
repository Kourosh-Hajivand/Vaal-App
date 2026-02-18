/**
 * Error Boundary Component
 * Catches React errors and auto-restarts app (kiosk mode - no mouse)
 */
import React, { Component, ReactNode } from "react";
import { View, StyleSheet, Platform } from "react-native";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback: ReactNode;
    /** Auto-restart delay in ms (default 3000). Set 0 to disable. */
    autoRestartDelay?: number;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

const DEFAULT_AUTO_RESTART_DELAY = 3000;

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    private restartTimeoutId: ReturnType<typeof setTimeout> | null = null;

    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: Error): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        try {
            const { errorHandler } = require("../../utils/errorHandler");
            errorHandler.logError(error, false);
        } catch (e) {
            console.error("ErrorBoundary caught an error:", error, errorInfo);
        }
        if (__DEV__) {
            console.error("ErrorBoundary caught an error:", error, errorInfo);
        }

        // Kiosk mode: auto-restart after delay (no mouse/touch needed)
        const delay = this.props.autoRestartDelay ?? DEFAULT_AUTO_RESTART_DELAY;
        if (delay > 0 && Platform.OS !== "web") {
            this.restartTimeoutId = setTimeout(() => {
                try {
                    const RNRestart = require("react-native-restart").default;
                    RNRestart.restart();
                } catch (e) {
                    console.error("ErrorBoundary: failed to restart", e);
                }
            }, delay);
        }
    }

    componentWillUnmount() {
        if (this.restartTimeoutId) {
            clearTimeout(this.restartTimeoutId);
        }
    }

    render() {
        if (this.state.hasError) {
            return <View style={styles.container}>{this.props.fallback}</View>;
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
