import type { IMUBatch, Alert, IMUSample } from "@/src/types";
import { parseRawImu } from "./imu-parser";

// Log chi tiết vòng đời kết nối khi bật cờ — để chẩn đoán "chập chờn".
// Lỗi (`error`) thì LUÔN cảnh báo, không phụ thuộc cờ này.
const MQTT_DEBUG = process.env.NEXT_PUBLIC_MQTT_DEBUG === 'true'
function mqttLog(...args: unknown[]) {
  if (MQTT_DEBUG) console.log('[MQTT]', ...args)
}

// ClientId ổn định trong vòng đời 1 tab (sessionStorage không chia sẻ giữa các
// tab → mỗi tab 1 id riêng, tránh broker "takeover" ping-pong khi mở nhiều tab;
// nhưng GIỮ NGUYÊN qua reload trong cùng tab để dễ trace trên dashboard broker).
function getStableClientId(): string {
  const KEY = 'mqtt_client_id'
  try {
    const existing = sessionStorage.getItem(KEY)
    if (existing) return existing
    const id = `eldercare-web-${Math.random().toString(16).slice(2, 10)}`
    sessionStorage.setItem(KEY, id)
    return id
  } catch {
    // sessionStorage bị chặn (private mode/policy) → fallback id tạm thời.
    return `eldercare-web-${Math.random().toString(16).slice(2, 10)}`
  }
}

type BatchCallback = (batch: IMUBatch) => void;
type AlertCallback = (alert: Alert) => void;
export type TelemetrySample = { battery_pct: number; walk_steps: number; run_steps: number; timestamp?: number }
export type TelemetryCallback = (deviceId: string, data: TelemetrySample) => void
export type EventCallback = (deviceId: string, event: { event_type: string; description?: string; timestamp?: number }) => void
type ConnectionCallback = (connected: boolean) => void

class MqttClientManager {
  private mockInterval: ReturnType<typeof setInterval> | null = null;
  private client: import('mqtt').MqttClient | null = null;
  private batchCallbacks = new Map<string, BatchCallback[]>();
  private alertCallbacks = new Map<string, AlertCallback[]>();
  private telemetryCallbacks = new Map<string, TelemetryCallback[]>();
  private eventCallbacks = new Map<string, EventCallback[]>();
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
    // Hủy teardown đang chờ nếu consumer mới tới kịp (React Strict Mode remount)
    if (this.pendingTeardown) { clearTimeout(this.pendingTeardown); this.pendingTeardown = null }
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

  publish(topic: string, message: string) {
    if (this.isMock) {
      console.log(`[Mock MQTT] Publish to ${topic}: ${message}`)
      return
    }
    if (!this.isConnected || !this.client) return
    this.client.publish(topic, message)
  }

  sendCommand(deviceId: string, action: 'start_stream' | 'stop_stream' | 'ota_update') {
    const topic = `eldercare/${deviceId}/command`
    const payload = JSON.stringify({ action })
    this.publish(topic, payload)
  }

  private connectPromise: Promise<void> | null = null;

  private async connectReal(override?: { brokerUrl: string; username: string; password: string }) {
    if (this.client) return
    if (this.connectPromise) {
      await this.connectPromise
      return
    }

    this.connectPromise = (async () => {
      try {
        const mqtt = (await import('mqtt')).default
        const brokerUrl = override?.brokerUrl ?? process.env.NEXT_PUBLIC_MQTT_BROKER_URL
        if (!brokerUrl) {
          console.error('NEXT_PUBLIC_MQTT_BROKER_URL not set')
          return
        }
        this.client = mqtt.connect(brokerUrl, {
          username: override?.username ?? process.env.NEXT_PUBLIC_MQTT_USERNAME,
          password: override?.password ?? process.env.NEXT_PUBLIC_MQTT_PASSWORD,
          // ClientId ổn định per-tab — tránh session "mồ côi" mỗi reload.
          clientId: getStableClientId(),
          // Ping mỗi 30s, dưới ngưỡng idle-timeout proxy/nginx thường gặp (60s) —
          // giữ WebSocket sống, không bị cắt giữa các nhịp telemetry thưa.
          keepalive: 30,
          // Chờ CONNACK 25s: broker remote qua WSS + TLS handshake trên mạng yếu có
          // thể trả CONNACK chậm. Đặt quá ngắn (vd 8s) → "connack timeout" giả →
          // đóng socket → reconnect churn. Nới rộng để chịu mạng chập chờn.
          connectTimeout: 25000,
          clean: true,
          // Reconnect cách 5s (backoff nhẹ) thay vì 3s — mạng đang flap thì retry
          // dồn dập chỉ tạo nhiễu, không giúp kết nối nhanh hơn.
          reconnectPeriod: 5000,
        })
        mqttLog('connecting →', brokerUrl)
    this.client.on('connect', () => {
      this.isConnected = true
      this.fireConnectionChange(true)
      mqttLog('connected')
      // Topic nhẹ (low-rate) — luôn subscribe.
      // Firmware publish trạng thái realtime lên `status` (KHÔNG có ai republish
      // sang `telemetry`) → phải sub đúng `status`, nếu không telemetry store chết.
      this.client!.subscribe('eldercare/+/status')
      this.client!.subscribe('eldercare/+/alert/fall')
      this.client!.subscribe('eldercare/+/event')
      // IMU 100Hz: CHỈ subscribe khi thực sự có consumer batch (trang
      // data-collection). Tránh nuốt + parse luồng cao tần vô ích ở mọi trang.
      if (this.hasBatchConsumers()) this.client!.subscribe('eldercare/+/imu_stream')
    })

    this.client.on('message', (topic: string, payload: Buffer) => {
      try {
        const deviceId = topic.split('/')[1]
        const data = JSON.parse(payload.toString())

        if (topic.endsWith('/imu_stream')) {
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

        if (topic.endsWith('/status')) {
          // Status payload firmware: { battery, steps, walk_steps, run_steps, ... }.
          // `battery` là tên field firmware; chấp nhận cả `battery_pct` (mock/republish).
          const sample: TelemetrySample = {
            battery_pct: data.battery_pct ?? data.battery ?? 0,
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

        if (topic.endsWith('/event')) {
          const eventPayload = {
            event_type: data.event_type,
            description: data.description,
            timestamp: data.timestamp ?? Date.now(),
          }
          this.eventCallbacks.get(deviceId)?.forEach(cb => cb(deviceId, eventPayload))
          this.eventCallbacks.get('*')?.forEach(cb => cb(deviceId, eventPayload))
        }
      } catch (err) {
        // Payload hỏng — bỏ qua, chỉ log khi debug để soi data lỗi.
        if (MQTT_DEBUG) console.warn('[MQTT] malformed message on', topic, err)
      }
    })

    this.client.on('error', (err: Error) => {
      // LUÔN cảnh báo — lỗi auth (`Not authorized`) khiến mqtt.js reconnect-loop
      // vô hạn; nếu nuốt im lặng thì không thể chẩn đoán "chập chờn".
      console.warn('[MQTT] error:', err?.message ?? err)
      this.isConnected = false
      this.fireConnectionChange(false)
    })

    this.client.on('close', () => {
      mqttLog('close')
      this.isConnected = false
      this.fireConnectionChange(false)
    })

    this.client.on('offline', () => {
      mqttLog('offline')
      this.isConnected = false
      this.fireConnectionChange(false)
    })

    this.client.on('reconnect', () => mqttLog('reconnect…'))
    this.client.on('end', () => mqttLog('end'))
      } finally {
        this.connectPromise = null
      }
    })()

    await this.connectPromise
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
  subscribe(deviceId: string, onBatch?: BatchCallback, onAlert?: AlertCallback, onTelemetry?: TelemetryCallback, onEvent?: EventCallback) {
    const hadBatch = this.hasBatchConsumers()
    if (onBatch) this.batchCallbacks.set(deviceId, [...(this.batchCallbacks.get(deviceId) ?? []), onBatch])
    if (onAlert) this.alertCallbacks.set(deviceId, [...(this.alertCallbacks.get(deviceId) ?? []), onAlert])
    if (onTelemetry) this.telemetryCallbacks.set(deviceId, [...(this.telemetryCallbacks.get(deviceId) ?? []), onTelemetry])
    if (onEvent) this.eventCallbacks.set(deviceId, [...(this.eventCallbacks.get(deviceId) ?? []), onEvent])
    // Consumer batch đầu tiên xuất hiện → bật nhận IMU ở broker.
    if (onBatch && !hadBatch && !this.isMock && this.client && this.isConnected) {
      this.client.subscribe('eldercare/+/imu_stream')
    }
  }

  unsubscribe(deviceId: string) {
    const hadBatch = this.hasBatchConsumers()
    this.batchCallbacks.delete(deviceId)
    this.alertCallbacks.delete(deviceId)
    this.telemetryCallbacks.delete(deviceId)
    this.eventCallbacks.delete(deviceId)
    // Không còn consumer batch → tắt luồng IMU 100Hz (broker ngừng đẩy data).
    if (hadBatch && !this.hasBatchConsumers() && !this.isMock && this.client && this.isConnected) {
      this.client.unsubscribe('eldercare/+/imu_stream')
    }
  }

  private pendingTeardown: ReturnType<typeof setTimeout> | null = null;

  disconnect() {
    this.refCount = Math.max(0, this.refCount - 1)
    if (this.refCount > 0) return // còn consumer khác đang dùng — giữ kết nối

    // Defer teardown: React Strict Mode (dev) chạy cleanup rồi remount ngay lập
    // tức trong cùng 1 tick. Nếu teardown ngay, WebSocket bị kill rồi phải tạo
    // lại → mất mọi subscription. Chờ 1 frame để remount kịp gọi connect() trước.
    if (this.pendingTeardown) clearTimeout(this.pendingTeardown)
    this.pendingTeardown = setTimeout(() => {
      this.pendingTeardown = null
      if (this.refCount === 0) this.teardown()
    }, 0)
  }

  // Dọn dứt điểm interval + WebSocket, bất kể refCount. Dùng cho HMR dispose.
  teardown() {
    this.refCount = 0
    if (this.pendingTeardown) { clearTimeout(this.pendingTeardown); this.pendingTeardown = null }
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
