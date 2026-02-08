/**
 * Sensor Debug Utility
 * برای دیباگ کردن مشکلات سنسور HLK-LD2410C
 */

export const SensorDebug = {
    /**
     * چک کردن وجود کتابخونه Serial Port
     */
    checkSerialPortAvailability: async () => {
        try {
            const SerialPortAPI = require('react-native-serial-port-api');
            console.log('✅ [Debug] react-native-serial-port-api is available');
            
            // چک کردن متدهای موجود
            console.log('📋 [Debug] Available methods:', Object.keys(SerialPortAPI.default || SerialPortAPI));
            
            return {
                available: true,
                module: SerialPortAPI.default || SerialPortAPI
            };
        } catch (error) {
            console.error('❌ [Debug] Serial Port API not available:', error);
            return {
                available: false,
                error: error
            };
        }
    },

    /**
     * لیست کردن پورت‌های موجود (اگر API پشتیبانی کنه)
     */
    listAvailablePorts: async () => {
        try {
            const SerialPortAPI = require('react-native-serial-port-api');
            const api = SerialPortAPI.default || SerialPortAPI;
            
            if (typeof api.list === 'function') {
                const ports = await api.list();
                console.log('📍 [Debug] Available ports:', ports);
                return ports;
            } else {
                console.warn('⚠️ [Debug] list() method not available');
                return null;
            }
        } catch (error) {
            console.error('❌ [Debug] Error listing ports:', error);
            return null;
        }
    },

    /**
     * تست اتصال به پورت
     */
    testConnection: async (path: string = '/dev/ttyS1', baudRate: number = 115200) => {
        console.log(`\n🧪 [Debug] Testing connection to ${path} @ ${baudRate}...`);
        
        try {
            const SerialPortAPI = require('react-native-serial-port-api');
            const api = SerialPortAPI.default || SerialPortAPI;
            
            console.log('🔌 [Debug] Attempting to open port...');
            const port = await api.open(path, { baudRate });
            
            if (!port) {
                console.error('❌ [Debug] Port opened but returned null/undefined');
                return {
                    success: false,
                    error: 'Port is null'
                };
            }
            
            console.log('✅ [Debug] Port opened successfully:', port);
            console.log('📋 [Debug] Port methods:', Object.keys(port));
            
            // تست ارسال یک کامند ساده
            try {
                const testCommand = 'FF000100'; // Enable Config
                const header = Buffer.from([0xFD, 0xFC, 0xFB, 0xFA]);
                const footer = Buffer.from([0x04, 0x03, 0x02, 0x01]);
                const body = Buffer.from(testCommand, 'hex');
                const length = Buffer.alloc(2);
                length.writeUInt16LE(body.length);
                
                const packet = Buffer.concat([header, length, body, footer]);
                
                console.log('📤 [Debug] Sending test command:', packet.toString('hex'));
                await port.send(packet.toString('hex'));
                console.log('✅ [Debug] Test command sent successfully');
            } catch (sendError) {
                console.error('❌ [Debug] Error sending test command:', sendError);
            }
            
            // تست دریافت داده
            try {
                console.log('📥 [Debug] Setting up data listener...');
                const subscription = port.onReceived((data: any) => {
                    console.log('📨 [Debug] Data received:', data);
                });
                
                setTimeout(() => {
                    subscription?.remove();
                    console.log('🛑 [Debug] Listener removed after 5s');
                }, 5000);
                
                console.log('✅ [Debug] Listener setup successful');
            } catch (listenerError) {
                console.error('❌ [Debug] Error setting up listener:', listenerError);
            }
            
            return {
                success: true,
                port
            };
            
        } catch (error: any) {
            console.error('❌ [Debug] Connection failed:', error);
            console.error('📋 [Debug] Error details:', {
                message: error?.message,
                code: error?.code,
                stack: error?.stack
            });
            
            return {
                success: false,
                error: error
            };
        }
    },

    /**
     * چک کردن دسترسی به فایل /dev/ttyS1
     */
    checkFileAccess: async (path: string = '/dev/ttyS1') => {
        try {
            const RNFS = require('react-native-fs');
            
            console.log(`🔍 [Debug] Checking file access: ${path}`);
            const exists = await RNFS.exists(path);
            
            if (exists) {
                console.log(`✅ [Debug] File exists: ${path}`);
                const stat = await RNFS.stat(path);
                console.log('📋 [Debug] File info:', stat);
                return {
                    exists: true,
                    stat
                };
            } else {
                console.warn(`⚠️ [Debug] File not found: ${path}`);
                return {
                    exists: false
                };
            }
        } catch (error) {
            console.error('❌ [Debug] Error checking file:', error);
            return {
                exists: false,
                error
            };
        }
    },

    /**
     * اجرای تمام تست‌ها
     */
    runAllTests: async () => {
        console.log('\n🚀 [Debug] Starting comprehensive sensor diagnostics...\n');
        
        // 1. چک کردن Serial Port API
        const apiCheck = await SensorDebug.checkSerialPortAvailability();
        
        if (!apiCheck.available) {
            console.error('\n❌ CRITICAL: Serial Port API not available!');
            console.error('💡 Solution: Run "npm install" and rebuild the app');
            return;
        }
        
        // 2. لیست پورت‌ها
        await SensorDebug.listAvailablePorts();
        
        // 3. چک کردن فایل (اگر react-native-fs نصب باشه)
        await SensorDebug.checkFileAccess('/dev/ttyS1');
        
        // 4. تست اتصال
        await SensorDebug.testConnection('/dev/ttyS1', 115200);
        
        console.log('\n✅ [Debug] Diagnostics complete!\n');
    }
};

// Export Buffer برای استفاده در تست‌ها
export { Buffer } from 'buffer';
