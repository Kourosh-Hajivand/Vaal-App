/**
 * Emergency Mode Component
 * حالت اضطراری fullscreen
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CustomText } from '../shared/CustomText';

interface EmergencyProps {
    emergencyText?: string;
    textColor?: string;
    bgColor?: string;
}

export const Emergency: React.FC<EmergencyProps> = ({
    emergencyText = 'حالت اضطراری',
    textColor = '#FFFFFF',
    bgColor = '#DC2626',
}) => {
    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <CustomText fontType="YekanBakh" weight="Bold" size={48} style={{ color: textColor, textAlign: 'center' }}>
                {emergencyText}
            </CustomText>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
});
