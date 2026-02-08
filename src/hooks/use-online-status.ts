/**
 * Hook برای track کردن وضعیت اینترنت
 * استفاده از NetInfo برای React Native
 */
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export const useOnlineStatus = () => {
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [connectionType, setConnectionType] = useState<string>('unknown');

    useEffect(() => {
        // چک اولیه
        NetInfo.fetch().then(state => {
            setIsOnline(state.isConnected ?? false);
            setConnectionType(state.type || 'unknown');
            console.log('[useOnlineStatus] Initial status:', state.isConnected ? 'Online' : 'Offline', `(${state.type})`);
        });

        // گوش دادن به تغییرات
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOnline(state.isConnected ?? false);
            setConnectionType(state.type || 'unknown');
            console.log('[useOnlineStatus] Status changed:', state.isConnected ? 'Online' : 'Offline', `(${state.type})`);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return {
        isOnline,
        connectionType,
    };
};
