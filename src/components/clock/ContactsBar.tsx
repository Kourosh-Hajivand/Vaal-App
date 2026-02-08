/**
 * Contacts Bar Component
 * نمایش مخاطبین ساختمان
 */
import React from "react";
import { View, StyleSheet, Linking } from "react-native";
import { CustomText } from "../shared/CustomText";
import { useDeviceContacts } from "@/src/hooks/device/useDeviceContacts";
import { useTheme } from "@/src/contexts/ThemeContext";
import Svg, { Path } from "react-native-svg";

export const ContactsBar: React.FC = () => {
    const { data: contacts, isLoading } = useDeviceContacts();
    const { colors } = useTheme();

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    if (!contacts || contacts.length === 0) return null;

    return (
        <View style={styles.container}>
            {contacts.map((contact, index) => (
                <View 
                    key={`${contact.name}-${contact.phone}-${index}`} 
                    style={[
                        styles.contactItem,
                        {
                            backgroundColor: colors.cardBackground,
                            borderColor: colors.border,
                        }
                    ]}
                >
                    <View style={styles.contactInfo}>
                        <CustomText 
                            fontType="YekanBakh" 
                            weight="Regular" 
                            size={9}
                            applyThemeColor={false}
                            style={{ color: colors.text, opacity: 0.6 }}
                        >
                            {contact.phone}
                        </CustomText>
                        <CustomText 
                            fontType="YekanBakh" 
                            weight="Regular" 
                            size={9}
                            applyThemeColor={false}
                            style={{ color: colors.text, opacity: 0.5 }}
                        >
                            {contact.role}:
                        </CustomText>
                    </View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        width: "100%",
    },
    contactItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        // backgroundColor و borderColor dynamic از theme
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
    },
    contactInfo: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
    },
    phoneText: {
        // color dynamic از theme
    },
    roleText: {
        // color dynamic از theme
    },
});
