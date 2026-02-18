/**
 * Main Screen
 * Two-column layout: Advertisement + Clock
 * با Dark/Light mode بر اساس ساعت ایران
 * Layout config از theme.config.ts
 */
import React from "react";
import { View, StyleSheet } from "react-native";
import { Advertisement } from "@/src/components/advertisement";
import { Clock } from "@/src/components/clock";
import { ErrorBoundary } from "@/src/components/shared/ErrorBoundary";
import { CustomText } from "@/src/components/shared/CustomText";
import { useTheme } from "@/src/contexts/ThemeContext";
import { LAYOUT_CONFIG } from "@/src/config/theme.config";
import { DebugPanelProvider } from "@/src/contexts/DebugPanelContext";

export const MainScreen: React.FC = () => {
    const { colors } = useTheme();

    return (
        <DebugPanelProvider>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Advertisement Section - 55% */}
                <View style={styles.advertisementSection}>
                    <ErrorBoundary
                        fallback={
                            <View
                                style={[
                                    styles.errorContainer,
                                    {
                                        backgroundColor: colors.errorBackground,
                                        borderColor: colors.errorBorder,
                                    },
                                ]}
                            >
                                <View style={styles.errorContent}>
                                    <CustomText fontType="YekanBakh" weight="SemiBold" size={16} style={{ color: colors.errorText, marginBottom: 8 }}>
                                        خطا در نمایش تبلیغات
                                    </CustomText>
                                    <CustomText fontType="YekanBakh" weight="Regular" size={14} style={{ color: colors.errorText, opacity: 0.8 }}>
                                        لطفاً صفحه را رفرش کنید
                                    </CustomText>
                                </View>
                            </View>
                        }
                    >
                        <Advertisement />
                    </ErrorBoundary>
                </View>

                {/* Clock Section - 45% */}
                <View style={styles.clockSection}>
                    <ErrorBoundary
                        fallback={
                            <View
                                style={[
                                    styles.errorContainer,
                                    {
                                        backgroundColor: colors.errorBackground,
                                        borderColor: colors.errorBorder,
                                    },
                                ]}
                            >
                                <View style={styles.errorContent}>
                                    <CustomText fontType="YekanBakh" weight="SemiBold" size={16} style={{ color: colors.errorText, marginBottom: 8 }}>
                                        خطا در نمایش ساعت
                                    </CustomText>
                                    <CustomText fontType="YekanBakh" weight="Regular" size={14} style={{ color: colors.errorText, opacity: 0.8 }}>
                                        لطفاً صفحه را رفرش کنید
                                    </CustomText>
                                </View>
                            </View>
                        }
                    >
                        <Clock />
                    </ErrorBoundary>
                </View>
            </View>
        </DebugPanelProvider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: "row",
        gap: LAYOUT_CONFIG.sectionGap,
        padding: LAYOUT_CONFIG.screenPadding,
    },
    advertisementSection: {
        flex: LAYOUT_CONFIG.advertisementWidth,
    },
    clockSection: {
        flex: LAYOUT_CONFIG.clockWidth,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: LAYOUT_CONFIG.borderRadius,
        borderWidth: 1,
    },
    errorContent: {
        alignItems: "center",
        padding: 24,
    },
});
