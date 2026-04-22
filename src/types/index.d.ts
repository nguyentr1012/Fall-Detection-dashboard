export type ActivityLabel ="walking" | "standing" | "running" | "falling";

export interface IMUSample{
    timestamp: number; //Unix ms
    ax: number; ay: number; az: number; //g, range [-8, 8]
    gx: number; gy: number; gz: number; //deg/s, range [-500, 500]
}

export interface IMUBatch{
    deviceId: string;
    batchId: string;
    startTimestamp: number; 
    samples: IMUSample[]; //50 samples(100Hz * 0.5s)
}

export interface Alert{
    id: string;
    deviceId: string;
    deviceName: string;
    severity: 'critical' | 'warning' | 'info';
    type: 'fall_detected' | 'low_battery' | 'connection_lost';
    message: string;
    timestamp: string; // ISO
    acknowledged: boolean;
}

export interface Device{
    id: string;
    name: string;
    model: string;
    status: 'online' | 'offline';
    lastSeen: string; // ISO
    lastAlert: Alert | null;
    firmwareVersion: string;
    ipAddress?: string;
    location: string;
}

export interface DeviceConfig{
    deviceId: string;
    name: string;
    samplingRate: 50| 100| 200;
    fallThreshold: number;
    transmitInterval: number; //seconds
    alertEnabled: boolean;
}

export interface RecordingSession {
    deviceId: string
    label: ActivityLabel
    startTimestamp: number
    endTimestamp: number
    sampleCount: number
    samples: IMUSample[]
  }
  
  // Chart types (downsampled, 10Hz)
  export interface AccelChartPoint { t: number; ax: number; ay: number; az: number; svm: number }
  export interface GyroChartPoint  { t: number; gx: number; gy: number; gz: number }