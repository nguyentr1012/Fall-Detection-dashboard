import type { Device, Alert, DeviceConfig, RecordingSession } from '@/src/types'

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms))
/**
 * Dữ liệu giả để test, sửa đúng dữ liệu thực sau
 */
const MOCK_DEVICES: Device[] = [
  { id: 'd1', name: 'Cảm biến Phòng Khách', model: 'MPU-6050', status: 'online',
    lastSeen: new Date().toISOString(), lastAlert: null, firmwareVersion: '1.2.3', location: 'Phòng Khách' },
  { id: 'd2', name: 'Cảm biến Phòng Ngủ', model: 'MPU-6050', status: 'online',
    lastSeen: new Date().toISOString(), lastAlert: null, firmwareVersion: '1.2.1', location: 'Phòng Ngủ' },
  { id: 'd3', name: 'Cảm biến Nhà Tắm', model: 'ICM-42688', status: 'online',
    lastSeen: new Date().toISOString(), lastAlert: null, firmwareVersion: '1.3.0', location: 'Nhà Tắm' },
  { id: 'd4', name: 'Cảm biến Bếp', model: 'MPU-6050', status: 'offline',
    lastSeen: new Date(Date.now() - 3600_000).toISOString(), lastAlert: null, firmwareVersion: '1.1.0', location: 'Bếp' },
]

const MOCK_ALERTS: Alert[] = Array.from({ length: 15 }, (_, i) => ({
  id: `a${i}`, deviceId: MOCK_DEVICES[i % 3].id, deviceName: MOCK_DEVICES[i % 3].name,
  severity: i % 5 === 0 ? 'critical' : i % 3 === 0 ? 'warning' : 'info',
  type: i % 5 === 0 ? 'fall_detected' : i % 3 === 0 ? 'low_battery' : 'connection_lost',
  message: i % 5 === 0 ? `Phát hiện té ngã, độ tin cậy ${80 + i}%` : `Cảnh báo #${i}`,
  timestamp: new Date(Date.now() - i * 600_000).toISOString(), acknowledged: i > 5,
}))

export const api = {
  getDevices: async (): Promise<Device[]> => { await delay(); return MOCK_DEVICES },
  getDevice: async (id: string): Promise<Device> => {
    await delay(); return MOCK_DEVICES.find(d => d.id === id) ?? MOCK_DEVICES[0]
  },
  getAlerts: async (limit = 20): Promise<Alert[]> => {
    await delay(); return MOCK_ALERTS.slice(0, limit)
  },
  getDeviceAlerts: async (deviceId: string, limit = 20): Promise<Alert[]> => {
    await delay(); return MOCK_ALERTS.filter(a => a.deviceId === deviceId).slice(0, limit)
  },
  getDeviceConfig: async (deviceId: string): Promise<DeviceConfig> => {
    await delay()
    return { deviceId, name: MOCK_DEVICES.find(d => d.id === deviceId)?.name ?? 'Device',
      samplingRate: 100, fallThreshold: 2.5, transmitInterval: 500, alertEnabled: true }
  },
  updateDeviceConfig: async (deviceId: string, config: Partial<DeviceConfig>): Promise<DeviceConfig> => {
    await delay(300); return { deviceId, name: 'Device', samplingRate: 100,
      fallThreshold: 2.5, transmitInterval: 500, alertEnabled: true, ...config }
  },
  saveRecordingSession: async (_session: RecordingSession): Promise<{ id: string }> => {
    await delay(500); return { id: crypto.randomUUID() }
  },
}