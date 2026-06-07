import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Alert } from '@/src/types'

// Mock tầng API: bảng log phải lấy DUY NHẤT từ đây.
vi.mock('@/services/api', () => ({ api: { getAlerts: vi.fn() } }))

import { api } from '@/services/api'
import { useCombinedAlerts } from '@/hooks/useDeviceData'
import { useAlertStore } from '@/store/useAlertStore'

const dbAlert: Alert = {
  id: 'server-id-1', deviceId: 'dev_01', deviceName: 'dev_01', severity: 'critical',
  type: 'fall_detected', message: 'Phát hiện té ngã (confidence: 96%)',
  timestamp: new Date(1_000_000).toISOString(), acknowledged: true,
}
// Cùng 1 cú ngã nhưng là bản "live" do FE tạo — id ngẫu nhiên khác hẳn.
const liveAlert: Alert = {
  id: 'client-random-uuid', deviceId: 'dev_01', deviceName: 'dev_01', severity: 'critical',
  type: 'fall_detected', message: 'Cảnh báo: Phát hiện té ngã mạnh tại...',
  timestamp: new Date(1_000_000).toISOString(), acknowledged: false,
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  useAlertStore.setState({ alerts: [], onlineDevices: [], dismissedOverlayAlertIds: [] })
  vi.mocked(api.getAlerts).mockReset()
})

describe('useCombinedAlerts — chỉ lấy từ backend (không nhân đôi)', () => {
  it('alert live trong store KHÔNG tạo thêm dòng trong bảng log', async () => {
    vi.mocked(api.getAlerts).mockResolvedValue([dbAlert])
    // Bơm 1 alert live (id khác) vào store như khi nhận MQTT
    useAlertStore.setState({ alerts: [liveAlert] })

    const { result } = renderHook(() => useCombinedAlerts(20), { wrapper })

    await waitFor(() => expect(result.current.data).toHaveLength(1))
    expect(result.current.data[0].id).toBe('server-id-1')
    // id của alert live tuyệt đối không xuất hiện trong bảng
    expect(result.current.data.some(a => a.id === 'client-random-uuid')).toBe(false)
  })

  it('trả về đúng danh sách từ API, sort theo thời gian giảm dần', async () => {
    const older = { ...dbAlert, id: 'a-old', timestamp: new Date(1000).toISOString() }
    const newer = { ...dbAlert, id: 'a-new', timestamp: new Date(9_000_000).toISOString() }
    vi.mocked(api.getAlerts).mockResolvedValue([older, newer])

    const { result } = renderHook(() => useCombinedAlerts(20), { wrapper })

    await waitFor(() => expect(result.current.data).toHaveLength(2))
    expect(result.current.data.map(a => a.id)).toEqual(['a-new', 'a-old'])
  })
})
