export type ActivityLabel ="run" | "walk" | "transition_stand_sit" | "transition_sit_lie" | "fall";

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
    name: string;        // wearer full_name, fallback "Chưa gán"
    model: string;
    status: 'online' | 'offline';
    lastSeen: string;    // ISO
    lastAlert: Alert | null;
    firmwareVersion: string;
    location: string;    // device_id as fallback
    batteryLevel?: number; // 0–100, comes from MQTT telemetry
    wearerId?: string | null;
    is_active?: boolean;
    telemetry_interval?: number;
}

export interface WearerInfo {
    id: string;
    full_name: string;
    height_cm: number;
}

export interface DeviceConfig{
    deviceId: string;
    name: string;        // wearer full_name
    samplingRate: 50 | 100 | 200;
    fallThreshold: number;
    transmitInterval: number;
    alertEnabled: boolean;
    wearerName?: string; // wearer full_name (editable)
    heightCm?: number;   // wearer height_cm (editable)
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
