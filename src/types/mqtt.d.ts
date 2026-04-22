// MQTT Topics:
// fall-detection/{deviceId}/imu/data     → payload: IMUBatch (QoS 0)
// fall-detection/{deviceId}/alerts/fall  → payload: Alert   (QoS 1)
// fall-detection/{deviceId}/status       → payload: 'online'|'offline' (QoS 1)
// Wildcards:
// fall-detection/+/alerts/fall
// fall-detection/+/status

export type MqttTopic =
  | `fall-detection/${string}/imu/data`
  | `fall-detection/${string}/alerts/fall`
  | `fall-detection/${string}/status`

export type MqttConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'