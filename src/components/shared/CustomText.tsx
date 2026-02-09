/**
 * Custom Text Component
 * Support for custom fonts: YekanBakh and Michroma
 * با پشتیبانی theme (safe fallback اگر ThemeProvider نباشه)
 */
import React from "react";
import { Text, TextStyle, StyleProp, TextProps } from "react-native";
import { useTheme } from "@/src/contexts/ThemeContext";

export interface CustomTextProps extends Omit<TextProps, "style" | "children"> {
    fontType: "YekanBakh" | "Michroma";
    weight?: "Regular" | "SemiBold" | "Light" | "Bold";
    size: number;
    style?: StyleProp<TextStyle>;
    children: React.ReactNode;
    applyThemeColor?: boolean; // آیا color از theme بیاد؟
}

export const CustomText: React.FC<CustomTextProps> = ({ fontType, weight = "Regular", size, style, children, applyThemeColor = true, ...rest }) => {
    const fontFamily = `${fontType}-${weight}`;

    // Safe theme access - اگر ThemeProvider نباشه، crash نکن
    let themeColor: string | undefined;
    try {
        const { colors } = useTheme();
        themeColor = colors.text;
    } catch (error) {
        // ThemeProvider not found - use default color
        themeColor = undefined;
    }

    const textStyle: StyleProp<TextStyle> = [{ fontFamily, fontSize: size }, applyThemeColor && themeColor ? { color: themeColor } : null, style];

    return (
        <Text style={textStyle} {...rest}>
            {children}
        </Text>
    );
};
