/**
 * Error State Component
 * نمایش خطاها به صورت user-friendly
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CustomText } from './CustomText';

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message = 'خطایی رخ داده است', onRetry }) => {
    return (
        <View style={styles.container}>
            <CustomText fontType="YekanBakh" weight="SemiBold" size={18} style={styles.message}>
                {message}
            </CustomText>
            {onRetry && (
                <View style={styles.retryButton}>
                    <CustomText fontType="YekanBakh" weight="Regular" size={14} style={styles.retryText}>
                        تلاش مجدد
                    </CustomText>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    message: {
        color: '#DC2626',
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#2962FF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#FFF',
    },
});
