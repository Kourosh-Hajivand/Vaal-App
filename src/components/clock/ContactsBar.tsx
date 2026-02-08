/**
 * Contacts Bar Component
 * نمایش مخاطبین ساختمان
 */
import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { CustomText } from '../shared/CustomText';
import { useDeviceContacts } from '@/src/hooks/device/useDeviceInfo';
import Svg, { Path } from 'react-native-svg';

export const ContactsBar: React.FC = () => {
    const { data: contacts } = useDeviceContacts();

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    if (!contacts || contacts.length === 0) return null;

    return (
        <View style={styles.container}>
            {contacts.map((contact, index) => (
                <View key={`${contact.name}-${contact.phone}-${index}`} style={styles.contactItem}>
                    <View style={styles.contactInfo}>
                        <CustomText fontType="YekanBakh" weight="Regular" size={10} style={styles.phoneText}>
                            {contact.phone}
                        </CustomText>
                        <CustomText fontType="YekanBakh" weight="Regular" size={10} style={styles.roleText}>
                            :{contact.role}
                        </CustomText>
                    </View>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                        <Path
                            d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
                            fill="#6b7280"
                        />
                    </Svg>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    contactInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    phoneText: {
        color: '#4b5563',
    },
    roleText: {
        color: '#6b7280',
    },
});
