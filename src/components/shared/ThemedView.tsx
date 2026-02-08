/**
 * Themed View Component
 * A reusable View component - مشابه web version
 */
import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

export interface ThemedViewProps {
    style?: StyleProp<ViewStyle>;
    children: React.ReactNode;
}

export const ThemedView: React.FC<ThemedViewProps> = ({ style, children }) => {
    return <View style={style}>{children}</View>;
};
