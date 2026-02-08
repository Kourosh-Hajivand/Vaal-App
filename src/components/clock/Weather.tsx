/**
 * Weather Widget
 * نمایش آب و هوا با icon
 */
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { CustomText } from '../shared/CustomText';
import { useDeviceManifest } from '@/src/hooks/device/useDeviceManifest';
import Svg, { Path } from 'react-native-svg';

export const Weather: React.FC = () => {
    const { weather } = useDeviceManifest();

    const weatherIcon = useMemo(() => {
        if (!weather?.icon) return null;

        // Simple weather icons using SVG paths
        const icons: Record<string, string> = {
            sun: 'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41',
            cloud: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z',
            rain: 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z',
        };

        return icons[weather.icon] || icons.sun;
    }, [weather?.icon]);

    if (!weather) return null;

    return (
        <View style={styles.container}>
            {weatherIcon && (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <Path d={weatherIcon} stroke="#000" />
                </Svg>
            )}
            <CustomText fontType="Michroma" weight="Regular" size={18}>
                {weather.temperature}°
            </CustomText>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
});
