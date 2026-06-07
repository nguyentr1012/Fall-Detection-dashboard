import { describe, it, expect, beforeEach } from 'vitest'
import { useTelemetryStore } from '@/store/useTelemetryStore'

// Store là singleton module-level → reset thủ công trước mỗi test.
function resetStore() {
  useTelemetryStore.setState({ telemetry: {}, mqttConnected: false })
}

describe('useTelemetryStore', () => {
  beforeEach(resetStore)

  it('khởi tạo state rỗng và mqttConnected=false', () => {
    const s = useTelemetryStore.getState()
    expect(s.telemetry).toEqual({})
    expect(s.mqttConnected).toBe(false)
  })

  it('updateTelemetry tạo entry mới, merge default cho field thiếu', () => {
    useTelemetryStore.getState().updateTelemetry('dev_1', { battery_pct: 80 })
    const t = useTelemetryStore.getState().getTelemetry('dev_1')
    expect(t).toBeDefined()
    expect(t!.battery_pct).toBe(80)
    // các field không truyền lấy default 0
    expect(t!.walk_steps).toBe(0)
    expect(t!.run_steps).toBe(0)
    expect(typeof t!.last_seen).toBe('number')
  })

  it('partial update giữ nguyên field cũ chưa truyền', () => {
    const { updateTelemetry } = useTelemetryStore.getState()
    updateTelemetry('dev_1', { battery_pct: 80, walk_steps: 100, run_steps: 5 })
    updateTelemetry('dev_1', { battery_pct: 75 }) // chỉ update pin
    const t = useTelemetryStore.getState().getTelemetry('dev_1')!
    expect(t.battery_pct).toBe(75)
    expect(t.walk_steps).toBe(100) // giữ nguyên
    expect(t.run_steps).toBe(5)
  })

  it('updateTelemetry tôn trọng last_seen được truyền vào', () => {
    useTelemetryStore.getState().updateTelemetry('dev_1', { battery_pct: 50, last_seen: 12345 })
    expect(useTelemetryStore.getState().getTelemetry('dev_1')!.last_seen).toBe(12345)
  })

  it('getTelemetry trả undefined cho device chưa biết', () => {
    expect(useTelemetryStore.getState().getTelemetry('unknown')).toBeUndefined()
  })

  it('setMqttConnected bật/tắt cờ kết nối', () => {
    useTelemetryStore.getState().setMqttConnected(true)
    expect(useTelemetryStore.getState().mqttConnected).toBe(true)
    useTelemetryStore.getState().setMqttConnected(false)
    expect(useTelemetryStore.getState().mqttConnected).toBe(false)
  })

  it('giữ telemetry của nhiều thiết bị độc lập nhau', () => {
    const { updateTelemetry, getTelemetry } = useTelemetryStore.getState()
    updateTelemetry('dev_1', { battery_pct: 90 })
    updateTelemetry('dev_2', { battery_pct: 30, walk_steps: 200 })
    expect(getTelemetry('dev_1')!.battery_pct).toBe(90)
    expect(getTelemetry('dev_2')!.battery_pct).toBe(30)
    expect(getTelemetry('dev_2')!.walk_steps).toBe(200)
    // update dev_1 không ảnh hưởng dev_2
    updateTelemetry('dev_1', { battery_pct: 10 })
    expect(getTelemetry('dev_2')!.battery_pct).toBe(30)
  })
})
