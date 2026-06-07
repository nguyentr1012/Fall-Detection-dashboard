import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeviceGrid } from '@/components/features/dashboard/DeviceGrid'
import { useTelemetryStore } from '@/store/useTelemetryStore'
import type { Device } from '@/src/types'

function makeDevice(over: Partial<Device> = {}): Device {
  return {
    id: 'dev_1',
    name: 'Nguyễn Văn A',
    model: 'M1',
    status: 'online',
    lastSeen: new Date(0).toISOString(),
    lastAlert: null,
    firmwareVersion: '1.0',
    location: 'Phòng 101',
    batteryLevel: 50,
    ...over,
  }
}

const noop = () => {}

beforeEach(() => {
  useTelemetryStore.setState({ telemetry: {}, mqttConnected: false })
})

describe('DeviceGrid', () => {
  it('isLoading → render 4 skeleton', () => {
    const { container } = render(
      <DeviceGrid devices={[]} alerts={[]} isLoading selectedId={null} onSelect={noop} />
    )
    expect(container.querySelectorAll('.h-52').length).toBe(4)
  })

  it('rỗng + không loading → thông báo không có thiết bị', () => {
    render(<DeviceGrid devices={[]} alerts={[]} isLoading={false} selectedId={null} onSelect={noop} />)
    expect(screen.getByText(/Không có thiết bị nào được kết nối/)).toBeInTheDocument()
  })

  it('render một card cho mỗi thiết bị', () => {
    const devices = [makeDevice({ id: 'dev_1', name: 'A' }), makeDevice({ id: 'dev_2', name: 'B' })]
    render(<DeviceGrid devices={devices} alerts={[]} isLoading={false} selectedId={null} onSelect={noop} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('telemetry real-time override batteryLevel', () => {
    const devices = [makeDevice({ id: 'dev_1', batteryLevel: 50 })]
    useTelemetryStore.getState().updateTelemetry('dev_1', { battery_pct: 88 })
    render(<DeviceGrid devices={devices} alerts={[]} isLoading={false} selectedId={null} onSelect={noop} />)
    expect(screen.getByText('88%')).toBeInTheDocument()
    expect(screen.queryByText('50%')).not.toBeInTheDocument()
  })

  it('không có telemetry → dùng batteryLevel từ prop', () => {
    const devices = [makeDevice({ id: 'dev_1', batteryLevel: 50 })]
    render(<DeviceGrid devices={devices} alerts={[]} isLoading={false} selectedId={null} onSelect={noop} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })
})
