import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { IMUBatch, Alert } from '@/src/types'
import type { TelemetrySample } from '@/lib/mqtt-client'

// ---- Fake mqtt module (thay cho broker thật) -----------------------------
// Dùng vi.hoisted để factory vi.mock truy cập được (vi.mock bị hoist lên đầu).
const h = vi.hoisted(() => {
  type Handler = (...a: unknown[]) => void
  class FakeMqttClient {
    handlers: Record<string, Handler[]> = {}
    subscribed: string[] = []
    unsubscribed: string[] = []
    ended = false
    on(ev: string, cb: Handler) { (this.handlers[ev] ??= []).push(cb); return this }
    emit(ev: string, ...args: unknown[]) { this.handlers[ev]?.forEach(cb => cb(...args)) }
    subscribe(topic: string) { this.subscribed.push(topic) }
    unsubscribe(topic: string) { this.unsubscribed.push(topic) }
    end() { this.ended = true }
  }
  const state: { clients: FakeMqttClient[] } = { clients: [] }
  const connect = vi.fn(() => {
    const c = new FakeMqttClient()
    state.clients.push(c)
    return c
  })
  return { connect, state, FakeMqttClient }
})

vi.mock('mqtt', () => ({ default: { connect: h.connect } }))

const GLOBAL_KEY = '__mqttClientManager__'
function resetSingleton() {
  ;(globalThis as Record<string, unknown>)[GLOBAL_KEY] = undefined
  h.state.clients = []
  h.connect.mockClear()
}
function lastClient() {
  return h.state.clients[h.state.clients.length - 1]
}
// Chờ dynamic import('mqtt') trong connectReal resolve (cần macrotask, không chỉ microtask).
async function flush() {
  await new Promise(r => setTimeout(r, 0))
  await new Promise(r => setTimeout(r, 0))
}

async function loadClient() {
  return (await import('@/lib/mqtt-client')).getMqttClient()
}

// =====================  MOCK MODE  =========================================
describe('mqtt-client — mock mode', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_MQTT', 'true')
    resetSingleton()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('connect fire connectionChange(true) và set isConnected', async () => {
    const client = await loadClient()
    const changes: boolean[] = []
    client.onConnectionChange(c => changes.push(c))
    client.connect('dev_1')
    expect(client.isConnected).toBe(true)
    expect(changes).toEqual([true])
  })

  it('getMqttClient trả về cùng một singleton', async () => {
    const a = await loadClient()
    const b = await loadClient()
    expect(a).toBe(b)
  })

  it('telemetry callback nhận sample sau interval (mock)', async () => {
    const client = await loadClient()
    const got: TelemetrySample[] = []
    client.connect('dev_1')
    client.subscribe('dev_1', undefined, undefined, (_id, data) => got.push(data))
    vi.advanceTimersByTime(10000) // t đạt 1000 ở tick thứ 20
    expect(got.length).toBeGreaterThanOrEqual(1)
    expect(got[0].battery_pct).toBeGreaterThanOrEqual(60)
    expect(got[0].battery_pct).toBeLessThanOrEqual(100)
  })

  it('batch callback nhận IMU batch mỗi tick', async () => {
    const client = await loadClient()
    const batches: IMUBatch[] = []
    client.connect('dev_1')
    client.subscribe('dev_1', b => batches.push(b))
    vi.advanceTimersByTime(1500) // 3 ticks
    expect(batches.length).toBe(3)
    expect(batches[0].samples.length).toBe(50)
    expect(batches[0].deviceId).toBe('dev_1')
  })

  it('wildcard "*" telemetry callback cũng nhận sample', async () => {
    const client = await loadClient()
    const got: string[] = []
    client.connect('dev_1')
    // batch theo deviceId để mock loop bắn telemetry cho dev_1; '*' nhận telemetry
    client.subscribe('dev_1', () => {})
    client.subscribe('*', undefined, undefined, id => got.push(id))
    vi.advanceTimersByTime(10000)
    expect(got).toContain('dev_1')
  })

  it('alert callback fire sau ~120s mock', async () => {
    const client = await loadClient()
    const alerts: Alert[] = []
    client.connect('dev_1')
    client.subscribe('dev_1', () => {}, a => alerts.push(a))
    vi.advanceTimersByTime(120000)
    expect(alerts.length).toBeGreaterThanOrEqual(1)
    expect(alerts[0].type).toBe('fall_detected')
  })

  it('unsubscribe gỡ callback — không nhận thêm batch', async () => {
    const client = await loadClient()
    const batches: IMUBatch[] = []
    client.connect('dev_1')
    client.subscribe('dev_1', b => batches.push(b))
    vi.advanceTimersByTime(500)
    const after1 = batches.length
    client.unsubscribe('dev_1')
    vi.advanceTimersByTime(2000)
    expect(batches.length).toBe(after1)
  })

  it('ref-count: connect×2 / disconnect×1 vẫn giữ interval; disconnect×2 mới teardown', async () => {
    const client = await loadClient()
    const batches: IMUBatch[] = []
    client.connect('a')
    client.connect('b')
    client.subscribe('a', b => batches.push(b))
    vi.advanceTimersByTime(500)
    expect(batches.length).toBe(1)

    client.disconnect() // refCount 2 -> 1, interval còn sống
    vi.advanceTimersByTime(500)
    expect(batches.length).toBe(2)

    client.disconnect() // refCount 1 -> 0 -> teardown
    vi.advanceTimersByTime(2000)
    expect(batches.length).toBe(2) // không tăng nữa
    expect(client.isConnected).toBe(false)
  })

  it('onConnectionChange trả hàm gỡ listener', async () => {
    const client = await loadClient()
    const changes: boolean[] = []
    const off = client.onConnectionChange(c => changes.push(c))
    off()
    client.connect('dev_1') // fire true nhưng listener đã gỡ
    expect(changes).toEqual([])
  })
})

// =====================  REAL MODE (mock 'mqtt')  ===========================
describe('mqtt-client — real mode', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_MQTT', 'false')
    vi.stubEnv('NEXT_PUBLIC_MQTT_BROKER_URL', 'wss://broker.test')
    resetSingleton()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('connect gọi mqtt.connect và subscribe topic khi nhận event "connect"', async () => {
    const client = await loadClient()
    client.connect('dev_1')
    await flush()
    expect(h.connect).toHaveBeenCalledTimes(1)
    const c = lastClient()
    c.emit('connect')
    expect(client.isConnected).toBe(true)
    // B1: realtime telemetry đến từ topic `status` (firmware publish thật), KHÔNG phải `telemetry`.
    expect(c.subscribed).toContain('eldercare/+/status')
    expect(c.subscribed).toContain('eldercare/+/alert/fall')
    // không có batch consumer → KHÔNG subscribe imu/raw
    expect(c.subscribed).not.toContain('eldercare/+/imu/raw')
  })

  it('parse message /status và fire telemetry callback (B1)', async () => {
    const client = await loadClient()
    const got: TelemetrySample[] = []
    client.connect('dev_1')
    await flush()
    const c = lastClient()
    c.emit('connect')
    client.subscribe('dev_9', undefined, undefined, (_id, d) => got.push(d))
    // Firmware status dùng key `battery`; handler map sang battery_pct.
    const payload = Buffer.from(JSON.stringify({ battery: 42, walk_steps: 10, run_steps: 2, timestamp: 999 }))
    c.emit('message', 'eldercare/dev_9/status', payload)
    expect(got).toHaveLength(1)
    expect(got[0]).toEqual({ battery_pct: 42, walk_steps: 10, run_steps: 2, timestamp: 999 })
  })

  it('status thiếu field → default 0 (B1)', async () => {
    const client = await loadClient()
    const got: TelemetrySample[] = []
    client.connect('dev_1')
    await flush()
    const c = lastClient()
    c.emit('connect')
    client.subscribe('dev_9', undefined, undefined, (_id, d) => got.push(d))
    c.emit('message', 'eldercare/dev_9/status', Buffer.from(JSON.stringify({})))
    expect(got[0]).toMatchObject({ battery_pct: 0, walk_steps: 0, run_steps: 0 })
  })

  it('message /fall tạo Alert critical', async () => {
    const client = await loadClient()
    const alerts: Alert[] = []
    client.connect('dev_1')
    await flush()
    const c = lastClient()
    c.emit('connect')
    client.subscribe('dev_9', undefined, a => alerts.push(a))
    c.emit('message', 'eldercare/dev_9/alert/fall', Buffer.from(JSON.stringify({ message: 'ngã!' })))
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({ severity: 'critical', type: 'fall_detected', message: 'ngã!', deviceId: 'dev_9' })
  })

  it('imu/raw bị bỏ qua khi không có batch consumer', async () => {
    const client = await loadClient()
    client.connect('dev_1')
    await flush()
    const c = lastClient()
    c.emit('connect')
    // chỉ telemetry consumer, không batch → handler imu/raw return sớm, không throw
    const got: TelemetrySample[] = []
    client.subscribe('dev_9', undefined, undefined, (_id, d) => got.push(d))
    expect(() =>
      c.emit('message', 'eldercare/dev_9/imu/raw', Buffer.from(JSON.stringify({ ts: 1, fs: 100, d: [[1, 2, 3, 4, 5, 6]] })))
    ).not.toThrow()
    expect(got).toHaveLength(0)
  })

  it('batch consumer kích hoạt subscribe imu/raw và parse batch', async () => {
    const client = await loadClient()
    const batches: IMUBatch[] = []
    client.connect('dev_1')
    await flush()
    const c = lastClient()
    c.emit('connect')
    client.subscribe('dev_9', b => batches.push(b)) // batch consumer đầu tiên
    // Code thật subscribe `imu_stream` (không phải `imu/raw`) — test trước lệch contract.
    expect(c.subscribed).toContain('eldercare/+/imu_stream')
    c.emit('message', 'eldercare/dev_9/imu_stream', Buffer.from(JSON.stringify({ ts: 1000, fs: 100, d: [[1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12]] })))
    expect(batches).toHaveLength(1)
    expect(batches[0].samples).toHaveLength(2)
    expect(batches[0].samples[0]).toMatchObject({ ax: 1, ay: 2, az: 3, gx: 4, gy: 5, gz: 6 })
  })

  it('payload JSON hỏng bị bỏ qua, không throw', async () => {
    const client = await loadClient()
    const got: TelemetrySample[] = []
    client.connect('dev_1')
    await flush()
    const c = lastClient()
    c.emit('connect')
    client.subscribe('dev_9', undefined, undefined, (_id, d) => got.push(d))
    expect(() => c.emit('message', 'eldercare/dev_9/telemetry', Buffer.from('{ not json'))).not.toThrow()
    expect(got).toHaveLength(0)
  })

  it('event error/close fire connectionChange(false)', async () => {
    const client = await loadClient()
    const changes: boolean[] = []
    client.onConnectionChange(c => changes.push(c))
    client.connect('dev_1')
    await flush()
    const c = lastClient()
    c.emit('connect')
    c.emit('error', new Error('boom'))
    c.emit('close')
    expect(changes).toEqual([true, false, false])
    expect(client.isConnected).toBe(false)
  })

  it('reconfigure end client cũ và tạo client mới', async () => {
    const client = await loadClient()
    client.connect('dev_1')
    await flush()
    const old = lastClient()
    old.emit('connect')
    await client.reconfigure('wss://new.broker', 'user', 'pass')
    await flush()
    expect(old.ended).toBe(true)
    expect(h.connect).toHaveBeenCalledTimes(2)
    expect(lastClient()).not.toBe(old)
  })

  it('không set broker URL → log lỗi, không tạo client', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('NEXT_PUBLIC_MOCK_MQTT', 'false')
    // NEXT_PUBLIC_MQTT_BROKER_URL không set
    resetSingleton()
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = await loadClient()
    client.connect('dev_1')
    await flush()
    expect(h.connect).not.toHaveBeenCalled()
    expect(errSpy).toHaveBeenCalled()
  })
})
