/**
 * Sensor Test Screen
 * صفحه تست و دیباگ سنسور HLK-LD2410C
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from "react-native";
import { SensorDebug } from "../src/utils/sensorDebug";
import RadarLogic from "../RadarLogic";

export const SensorTestScreen: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [sensorData, setSensorData] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);

    const addLog = (message: string, type: "info" | "success" | "error" | "warning" = "info") => {
        const icons = {
            info: "ℹ️",
            success: "✅",
            error: "❌",
            warning: "⚠️",
        };
        const timestamp = new Date().toLocaleTimeString();
        const log = `${icons[type]} [${timestamp}] ${message}`;
        setLogs((prev) => [log, ...prev].slice(0, 50)); // Keep last 50 logs
        console.log(log);
    };

    const clearLogs = () => {
        setLogs([]);
    };

    // تست 1: چک کردن API
    const testAPI = async () => {
        addLog("Testing Serial Port API...", "info");
        const result = await SensorDebug.checkSerialPortAvailability();

        if (result.available) {
            addLog("Serial Port API is available!", "success");
        } else {
            addLog("Serial Port API NOT available!", "error");
            addLog(`Error: ${result.error}`, "error");
        }
    };

    // تست 2: لیست پورت‌ها
    const testListPorts = async () => {
        addLog("Listing available ports...", "info");
        const ports = await SensorDebug.listAvailablePorts();

        if (ports && ports.length > 0) {
            addLog(`Found ${ports.length} ports`, "success");
            ports.forEach((port: any) => {
                addLog(`Port: ${JSON.stringify(port)}`, "info");
            });
        } else if (ports === null) {
            addLog("list() method not supported", "warning");
        } else {
            addLog("No ports found", "warning");
        }
    };

    // تست 3: چک کردن فایل
    const testFileAccess = async () => {
        addLog("Checking /dev/ttyS1 file access...", "info");
        const result = await SensorDebug.checkFileAccess("/dev/ttyS1");

        if (result.exists) {
            addLog("File /dev/ttyS1 exists!", "success");
            if (result.stat) {
                addLog(`File info: ${JSON.stringify(result.stat)}`, "info");
            }
        } else {
            addLog("File /dev/ttyS1 NOT found!", "error");
            addLog("Sensor may not be connected or path is incorrect", "warning");
        }
    };

    // تست 4: اتصال مستقیم
    const testDirectConnection = async () => {
        addLog("Testing direct connection...", "info");
        const result = await SensorDebug.testConnection("/dev/ttyS1", 115200);

        if (result.success) {
            addLog("Direct connection successful!", "success");
            addLog("Waiting for sensor data... (check logs)", "info");
        } else {
            addLog("Direct connection failed!", "error");
            addLog(`Error: ${result.error?.message || result.error}`, "error");
        }
    };

    // تست 5: اتصال با RadarLogic
    const testRadarLogic = async () => {
        if (isConnected) {
            addLog("Already connected! Disconnect first.", "warning");
            return;
        }

        addLog("Connecting via RadarLogic...", "info");

        // Setup callbacks
        RadarLogic.onLog = (msg: string, type?: string) => {
            addLog(`[RadarLogic] ${msg}`, type === "error" ? "error" : "info");
        };

        RadarLogic.onDataUpdate = (data: any) => {
            setSensorData(data);
            addLog(`Data: ${data.statusText}, Distance: ${data.distance}cm, Presence: ${data.isPresence}`, "success");
        };

        RadarLogic.onConfigRead = (config: any) => {
            addLog(`Config: MaxGate=${config.maxGate}, Duration=${config.duration}`, "info");
        };

        try {
            await RadarLogic.connect("/dev/ttyS1", 115200);
            setIsConnected(true);
            addLog("RadarLogic connected!", "success");

            // شروع polling برای stats
            const statsInterval = setInterval(() => {
                if (RadarLogic.getStats) {
                    const currentStats = RadarLogic.getStats();
                    setStats(currentStats);
                }
            }, 1000); // هر 1 ثانیه

            // ذخیره interval برای cleanup
            (window as any).__statsInterval = statsInterval;
        } catch (error: any) {
            addLog("RadarLogic connection failed!", "error");
            addLog(`Error: ${error?.message || error}`, "error");
            setIsConnected(false);
        }
    };

    // قطع اتصال
    const disconnect = () => {
        addLog("Disconnecting...", "info");
        RadarLogic.disconnect();
        setIsConnected(false);
        setSensorData(null);
        setStats(null);

        // پاک کردن stats interval
        if ((window as any).__statsInterval) {
            clearInterval((window as any).__statsInterval);
            (window as any).__statsInterval = null;
        }

        addLog("Disconnected", "success");
    };

    // اجرای همه تست‌ها
    const runAllTests = async () => {
        clearLogs();
        addLog("Running comprehensive diagnostics...", "info");
        await SensorDebug.runAllTests();
        addLog("Diagnostics complete! Check console for details.", "success");
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🔧 SENSOR DEBUG</Text>
                <Text style={styles.subtitle}>HLK-LD2410C Radar</Text>
            </View>

            {/* Status Card */}
            <View style={styles.statusCard}>
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>وضعیت اتصال:</Text>
                    <Text style={[styles.statusValue, { color: isConnected ? "#4CAF50" : "#F44336" }]}>{isConnected ? "✅ متصل" : "❌ قطع"}</Text>
                </View>
                {sensorData && (
                    <>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>حضور:</Text>
                            <Text style={[styles.statusValue, { color: sensorData.isPresence ? "#4CAF50" : "#666" }]}>{sensorData.isPresence ? "✅ YES" : "❌ NO"}</Text>
                        </View>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>فاصله:</Text>
                            <Text style={styles.statusValue}>{sensorData.distance} cm</Text>
                        </View>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>وضعیت:</Text>
                            <Text style={styles.statusValue}>{sensorData.statusText}</Text>
                        </View>
                    </>
                )}
            </View>

            {/* Statistics Card */}
            {stats && (
                <View style={styles.statsCard}>
                    <Text style={styles.statsTitle}>📊 STATISTICS</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Packets</Text>
                            <Text style={styles.statValue}>{stats.packetsReceived}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Data</Text>
                            <Text style={styles.statValue}>{stats.dataPackets}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Config</Text>
                            <Text style={styles.statValue}>{stats.configPackets}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Errors</Text>
                            <Text style={[styles.statValue, { color: stats.errors > 0 ? "#F44336" : "#4CAF50" }]}>{stats.errors}</Text>
                        </View>
                    </View>
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Uptime</Text>
                            <Text style={styles.statValue}>{stats.uptime}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Last Packet</Text>
                            <Text style={styles.statValue}>{stats.timeSinceLastPacket}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Reconnects</Text>
                            <Text style={styles.statValue}>{stats.reconnectCount}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Buffer</Text>
                            <Text style={styles.statValue}>{stats.bufferSize}B</Text>
                        </View>
                    </View>
                    {stats.bufferOverflows > 0 && <Text style={styles.warningText}>⚠️ Buffer Overflows: {stats.bufferOverflows}</Text>}
                </View>
            )}

            {/* Test Buttons */}
            <View style={styles.buttonsContainer}>
                <TouchableOpacity style={styles.button} onPress={testAPI}>
                    <Text style={styles.buttonText}>1️⃣ Check API</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={testListPorts}>
                    <Text style={styles.buttonText}>2️⃣ List Ports</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={testFileAccess}>
                    <Text style={styles.buttonText}>3️⃣ Check File</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={testDirectConnection}>
                    <Text style={styles.buttonText}>4️⃣ Direct Test</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.primaryButton, isConnected && styles.disabledButton]} onPress={testRadarLogic} disabled={isConnected}>
                    <Text style={styles.buttonText}>5️⃣ Connect Radar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.dangerButton, !isConnected && styles.disabledButton]} onPress={disconnect} disabled={!isConnected}>
                    <Text style={styles.buttonText}>🛑 Disconnect</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.button, styles.successButton]} onPress={runAllTests}>
                    <Text style={styles.buttonText}>🚀 Run All Tests</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={clearLogs}>
                    <Text style={styles.buttonText}>🗑️ Clear Logs</Text>
                </TouchableOpacity>
            </View>

            {/* Logs */}
            <View style={styles.logsContainer}>
                <Text style={styles.logsTitle}>📋 LOGS ({logs.length})</Text>
                <ScrollView style={styles.logsScroll}>
                    {logs.map((log, index) => (
                        <Text key={index} style={styles.logText}>
                            {log}
                        </Text>
                    ))}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#121212",
        padding: 15,
    },
    header: {
        alignItems: "center",
        marginBottom: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#333",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#fff",
    },
    subtitle: {
        fontSize: 14,
        color: "#888",
        marginTop: 4,
    },
    statusCard: {
        backgroundColor: "#1E1E1E",
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: "#333",
    },
    statusRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    statusLabel: {
        color: "#888",
        fontSize: 14,
    },
    statusValue: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
    },
    buttonsContainer: {
        gap: 8,
        marginBottom: 10,
    },
    actionsRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 15,
    },
    button: {
        backgroundColor: "#2C2C2C",
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 8,
        alignItems: "center",
        flex: 1,
    },
    primaryButton: {
        backgroundColor: "#2962FF",
    },
    successButton: {
        backgroundColor: "#4CAF50",
    },
    secondaryButton: {
        backgroundColor: "#37474F",
    },
    dangerButton: {
        backgroundColor: "#D32F2F",
    },
    disabledButton: {
        backgroundColor: "#1A1A1A",
        opacity: 0.5,
    },
    buttonText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
    },
    logsContainer: {
        flex: 1,
        backgroundColor: "#000",
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: "#333",
    },
    logsTitle: {
        color: "#888",
        fontSize: 12,
        marginBottom: 8,
        fontWeight: "bold",
    },
    logsScroll: {
        flex: 1,
    },
    logText: {
        color: "#0F0",
        fontFamily: "monospace",
        fontSize: 11,
        marginBottom: 2,
    },
    statsCard: {
        backgroundColor: "#1A237E",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#3949AB",
    },
    statsTitle: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        marginBottom: 8,
    },
    statsGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    statItem: {
        flex: 1,
        alignItems: "center",
    },
    statLabel: {
        color: "#9FA8DA",
        fontSize: 10,
        marginBottom: 2,
    },
    statValue: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
    },
    warningText: {
        color: "#FFC107",
        fontSize: 11,
        marginTop: 4,
        textAlign: "center",
    },
});
