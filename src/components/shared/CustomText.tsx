/**
 * Custom Text Component
 * Support for custom fonts: YekanBakh and Michroma
 * مشابه web version
 */
import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

export interface CustomTextProps {
    fontType: 'YekanBakh' | 'Michroma';
    weight?: 'Regular' | 'SemiBold' | 'Light' | 'Bold';
    size: number;
    style?: StyleProp<TextStyle>;
    children: React.ReactNode;
}

export const CustomText: React.FC<CustomTextProps> = ({ fontType, weight = 'Regular', size, style, children }) => {
    const fontFamily = `${fontType}-${weight}`;

    return <Text style={[{ fontFamily, fontSize: size }, style]}>{children}</Text>;
};
