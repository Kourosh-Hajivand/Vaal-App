/**
 * Themed View Component
 * A reusable View component with theme support
 */
import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';

export interface ThemedViewProps {
    style?: StyleProp<ViewStyle>;
    children: React.ReactNode;
    applyBackground?: boolean; // آیا background رنگ theme اعمال بشه؟
}

export const ThemedView: React.FC<ThemedViewProps> = ({ style, children, applyBackground = false }) => {
    const { colors } = useTheme();

    const themedStyle = applyBackground ? [{ backgroundColor: colors.cardBackground }, style] : style;

    return <View style={themedStyle}>{children}</View>;
};
