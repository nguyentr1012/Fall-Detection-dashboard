import type { IMUBatch, Alert, IMUSample } from "@/src/types";
import { parseRawImu } from "./imu-parser";

type BatchCallback = (batch: IMUBatch) => void;
type AlertCallback = (alert: Alert) => void;
export type TelemetrySample = { battery_pct: number; walk_steps: number; run_steps: number; timestamp?: number }
export type TelemetryCallback = (deviceId: string, data: TelemetrySample) => void
type ConnectionCallback = (connected: boolean) => void

class MqttClientManager {
  private mockInterval: ReturnType<typeof setInterval> | null = null;
  private client: import('mqtt').MqttClient | null = null;
  private batchCallbacks = new Map<string, BatchCallback[]>();
  private alertCallbacks = new Map<string, AlertCallback[]>();
  private telemetryCallbacks = new Map<string, TelemetryCallback[]>();
  private connectionCallbacks: ConnectionCallback[] = [];
  public isConnected = false;
  private isMock = process.env.NEXT_PUBLIC_MOCK_MQTT === 'true';
  // Đếm số consumer đang dùng kết nối. Chỉ teardown thật khi về 0 — tránh việc
  // useMqtt unmount lại giết kết nối global mà GlobalMqttInit vẫn cần.
  private refCount = 0;

  onConnectionChange(cb: ConnectionCallback): () => void {
    this.connectionCallbacks.push(cb)
    // Trả về hàm gỡ — consumer PHẢI gọi khi unmount, nếu không mảng phình vô hạn
    // qua mỗi lần StrictMode remount / Fast Refresh.
    return () => {
      const i = this.connectionCallbacks.indexOf(cb)
      if (i !== -1) this.connectionCallbacks.splice(i, 1)
    }
  }

  private fireConnectionChange(connected: boolean) {
    this.connectionCallbacks.forEach(cb => cb(connected))
  }

  connect(deviceId: string) {
    this.refCount++
    if (this.isMock) {
      this.startMock(deviceId)
      if (!this.isConnected) {
        this.isConnected = true
        this.fireConnectionChange(true)
      }
      return
    }
    this.connectReal()
  }

  async reconfigure(brokerUrl: string, username: string, password: string) {
    if (this.client) {
      this.client.end()
      this.client = null
      this.isConnected = false
    }
    await this.connectReal({ brokerUrl, username, password })
  }

  private async connectReal(override?: { brokerUrl: string; username: string; password: string }) {
    if (this.client) return
    const mqtt = (await import('mqtt')).default
    const brokerUrl = override?.brokerUrl ?? process.env.NEXT_PUBLIC_MQTT_BROKER_URL
    if (!brokerUrl) {
      console.error('NEXT_PUBLIC_MQTT_BROKER_URL not set')
      return
    }
    this.client = mqtt.connect(brokerUrl, {
      username: override?.username ?? process.env.NEXT_PUBLIC_MQTT_USERNAME,
      password: override?.password ?? process.env.NEXT_PUBLIC_MQTT_PASSWORD,
      reconnectPeriod: 3000,
    })

    this.client.on('connect', () => {
      this.isConnected = true
      this.fireConnectionChange(true)
      // Topic nhẹ (low-rate) — luôn subscribe.
      this.client!.subscribe('eldercare/+/telemetry')
      this.client!.subscribe('eldercare/+/alert/fall')
      // IMU 100Hz: CHỈ subscribe khi thực sự có consumer batch (trang
      // data-collection). Tránh nuốt + parse luồng cao tần vô ích ở mọi trang.
      if (this.hasBatchConsumers()) this.client!.subscribe('eldercare/+/imu/raw')
    })

    this.client.on('message', (topic: string, payload: Buffer) => {
      try {
        const deviceId = topic.split('/')[1]
        const data = JSON.parse(payload.toString())

        if (topic.endsWith('/imu/raw')) {
          // Không có consumer batch nào → bỏ qua, KHÔNG parse (tránh GC churn).
          if (this.batchCallbacks.size === 0) return
          // Data Collection flow — parse 2D array
          const parsedSamples = parseRawImu(data)
          const batch: IMUBatch = {
            deviceId,
            batchId: crypto.randomUUID(),
            startTimestamp: data.ts,
            samples: parsedSamples,
          }
          this.batchCallbacks.get(deviceId)?.forEach(cb => cb(batch))
          this.batchCallbacks.get('*')?.forEach(cb => cb(batch))
        }

        if (topic.endsWith('/telemetry')) {
          const sample: TelemetrySample = {
            battery_pct: data.battery_pct ?? 0,
            walk_steps: data.walk_steps ?? 0,
            run_steps: data.run_steps ?? 0,
            timestamp: data.timestamp,
          }
          this.telemetryCallbacks.get(deviceId)?.forEach(cb => cb(deviceId, sample))
          this.telemetryCallbacks.get('*')?.forEach(cb => cb(deviceId, sample))
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
      this.fireConnectionChange(false)
    })

    this.client.on('close', () => {
      this.isConnected = false
      this.fireConnectionChange(false)
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

      if (t % 1000 === 0) {
        const telSample: TelemetrySample = {
          battery_pct: 60 + Math.floor(Math.random() * 40),
          walk_steps: Math.floor(t / 100),
          run_steps: Math.floor(t / 500),
          timestamp: now,
        }
        this.telemetryCallbacks.get(deviceId)?.forEach(cb => cb(deviceId, telSample))
        this.telemetryCallbacks.get('*')?.forEach(cb => cb(deviceId, telSample))
      }

      if (t % 12000 === 0) {
        const alert: Alert = {
          id: crypto.randomUUID(), deviceId, deviceName: 'Mock Device',
          severity: 'critical', type: 'fall_detected',
          message: 'Phát hiện té ngã (mock)', timestamp: new Date().toISOString(), acknowledged: false,
        }
        this.alertCallbacks.get(deviceId)?.forEach(cb => cb(alert))
        this.alertCallbacks.get('*')?.forEach(cb => cb(alert))
      }
    }, 500)
  }

  private hasBatchConsumers(): boolean {
    return this.batchCallbacks.size > 0
  }

  // onBatch optional: consumer chỉ-alert/telemetry (vd GlobalMqttInit) KHÔNG
  // đăng ký batch → không kích hoạt subscribe IMU 100Hz vô ích.
  subscribe(deviceId: string, onBatch?: BatchCallback, onAlert?: AlertCallback, onTelemetry?: TelemetryCallback) {
    const hadBatch = this.hasBatchConsumers()
    if (onBatch) this.batchCallbacks.set(deviceId, [...(this.batchCallbacks.get(deviceId) ?? []), onBatch])
    if (onAlert) this.alertCallbacks.set(deviceId, [...(this.alertCallbacks.get(deviceId) ?? []), onAlert])
    if (onTelemetry) this.telemetryCallbacks.set(deviceId, [...(this.telemetryCallbacks.get(deviceId) ?? []), onTelemetry])
    // Consumer batch đầu tiên xuất hiện → bật nhận IMU ở broker.
    if (onBatch && !hadBatch && !this.isMock && this.client && this.isConnected) {
      this.client.subscribe('eldercare/+/imu/raw')
    }
  }

  unsubscribe(deviceId: string) {
    const hadBatch = this.hasBatchConsumers()
    this.batchCallbacks.delete(deviceId)
    this.alertCallbacks.delete(deviceId)
    this.telemetryCallbacks.delete(deviceId)
    // Không còn consumer batch → tắt luồng IMU 100Hz (broker ngừng đẩy data).
    if (hadBatch && !this.hasBatchConsumers() && !this.isMock && this.client && this.isConnected) {
      this.client.unsubscribe('eldercare/+/imu/raw')
    }
  }

  disconnect() {
    this.refCount = Math.max(0, this.refCount - 1)
    if (this.refCount > 0) return // còn consumer khác đang dùng — giữ kết nối
    this.teardown()
  }

  // Dọn dứt điểm interval + WebSocket, bất kể refCount. Dùng cho HMR dispose.
  teardown() {
    this.refCount = 0
    if (this.mockInterval) { clearInterval(this.mockInterval); this.mockInterval = null }
    if (this.client) { this.client.end(); this.client = null }
    this.isConnected = false
  }
}

// HMR-safe singleton: cache trên globalThis để Fast Refresh re-evaluate module
// KHÔNG tạo manager mới (tránh chồng interval/WebSocket "zombie" mỗi lần save).
const GLOBAL_KEY = '__mqttClientManager__' as const
type GlobalWithMqtt = typeof globalThis & { [GLOBAL_KEY]?: MqttClientManager }

export function getMqttClient(): MqttClientManager {
  if (typeof window === 'undefined') throw new Error('MQTT client is browser-only')
  const g = globalThis as GlobalWithMqtt
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new MqttClientManager()
  return g[GLOBAL_KEY]
}

// Khi Turbopack/webpack thay module này (HMR), dọn instance cũ trước khi
// module mới chạy — nếu không, interval + kết nối wss cũ sẽ rò rỉ vĩnh viễn.
// Cast qua unknown để tránh xung đột với global `module: NodeModule` (@types/node).
const hot = (typeof module !== 'undefined'
  ? (module as unknown as { hot?: { dispose: (cb: () => void) => void } }).hot
  : undefined)
if (hot) {
  hot.dispose(() => {
    const g = globalThis as GlobalWithMqtt
    g[GLOBAL_KEY]?.teardown()
    g[GLOBAL_KEY] = undefined
  })
}
