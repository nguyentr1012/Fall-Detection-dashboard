import { describe, it, expect, beforeEach } from 'vitest'
import { useTelemetryStore } from '@/store/useTelemetryStore'

// Store là singleton module-level → reset state về rỗng trước mỗi test
// để các test không rò trạng thái lẫn nhau.
beforeEach(() => {
  useTelemetryStore.setState({ telemetry: {}, mqttConnected: false })
})

// Helper gọi action qua getState() để luôn lấy reference mới nhất.
const update = (id: string, data: Parameters<ReturnType<typeof useTelemetryStore.getState>['updateTelemetry']>[1]) =>
  useTelemetryStore.getState().updateTelemetry(id, data)
const read = (id: string) => useTelemetryStore.getState().getTelemetry(id)

describe('useTelemetryStore — contract theo SPEC', () => {
  // SPEC 1: thiết bị mới
  describe('SPEC 1 — thiết bị mới', () => {
    it('tạo entry với đúng các giá trị truyền vào và last_seen > 0', () => {
      update('d1', { battery_pct: 80, walk_steps: 100, run_steps: 50 })
      const t = read('d1')
      expect(t).toBeDefined()
      expect(t!.battery_pct).toBe(80)
      expect(t!.walk_steps).toBe(100)
      expect(t!.run_steps).toBe(50)
      expect(typeof t!.last_seen).toBe('number')
      expect(t!.last_seen).toBeGreaterThan(0)
    })
  })

  // SPEC 2: field số không truyền → default 0 (chỉ khi MỚI)
  describe('SPEC 2 — default 0 cho field số khi thiết bị mới', () => {
    it('walk_steps và run_steps default 0 khi chỉ truyền battery_pct', () => {
      update('d2', { battery_pct: 90 })
      const t = read('d2')
      expect(t).toBeDefined()
      expect(t!.battery_pct).toBe(90)
      expect(t!.walk_steps).toBe(0)
      expect(t!.run_steps).toBe(0)
    })
  })

  // SPEC 3: PARTIAL UPDATE phải GIỮ NGUYÊN field cũ (contract quan trọng nhất)
  describe('SPEC 3 — partial update giữ nguyên field cũ', () => {
    beforeEach(() => {
      update('d3', { battery_pct: 75, walk_steps: 100, run_steps: 5 })
    })

    it('update chỉ battery_pct → walk_steps và run_steps KHÔNG bị reset về 0', () => {
      update('d3', { battery_pct: 60 })
      const t = read('d3')!
      expect(t.battery_pct).toBe(60)
      expect(t.walk_steps).toBe(100)
      expect(t.run_steps).toBe(5)
    })

    it('update chỉ walk_steps → battery_pct và run_steps giữ nguyên', () => {
      update('d3', { walk_steps: 250 })
      const t = read('d3')!
      expect(t.walk_steps).toBe(250)
      expect(t.battery_pct).toBe(75)
      expect(t.run_steps).toBe(5)
    })

    it('nhiều partial update liên tiếp tích lũy đúng, không mất field', () => {
      update('d3', { battery_pct: 60 })
      update('d3', { run_steps: 9 })
      update('d3', { walk_steps: 120 })
      const t = read('d3')!
      expect(t.battery_pct).toBe(60)
      expect(t.walk_steps).toBe(120)
      expect(t.run_steps).toBe(9)
    })

    it('giá trị 0 truyền tường minh vẫn được áp (không bị coi là "thiếu")', () => {
      update('d3', { walk_steps: 0 })
      const t = read('d3')!
      expect(t.walk_steps).toBe(0)
      // các field khác giữ nguyên
      expect(t.battery_pct).toBe(75)
      expect(t.run_steps).toBe(5)
    })
  })

  // SPEC 4: last_seen
  describe('SPEC 4 — last_seen', () => {
    it('dùng đúng giá trị last_seen khi được truyền', () => {
      update('d_ls', { battery_pct: 50, last_seen: 12345 })
      expect(read('d_ls')!.last_seen).toBe(12345)
    })

    it('khi không truyền last_seen → là timestamp number > 0', () => {
      const before = Date.now()
      update('d_ls2', { battery_pct: 50 })
      const t = read('d_ls2')!
      expect(typeof t.last_seen).toBe('number')
      expect(t.last_seen).toBeGreaterThan(0)
      expect(t.last_seen).toBeGreaterThanOrEqual(before)
    })
  })

  // SPEC 5: cô lập giữa device
  describe('SPEC 5 — cô lập giữa các device', () => {
    it('cập nhật d4 không làm thay đổi telemetry của d5', () => {
      update('d5', { battery_pct: 30, walk_steps: 200, run_steps: 7 })
      const d5Before = { ...read('d5')! }
      update('d4', { battery_pct: 99, walk_steps: 1, run_steps: 1 })
      const d5After = read('d5')!
      expect(d5After).toEqual(d5Before)
    })
  })

  // SPEC 6: getTelemetry
  describe('SPEC 6 — getTelemetry', () => {
    it('trả undefined cho device chưa từng cập nhật', () => {
      expect(read('never_seen')).toBeUndefined()
    })

    it('trả object đúng cho device đã có', () => {
      update('d6', { battery_pct: 42, walk_steps: 11, run_steps: 3, last_seen: 999 })
      expect(read('d6')).toEqual({
        battery_pct: 42,
        walk_steps: 11,
        run_steps: 3,
        last_seen: 999,
      })
    })
  })

  // SPEC 7: setMqttConnected
  describe('SPEC 7 — setMqttConnected', () => {
    it('set true rồi false cập nhật đúng cờ mqttConnected', () => {
      useTelemetryStore.getState().setMqttConnected(true)
      expect(useTelemetryStore.getState().mqttConnected).toBe(true)
      useTelemetryStore.getState().setMqttConnected(false)
      expect(useTelemetryStore.getState().mqttConnected).toBe(false)
    })

    it('không đụng tới telemetry', () => {
      update('d7', { battery_pct: 55, walk_steps: 5, run_steps: 1, last_seen: 100 })
      const snapshot = { ...read('d7')! }
      useTelemetryStore.getState().setMqttConnected(true)
      expect(read('d7')).toEqual(snapshot)
    })
  })
})
