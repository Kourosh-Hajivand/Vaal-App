/**
 * Image Display Component
 * با Expo Image برای fast loading & cache support
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface ImageDisplayProps {
    uri: string;
    onError?: (error: any) => void;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ uri, onError }) => {
    const handleError = (error: any) => {
        console.error('[ImageDisplay] Error:', error);
        onError?.(error);
    };

    return (
        <View style={styles.container}>
            <Image
                source={{ uri }}
                style={styles.image}
                contentFit="cover"
                transition={300}
                cachePolicy="memory-disk"
                onError={handleError}
                priority="high"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
