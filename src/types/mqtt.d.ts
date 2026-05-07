// MQTT Topics:
// eldercare/{deviceId}/imu/raw       → payload: RawImuPayload (QoS 0)
// eldercare/{deviceId}/telemetry     → payload: Telemetry (QoS 0/1)
// eldercare/{deviceId}/alert/fall    → payload: Alert (QoS 1)

export interface RawImuPayload {
  ts: number;
  fs: number;
  mode?: string;
  d: number[][];
}

export type MqttTopic =
  | `eldercare/${string}/imu/raw`
  | `eldercare/${string}/telemetry`
  | `eldercare/${string}/alert/fall`

export type MqttConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'