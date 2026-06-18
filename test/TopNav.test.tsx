import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render as rtlRender, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { useTelemetryStore } from '@/store/useTelemetryStore'

// TopNav render NotificationBell -> useCombinedAlerts (React Query) nên test
// PHẢI bọc QueryClientProvider, nếu không lỗi "No QueryClient set".
function render(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrap = (node: ReactElement) => <QueryClientProvider client={qc}>{node}</QueryClientProvider>
  const result = rtlRender(wrap(ui))
  // rerender cũng phải bọc provider (cùng QueryClient) nếu không lỗi lại.
  return { ...result, rerender: (next: ReactElement) => result.rerender(wrap(next)) }
}

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
