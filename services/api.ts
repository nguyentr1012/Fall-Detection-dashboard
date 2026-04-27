import { createClient } from '@/lib/supabase'
import type { Device, Alert, DeviceConfig, RecordingSession } from '@/src/types'

function mapAlert(row: Record<string, unknown>): Alert {
  return {
    id: row.id as string,
    deviceId: row.device_id as string,
    deviceName: (row.device_id as string),
    severity: row.severity as Alert['severity'],
    type: row.type as Alert['type'],
    message: (row.message as string | null) ?? '',
    timestamp: row.created_at as string,
    acknowledged: (row.acknowledged as boolean | null) ?? false,
  }
}

export const api = {
  getDevices: async (): Promise<Device[]> => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('devices')
      .select('device_id, firmware_version, model, is_active, last_seen, wearers!current_wearer_id(id, full_name, height_cm)')
    if (error) throw error
    return (data ?? []).map(d => {
      const wearer = (d as Record<string, unknown>).wearers as { full_name: string } | null
      return {
        id: d.device_id,
        name: wearer?.full_name ?? 'Chưa gán',
        model: d.model ?? 'MPU-6050',
        status: d.is_active ? 'online' : 'offline',
        lastSeen: d.last_seen ?? new Date().toISOString(),
        lastAlert: null,
        firmwareVersion: d.firmware_version ?? '1.0.0',
        location: d.device_id,
      } as Device
    })
  },

  getDevice: async (id: string): Promise<Device> => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('devices')
      .select('device_id, firmware_version, model, is_active, last_seen, wearers!current_wearer_id(id, full_name, height_cm)')
      .eq('device_id', id)
      .single()
    if (error) throw error
    const wearer = (data as Record<string, unknown>).wearers as { full_name: string } | null
    return {
      id: data.device_id,
      name: wearer?.full_name ?? 'Chưa gán',
      model: data.model ?? 'MPU-6050',
      status: data.is_active ? 'online' : 'offline',
      lastSeen: data.last_seen ?? new Date().toISOString(),
      lastAlert: null,
      firmwareVersion: data.firmware_version ?? '1.0.0',
      location: data.device_id,
    } as Device
  },

  getAlerts: async (limit = 20): Promise<Alert[]> => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('alerts')
      .select('id, device_id, severity, type, message, acknowledged, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []).map(row => mapAlert(row as Record<string, unknown>))
  },

  getDeviceAlerts: async (deviceId: string, limit = 20): Promise<Alert[]> => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('alerts')
      .select('id, device_id, severity, type, message, acknowledged, created_at')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []).map(row => mapAlert(row as Record<string, unknown>))
  },

  getDeviceConfig: async (deviceId: string): Promise<DeviceConfig> => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('device_configs')
      .select(`
        device_id, sampling_rate, fall_threshold, transmit_interval, alert_enabled,
        devices!device_configs_device_id_fkey(
          current_wearer_id,
          wearers!current_wearer_id(full_name, height_cm)
        )
      `)
      .eq('device_id', deviceId)
      .single()
    if (error) throw error
    const device = (data as Record<string, unknown>).devices as Record<string, unknown> | null
    const wearer = device?.wearers as { full_name: string; height_cm: number } | null
    return {
      deviceId: data.device_id,
      name: wearer?.full_name ?? 'Chưa gán',
      samplingRate: data.sampling_rate as 50 | 100 | 200,
      fallThreshold: data.fall_threshold,
      transmitInterval: data.transmit_interval,
      alertEnabled: data.alert_enabled,
      wearerName: wearer?.full_name,
      heightCm: wearer?.height_cm,
    }
  },

  updateDeviceConfig: async (deviceId: string, config: Partial<DeviceConfig>): Promise<DeviceConfig> => {
    const supabase = createClient()

    const configPatch: Record<string, unknown> = {}
    if (config.samplingRate !== undefined) configPatch.sampling_rate = config.samplingRate
    if (config.fallThreshold !== undefined) configPatch.fall_threshold = config.fallThreshold
    if (config.transmitInterval !== undefined) configPatch.transmit_interval = config.transmitInterval
    if (config.alertEnabled !== undefined) configPatch.alert_enabled = config.alertEnabled

    if (Object.keys(configPatch).length > 0) {
      const { error } = await supabase.from('device_configs').update(configPatch).eq('device_id', deviceId)
      if (error) throw error
    }

    if (config.wearerName !== undefined || config.heightCm !== undefined) {
      const { data: deviceRow } = await supabase
        .from('devices').select('current_wearer_id').eq('device_id', deviceId).single()
      if (deviceRow?.current_wearer_id) {
        const wearerPatch: Record<string, unknown> = {}
        if (config.wearerName !== undefined) wearerPatch.full_name = config.wearerName
        if (config.heightCm !== undefined) wearerPatch.height_cm = config.heightCm
        const { error } = await supabase.from('wearers').update(wearerPatch).eq('id', deviceRow.current_wearer_id)
        if (error) throw error
      }
    }

    return api.getDeviceConfig(deviceId)
  },

  acknowledgeAlert: async (alertId: string): Promise<void> => {
    const supabase = createClient()
    const { error } = await supabase.from('alerts').update({ acknowledged: true }).eq('id', alertId)
    if (error) throw error
  },

  saveRecordingSession: async (session: RecordingSession): Promise<{ id: string }> => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('recording_sessions')
      .insert({
        device_id: session.deviceId,
        label: session.label,
        start_timestamp: session.startTimestamp,
        end_timestamp: session.endTimestamp,
        sample_count: session.sampleCount,
      })
      .select('id')
      .single()
    if (error) throw error
    return { id: data.id }
  },
}
