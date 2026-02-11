/**
 * Error Boundary Component
 * Catches React errors and displays fallback UI
 */
import React, { Component, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: Error): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to global error handler
        try {
            const { errorHandler } = require('../../utils/errorHandler');
            errorHandler.logError(error, false);
        } catch (e) {
            // Fallback if errorHandler not available
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }
        
        if (__DEV__) {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
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
