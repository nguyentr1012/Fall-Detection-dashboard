import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopNav } from '@/components/layout/TopNav'
import { useTelemetryStore } from '@/store/useTelemetryStore'

beforeEach(() => {
  useTelemetryStore.setState({ telemetry: {}, mqttConnected: false })
})

describe('TopNav', () => {
  it('mqttConnected=false → hiển thị "Reconnecting..."', () => {
    render(<TopNav onMenuToggle={() => {}} />)
    expect(screen.getByText(/MQTT: Reconnecting/)).toBeInTheDocument()
    expect(screen.queryByText(/MQTT: Live/)).not.toBeInTheDocument()
  })

  it('mqttConnected=true → hiển thị "MQTT: Live"', () => {
    useTelemetryStore.setState({ mqttConnected: true })
    render(<TopNav onMenuToggle={() => {}} />)
    expect(screen.getByText(/MQTT: Live/)).toBeInTheDocument()
    expect(screen.queryByText(/Reconnecting/)).not.toBeInTheDocument()
  })

  it('click hamburger gọi onMenuToggle', () => {
    const onMenuToggle = vi.fn()
    render(<TopNav onMenuToggle={onMenuToggle} />)
    fireEvent.click(screen.getByLabelText('Toggle sidebar'))
    expect(onMenuToggle).toHaveBeenCalledTimes(1)
  })

  it('cập nhật reactively khi store đổi trạng thái', () => {
    const { rerender } = render(<TopNav onMenuToggle={() => {}} />)
    expect(screen.getByText(/Reconnecting/)).toBeInTheDocument()
    useTelemetryStore.setState({ mqttConnected: true })
    rerender(<TopNav onMenuToggle={() => {}} />)
    expect(screen.getByText(/MQTT: Live/)).toBeInTheDocument()
  })
})
