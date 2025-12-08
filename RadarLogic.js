import SerialPortAPI from 'react-native-serial-port-api';
import { Buffer } from 'buffer';

/**
 * RadarLogic - A class to handle HLK-LD2410C communication.
 * This separates the hardware logic from the UI.
 */
class RadarLogic {
  constructor() {
    this.serialPort = null;
    this.subscription = null;
    this.buffer = Buffer.alloc(0);
    this.isConnected = false;

    // Callbacks to update the UI
    this.onDataUpdate = null; // Called when new sensor data arrives
    this.onLog = null;        // Called for debugging logs
    this.onConfigRead = null; // Called when config is read successfully

    // Throttling control
    this.lastUpdateTime = 0;
    this.updateInterval = 1000; // Update UI every 1 second
  }

  /**
   * Connects to the serial port and starts the initialization sequence.
   * 1. Open Port -> 2. Enable Config -> 3. Read Config -> 4. Listen for Data
   */
  async connect(path, baudRate) {
    try {
      if (this.isConnected) return;

      this.log(`Connecting to ${path} at ${baudRate}...`);
      this.serialPort = await SerialPortAPI.open(path, { baudRate });
      this.isConnected = true;
      this.log("Port Opened. Initializing...");

      // Start listening to incoming bytes
      this.subscription = this.serialPort.onReceived(this.handleIncomingData.bind(this));

      // STARTUP SEQUENCE: Read Configuration first
      // Wait 500ms then Enable Config
      setTimeout(() => this.sendCommand("FF000100"), 500);
      // Wait 1000ms then Request Settings (0x61)
      setTimeout(() => this.sendCommand("6100"), 1000);
      // Wait 1500ms then End Config (to ensure data stream resumes)
      setTimeout(() => this.sendCommand("FE00"), 1500);

    } catch (error) {
      this.log(`Connection Error: ${error.message}`, "error");
      throw error;
    }
  }

  disconnect() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    if (this.serialPort) {
      // Note: Some libraries don't support close(), but we clean up references
      this.serialPort = null;
    }
    this.isConnected = false;
    this.buffer = Buffer.alloc(0);
    this.log("Disconnected.");
  }

  /**
   * Sends a HEX command string to the module.
   * Wraps it in the protocol header/footer.
   */
  sendCommand(hexBody) {
    if (!this.serialPort) return;

    // Construct packet: Header(FD FC FB FA) + Len + Body + Footer(04 03 02 01)
    const header = Buffer.from([0xFD, 0xFC, 0xFB, 0xFA]);
    const footer = Buffer.from([0x04, 0x03, 0x02, 0x01]);
    const body = Buffer.from(hexBody, 'hex');
    const length = Buffer.alloc(2);
    length.writeUInt16LE(body.length); // Little Endian length

    const packet = Buffer.concat([header, length, body, footer]);
    this.serialPort.send(packet.toString('hex'));
    this.log(`CMD Sent: ${hexBody}`, "info");
  }

  /**
   * Handles raw incoming bytes, appends to buffer, and parses packets.
   */
  handleIncomingData(buff) {
    // Append new data to the existing buffer
    this.buffer = Buffer.concat([this.buffer, Buffer.from(buff, 'hex')]);

    // Loop to find valid packets in the buffer
    while (this.buffer.length > 0) {
      // 1. Check for Config Response Header (FD FC FB FA)
      const configIdx = this.buffer.indexOf(Buffer.from([0xFD, 0xFC, 0xFB, 0xFA]));

      // 2. Check for Data Header (F4 F3 F2 F1)
      const dataIdx = this.buffer.indexOf(Buffer.from([0xF4, 0xF3, 0xF2, 0xF1]));

      // If no headers found, discard noise but keep last few bytes just in case
      if (configIdx === -1 && dataIdx === -1) {
        if (this.buffer.length > 50) this.buffer = this.buffer.slice(-20);
        break;
      }

      // Determine which packet comes first
      let type = 'none';
      let startIdx = -1;

      if (configIdx !== -1 && (dataIdx === -1 || configIdx < dataIdx)) {
        type = 'config';
        startIdx = configIdx;
      } else if (dataIdx !== -1) {
        type = 'data';
        startIdx = dataIdx;
      }

      // Process the packet found
      if (startIdx > 0) {
        // Discard bytes before the header (noise)
        this.buffer = this.buffer.slice(startIdx);
        startIdx = 0;
      }

      // Check if we have enough length for Length Bytes
      if (this.buffer.length < 6) break;

      // Read Payload Length
      const payloadLen = this.buffer.readUInt16LE(4);
      const totalLen = 4 + 2 + payloadLen + 4; // Header + Len + Payload + Footer

      if (this.buffer.length < totalLen) break; // Wait for more data

      // Extract the full packet
      const packet = this.buffer.slice(0, totalLen);

      // Handle based on type
      if (type === 'config') {
        this.parseConfigPacket(packet);
      } else {
        this.parseDataPacket(packet);
      }

      // Remove processed packet from buffer
      this.buffer = this.buffer.slice(totalLen);
    }
  }

  parseConfigPacket(packet) {
    // Payload starts at index 6
    const payload = packet.slice(6, packet.length - 4);

    // Check if it's a Read Parameter Response (Command 0x61, ACK 0x01)
    // Structure: 61 01 00 00 AA [Data...]
    if (payload[0] === 0x61 && payload[1] === 0x01) {
      const aaIndex = payload.indexOf(0xAA);
      if (aaIndex !== -1) {
        const data = payload.slice(aaIndex + 1);
        // data[1] = Max Moving Gate
        // data[2] = Max Static Gate
        // Duration is at the end bytes
        const maxGate = data[1];
        const duration = data[21] + (data[22] << 8); // Little Endian

        if (this.onConfigRead) {
          this.onConfigRead({ maxGate, duration });
        }
        this.log(`Config Read: MaxGate=${maxGate}, Time=${duration}s`, "success");
      }
    }
  }

  parseDataPacket(packet) {
    const now = Date.now();

    // Throttle UI updates (1 second)
    if (now - this.lastUpdateTime < this.updateInterval) return;
    this.lastUpdateTime = now;

    // Payload starts at index 6
    // Standard Packet: F4 F3 F2 F1 [Len] [Type] [Head AA] [State] [MoveDist...]
    // The 'payload' variable here refers to internal data after Length bytes
    // Index 8 in full packet is usually Target State
    const targetState = packet[8];
    const moveDist = packet[9] + (packet[10] << 8);
    const moveEnergy = packet[11];
    const staticDist = packet[12] + (packet[13] << 8);
    const staticEnergy = packet[14];
    const detectDist = packet[15] + (packet[16] << 8);

    // Determine Logic State
    let statusText = "Absent";
    let isPresence = false;

    if (targetState === 1) statusText = "Moving";
    if (targetState === 2) statusText = "Stationary";
    if (targetState === 3) statusText = "Moving & Stationary";

    if (targetState !== 0) isPresence = true;

    // Emit data to UI
    if (this.onDataUpdate) {
      this.onDataUpdate({
        isPresence,
        statusText,
        distance: detectDist,
        hex: packet.toString('hex').toUpperCase().match(/.{1,2}/g).join(' ')
      });
    }
  }

  log(msg, type='info') {
    if (this.onLog) this.onLog(msg, type);
  }
}

export default new RadarLogic();