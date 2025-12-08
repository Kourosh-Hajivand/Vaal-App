import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import RadarLogic from './RadarLogic';

const SERIAL_PORT = '/dev/ttyS1';
const BAUD_RATE = 115200;

export default function App() {
  const [connectionState, setConnectionState] = useState("Disconnected");
  const [logs, setLogs] = useState([]);

  // Sensor Data States
  const [presence, setPresence] = useState(false);
  const [distance, setDistance] = useState(0);
  const [statusText, setStatusText] = useState("Waiting...");

  // Config Data States
  const [config, setConfig] = useState({ maxGate: '-', duration: '-' });

  useEffect(() => {
    // 1. Setup Callbacks
    RadarLogic.onLog = (msg, type) => addLog(msg, type);

    RadarLogic.onDataUpdate = (data) => {
      setPresence(data.isPresence);
      setDistance(data.distance);
      setStatusText(data.statusText);
      addLog(data.hex, 'data');
    };

    RadarLogic.onConfigRead = (cfg) => {
      // Show only meters (Gate * 0.75)
      const rangeInMeters = (cfg.maxGate * 0.75).toFixed(2);

      setConfig({
        maxGate: `${rangeInMeters}m`,
        duration: `${cfg.duration}s`
      });
    };

    // 2. Auto Connect on Start
    handleConnect();

    return () => {
      RadarLogic.disconnect();
    };
  }, []);

  const addLog = (message, type) => {
    const time = new Date().toLocaleTimeString().split(' ')[0];
    setLogs(prev => [`[${time}] ${message}`, ...prev].slice(0, 10));
  };

  const handleConnect = async () => {
    try {
      setConnectionState("Connecting...");
      await RadarLogic.connect(SERIAL_PORT, BAUD_RATE);
      setConnectionState("Connected");
    } catch (err) {
      setConnectionState("Failed");
    }
  };

  const handleDisconnect = () => {
    RadarLogic.disconnect();
    setConnectionState("Disconnected");
    setPresence(false);
    setStatusText("Stopped");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* 1. Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>ELEVATOR RADAR</Text>
        <View style={[styles.statusBadge, { backgroundColor: connectionState === 'Connected' ? '#00C853' : '#D50000' }]}>
          <Text style={styles.statusText}>{connectionState}</Text>
        </View>
      </View>

      {/* 2. Main Dashboard (Compact Mode) */}
      <View style={styles.dashboard}>

        {/* Presence Indicator */}
        <View style={[styles.presenceCard, { borderColor: presence ? '#00E676' : '#424242' }]}>
          <Text style={styles.label}>HUMAN PRESENCE</Text>
          <Text style={[styles.presenceValue, { color: presence ? '#00E676' : '#757575' }]}>
            {presence ? "DETECTED" : "NOBODY"}
          </Text>
        </View>

        {/* Info Grid */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.label}>DISTANCE</Text>
            <Text style={styles.value}>{distance} <Text style={styles.unit}>cm</Text></Text>
          </View>

          <View style={styles.gridItem}>
            <Text style={styles.label}>STATUS</Text>
            <Text style={[styles.value, { fontSize: 16 }]}>{statusText}</Text>
          </View>
        </View>

        {/* Configuration Display */}
        <View style={styles.configBox}>
          <Text style={styles.configTitle}>MODULE SETTINGS</Text>
          <View style={styles.configRow}>
            <Text style={styles.configText}>Max Range: <Text style={styles.configValue}>{config.maxGate}</Text></Text>
            <Text style={styles.configText}>Delay: <Text style={styles.configValue}>{config.duration}</Text></Text>
          </View>
        </View>

      </View>

      {/* 3. Log Container (Takes remaining space) */}
      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>RAW DATA STREAM</Text>
        <ScrollView style={styles.logScroll}>
          {logs.map((l, i) => (
            <Text key={i} style={styles.logText}>{l}</Text>
          ))}
        </ScrollView>
      </View>

      {/* 4. Footer Buttons (Safe Area Protected) */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.btn, styles.btnConnect]} onPress={handleConnect} disabled={connectionState === 'Connected'}>
          <Text style={styles.btnText}>START</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnDisconnect]} onPress={handleDisconnect}>
          <Text style={styles.btnText}>STOP</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  appTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  dashboard: {
    padding: 15,
  },
  presenceCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    elevation: 3,
  },
  label: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  presenceValue: {
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  unit: {
    fontSize: 12,
    color: '#666',
  },
  configBox: {
    backgroundColor: '#263238',
    borderRadius: 10,
    padding: 12,
  },
  configTitle: {
    color: '#90A4AE',
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  configText: {
    color: '#B0BEC5',
    fontSize: 12,
  },
  configValue: {
    color: '#fff',
    fontWeight: 'bold',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#000',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  logTitle: {
    color: '#444',
    fontSize: 9,
    marginBottom: 4,
  },
  logScroll: {
    flex: 1,
  },
  logText: {
    color: '#00E676',
    fontFamily: 'monospace',
    fontSize: 10,
    marginBottom: 2,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 80, // FIX: Increased padding significantly to avoid Android buttons
    paddingTop: 15,
    justifyContent: 'space-between',
    backgroundColor: '#121212',
  },
  btn: {
    flex: 1,
    paddingVertical: 15, // Slightly taller button for easier touch
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  btnConnect: {
    backgroundColor: '#2962FF',
  },
  btnDisconnect: {
    backgroundColor: '#37474F',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});