import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'

const fake = vi.hoisted(() => {
  const m = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    unsubscribe: vi.fn(),
    subscribe: vi.fn(),
    onConnectionChange: vi.fn(),
    off: vi.fn(),
    _conn: undefined as undefined | ((c: boolean) => void),
    _alert: undefined as undefined | ((a: unknown) => void),
    _tel: undefined as undefined | ((id: string, d: unknown) => void),
  }
  m.onConnectionChange.mockImplementation((cb: (c: boolean) => void) => { m._conn = cb; return m.off })
  m.subscribe.mockImplementation((_id: string, _b, onAlert, onTel) => { m._alert = onAlert; m._tel = onTel })
  return m
})
const playAlarm = vi.hoisted(() => vi.fn())

vi.mock('@/lib/mqtt-client', () => ({ getMqttClient: () => fake }))
vi.mock('@/lib/alarm', () => ({ playAlarm }))

import { GlobalMqttInit } from '@/components/shared/GlobalMqttInit'
import { useAlertStore } from '@/store/useAlertStore'
import { useTelemetryStore } from '@/store/useTelemetryStore'
import { useSettingsStore } from '@/store/useSettingsStore'

function makeAlert(type: 'fall_detected' | 'low_battery' = 'fall_detected') {
  return { id: 'a1', deviceId: 'dev_1', deviceName: 'd', severity: 'critical' as const, type, message: 'm', timestamp: new Date(0).toISOString(), acknowledged: false }
}

beforeEach(() => {
  useAlertStore.setState({ alerts: [], onlineDevices: [], dismissedOverlayAlertIds: [] })
  useTelemetryStore.setState({ telemetry: {}, mqttConnected: false })
  useSettingsStore.setState({ soundEnabled: true })
  Object.values(fake).forEach(v => { if (typeof v === 'function' && 'mockClear' in v) (v as { mockClear: () => void }).mockClear() })
  playAlarm.mockClear()
})

describe('GlobalMqttInit', () => {
  it('render null (không có DOM output)', () => {
    const { container } = render(<GlobalMqttInit />)
    expect(container.firstChild).toBeNull()
  })

  it('connect global-monitor + đăng ký onConnectionChange + subscribe "*" không batch', () => {
    render(<GlobalMqttInit />)
    expect(fake.connect).toHaveBeenCalledWith('global-monitor')
    expect(fake.onConnectionChange).toHaveBeenCalledTimes(1)
    expect(fake.subscribe).toHaveBeenCalledWith('*', undefined, expect.any(Function), expect.any(Function))
  })

  it('connectionChange → setMqttConnected trong telemetry store', () => {
    render(<GlobalMqttInit />)
    act(() => fake._conn!(true))
    expect(useTelemetryStore.getState().mqttConnected).toBe(true)
    act(() => fake._conn!(false))
    expect(useTelemetryStore.getState().mqttConnected).toBe(false)
  })

  it('telemetry callback → updateTelemetry', () => {
    render(<GlobalMqttInit />)
    act(() => fake._tel!('dev_2', { battery_pct: 33, walk_steps: 0, run_steps: 0 }))
    expect(useTelemetryStore.getState().getTelemetry('dev_2')!.battery_pct).toBe(33)
  })

  it('alert fall + soundEnabled=true → addAlert và playAlarm', () => {
    render(<GlobalMqttInit />)
    act(() => fake._alert!(makeAlert('fall_detected')))
    expect(useAlertStore.getState().alerts).toHaveLength(1)
    expect(playAlarm).toHaveBeenCalledTimes(1)
  })

  it('alert fall + soundEnabled=false → addAlert nhưng KHÔNG playAlarm', () => {
    useSettingsStore.setState({ soundEnabled: false })
    render(<GlobalMqttInit />)
    act(() => fake._alert!(makeAlert('fall_detected')))
    expect(useAlertStore.getState().alerts).toHaveLength(1)
    expect(playAlarm).not.toHaveBeenCalled()
  })

  it('alert không phải fall → KHÔNG playAlarm dù sound bật', () => {
    render(<GlobalMqttInit />)
    act(() => fake._alert!(makeAlert('low_battery')))
    expect(playAlarm).not.toHaveBeenCalled()
  })

  it('unmount → off connectionChange + unsubscribe + disconnect', () => {
    const { unmount } = render(<GlobalMqttInit />)
    unmount()
    expect(fake.off).toHaveBeenCalledTimes(1)
    expect(fake.unsubscribe).toHaveBeenCalledWith('*')
    expect(fake.disconnect).toHaveBeenCalledTimes(1)
  })
})
