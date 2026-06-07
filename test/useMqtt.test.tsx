import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Fake manager để cô lập hook khỏi MqttClientManager thật.
const fake = vi.hoisted(() => {
  const m = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    unsubscribe: vi.fn(),
    subscribe: vi.fn(),
    onConnectionChange: vi.fn(() => () => {}),
    isConnected: false,
    // captured callbacks
    _batch: undefined as undefined | ((b: unknown) => void),
    _alert: undefined as undefined | ((a: unknown) => void),
    _tel: undefined as undefined | ((id: string, d: unknown) => void),
  }
  m.subscribe.mockImplementation((_id: string, onBatch, onAlert, onTel) => {
    m._batch = onBatch
    m._alert = onAlert
    m._tel = onTel
  })
  return m
})

vi.mock('@/lib/mqtt-client', () => ({ getMqttClient: () => fake }))

import { useMqtt } from '@/hooks/useMqtt'
import { useAlertStore } from '@/store/useAlertStore'
import { useTelemetryStore } from '@/store/useTelemetryStore'

beforeEach(() => {
  useAlertStore.setState({ alerts: [], onlineDevices: [], dismissedOverlayAlertIds: [] })
  useTelemetryStore.setState({ telemetry: {}, mqttConnected: false })
  fake.connect.mockClear(); fake.disconnect.mockClear()
  fake.unsubscribe.mockClear(); fake.subscribe.mockClear()
})

describe('useMqtt', () => {
  it('deviceId null → không connect', () => {
    const { result } = renderHook(() => useMqtt(null))
    expect(fake.connect).not.toHaveBeenCalled()
    expect(result.current.isConnected).toBe(false)
  })

  it('deviceId → connect, set online, subscribe', () => {
    const { result } = renderHook(() => useMqtt('dev_1'))
    expect(fake.connect).toHaveBeenCalledWith('dev_1')
    expect(fake.subscribe).toHaveBeenCalledWith('dev_1', expect.any(Function), expect.any(Function), expect.any(Function))
    expect(result.current.isConnected).toBe(true)
    expect(useAlertStore.getState().onlineDevices).toContain('dev_1')
  })

  it('telemetry callback cập nhật useTelemetryStore (kèm last_seen)', () => {
    renderHook(() => useMqtt('dev_1'))
    act(() => {
      fake._tel!('dev_1', { battery_pct: 55, walk_steps: 7, run_steps: 1 })
    })
    const t = useTelemetryStore.getState().getTelemetry('dev_1')!
    expect(t.battery_pct).toBe(55)
    expect(typeof t.last_seen).toBe('number')
  })

  it('alert callback thêm alert vào store', () => {
    renderHook(() => useMqtt('dev_1'))
    act(() => {
      fake._alert!({ id: 'a1', deviceId: 'dev_1', deviceName: 'd', severity: 'critical', type: 'fall_detected', message: 'x', timestamp: new Date(0).toISOString(), acknowledged: false })
    })
    expect(useAlertStore.getState().alerts.map(a => a.id)).toContain('a1')
  })

  it('batch callback expose lastBatch và giữ device online', () => {
    const { result, rerender } = renderHook(() => useMqtt('dev_1'))
    act(() => {
      fake._batch!({ deviceId: 'dev_1', batchId: 'b1', startTimestamp: 0, samples: [] })
    })
    rerender()
    expect(result.current.lastBatch?.batchId).toBe('b1')
    expect(useAlertStore.getState().onlineDevices).toContain('dev_1')
  })

  it('unmount → unsubscribe + disconnect + set offline', () => {
    const { unmount } = renderHook(() => useMqtt('dev_1'))
    expect(useAlertStore.getState().onlineDevices).toContain('dev_1')
    unmount()
    expect(fake.unsubscribe).toHaveBeenCalledWith('dev_1')
    expect(fake.disconnect).toHaveBeenCalledTimes(1)
    expect(useAlertStore.getState().onlineDevices).not.toContain('dev_1')
  })
})
