import type { IMUBatch, Alert } from "@/src/types";

type BatchCallback = (batch: IMUBatch) => void;
type AlertCallback = (alert: Alert) => void;

class MqttClientManager {
  private mockInterval: ReturnType<typeof setInterval> | null = null;
  private client: import('mqtt').MqttClient | null = null;
  private batchCallbacks = new Map<string, BatchCallback[]>();
  private alertCallbacks = new Map<string, AlertCallback[]>();
  public isConnected = false;
  private isMock = process.env.NEXT_PUBLIC_MOCK_MQTT === 'true';

  connect(deviceId: string) {
    if (this.isMock) {
      this.startMock(deviceId)
      this.isConnected = true
      return
    }
    this.connectReal()
  }

  private async connectReal() {
    if (this.client) return
    const mqtt = (await import('mqtt')).default
    const brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL
    if (!brokerUrl) {
      console.error('NEXT_PUBLIC_MQTT_BROKER_URL not set')
      return
    }
    this.client = mqtt.connect(brokerUrl, {
      username: process.env.NEXT_PUBLIC_MQTT_USERNAME,
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
      reconnectPeriod: 3000,
    })

    this.client.on('connect', () => {
      this.isConnected = true
      this.client!.subscribe('eldercare/+/telemetry')
      this.client!.subscribe('eldercare/+/alert/fall')
    })

    this.client.on('message', (topic: string, payload: Buffer) => {
      try {
        const deviceId = topic.split('/')[1]
        const data = JSON.parse(payload.toString())

        if (topic.endsWith('/telemetry')) {
          const batch: IMUBatch = {
            deviceId,
            batchId: crypto.randomUUID(),
            startTimestamp: Date.now(),
            samples: Array.isArray(data) ? data : data.samples ?? [],
          }
          this.batchCallbacks.get(deviceId)?.forEach(cb => cb(batch))
          this.batchCallbacks.get('*')?.forEach(cb => cb(batch))
        }

        if (topic.endsWith('/fall')) {
          const alert: Alert = {
            id: crypto.randomUUID(),
            deviceId,
            deviceName: deviceId,
            severity: 'critical',
            type: 'fall_detected',
            message: data.message ?? 'Phát hiện té ngã',
            timestamp: new Date().toISOString(),
            acknowledged: false,
          }
          this.alertCallbacks.get(deviceId)?.forEach(cb => cb(alert))
          this.alertCallbacks.get('*')?.forEach(cb => cb(alert))
        }
      } catch {
        // ignore malformed messages
      }
    })

    this.client.on('error', () => {
      this.isConnected = false
    })

    this.client.on('close', () => {
      this.isConnected = false
    })
  }

  private startMock(deviceId: string) {
    if (this.mockInterval) return
    let t = 0
    this.mockInterval = setInterval(() => {
      const now = Date.now()
      const samples = Array.from({ length: 50 }, (_, i) => ({
        timestamp: now - (49 - i) * 10,
        ax: 0.1 * Math.sin(2 * Math.PI * (t + i) / 50) + (Math.random() - 0.5) * 0.05,
        ay: 0.05 * Math.cos(2 * Math.PI * (t + i) / 50) + (Math.random() - 0.5) * 0.05,
        az: 1.0 + (Math.random() - 0.5) * 0.1,
        gx: 20 * Math.sin(2 * Math.PI * (t + i) / 100) + (Math.random() - 0.5) * 5,
        gy: 15 * Math.cos(2 * Math.PI * (t + i) / 100) + (Math.random() - 0.5) * 5,
        gz: (Math.random() - 0.5) * 10,
      }))
      t += 50
      const batch: IMUBatch = { deviceId, batchId: crypto.randomUUID(), startTimestamp: now, samples }
      this.batchCallbacks.get(deviceId)?.forEach(cb => cb(batch))

      if (t % 12000 === 0) {
        const alert: Alert = {
          id: crypto.randomUUID(), deviceId, deviceName: 'Mock Device',
          severity: 'critical', type: 'fall_detected',
          message: 'Phát hiện té ngã (mock)', timestamp: new Date().toISOString(), acknowledged: false,
        }
        this.alertCallbacks.get(deviceId)?.forEach(cb => cb(alert))
      }
    }, 500)
  }

  subscribe(deviceId: string, onBatch: BatchCallback, onAlert?: AlertCallback) {
    this.batchCallbacks.set(deviceId, [...(this.batchCallbacks.get(deviceId) ?? []), onBatch])
    if (onAlert) this.alertCallbacks.set(deviceId, [...(this.alertCallbacks.get(deviceId) ?? []), onAlert])
  }

  unsubscribe(deviceId: string) {
    this.batchCallbacks.delete(deviceId)
    this.alertCallbacks.delete(deviceId)
  }

  disconnect() {
    if (this.mockInterval) { clearInterval(this.mockInterval); this.mockInterval = null }
    if (this.client) { this.client.end(); this.client = null }
    this.isConnected = false
  }
}

let _instance: MqttClientManager | null = null
export function getMqttClient(): MqttClientManager {
  if (typeof window === 'undefined') throw new Error('MQTT client is browser-only')
  if (!_instance) _instance = new MqttClientManager()
  return _instance
}
