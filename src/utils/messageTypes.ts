/**
 * Message Types for WebView Bridge Communication
 */

export type MessageType = 
  | 'MOTION'
  | 'REQUEST_MOTION_STATUS'
  | 'REQUEST_DEVICE_INFO'
  | 'DEVICE_INFO'
  | 'MOTION_STATUS';

export interface MotionMessage {
  type: 'MOTION';
  presence: boolean;
  distance: number;
  status: string;
}

export interface RequestMotionStatusMessage {
  type: 'REQUEST_MOTION_STATUS';
}

export interface RequestDeviceInfoMessage {
  type: 'REQUEST_DEVICE_INFO';
}

export interface DeviceInfoMessage {
  type: 'DEVICE_INFO';
  token: string | null;
  androidId: string;
  serial?: string;
}

export interface MotionStatusMessage {
  type: 'MOTION_STATUS';
  presence: boolean;
  distance: number;
  status: string;
}

export type WebViewMessage = 
  | MotionMessage
  | RequestMotionStatusMessage
  | RequestDeviceInfoMessage;

export type NativeMessage = 
  | MotionMessage
  | DeviceInfoMessage
  | MotionStatusMessage;

