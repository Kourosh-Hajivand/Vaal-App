/**
 * Themed Card Example
 * مثال کامل از نحوه استفاده از Theme در کامپوننت‌ها
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { CustomText } from '@/src/components/shared/CustomText';
import { useTheme } from '@/src/contexts/ThemeContext';
import { LAYOUT_CONFIG } from '@/src/config/theme.config';

interface ThemedCardProps {
    title: string;
    description: string;
    onPress?: () => void;
}

export const ThemedCard: React.FC<ThemedCardProps> = ({ title, description, onPress }) => {
    const { colors, mode } = useTheme();

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Header با mode indicator */}
            <View style={styles.header}>
                <CustomText fontType="YekanBakh" weight="SemiBold" size={18}>
                    {title}
                </CustomText>
                <View
                    style={[
                        styles.modeIndicator,
                        {
                            backgroundColor: mode === 'light' ? '#FCD34D' : '#818CF8',
                        },
                    ]}
                />
            </View>

            {/* Description */}
            <CustomText fontType="YekanBakh" weight="Regular" size={14} style={styles.description}>
                {description}
            </CustomText>

            {/* Footer با رنگ accent */}
            <View style={styles.footer}>
                <CustomText fontType="YekanBakh" weight="Regular" size={12} style={{ color: colors.info }}>
                    Current mode: {mode === 'light' ? '☀️ روز' : '🌙 شب'}
                </CustomText>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: LAYOUT_CONFIG.borderRadius,
        borderWidth: 1,
        padding: 16,
        marginVertical: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modeIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    description: {
        marginBottom: 12,
        opacity: 0.8,
    },
    footer: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(128, 128, 128, 0.2)',
    },
});

/**
 * نحوه استفاده:
 * 
 * <ThemedCard
 *     title="عنوان کارت"
 *     description="این یک مثال از کامپوننت با theme است"
 *     onPress={() => console.log('Card pressed')}
 * />
 */
