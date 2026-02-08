/**
 * Loading State Component
 * نمایش loading به صورت زیبا
 */
import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { CustomText } from './CustomText';

interface LoadingStateProps {
    message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'در حال بارگذاری...' }) => {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#2962FF" />
            <CustomText fontType="YekanBakh" weight="Regular" size={16} style={styles.message}>
                {message}
            </CustomText>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    message: {
        color: '#666',
        textAlign: 'center',
    },
});
