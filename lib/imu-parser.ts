import type { IMUSample } from '@/src/types'

interface RawImuPayload {
  ts: number      // Unix ms - timestamp of first sample
  fs: number      // Sampling frequency (100)
  mode?: string   // Current activity mode
  d: number[][]   // 2D array: [[ax,ay,az,gx,gy,gz], ...]
}

/**
 * Parses the compact 2D array format from MQTT into an array of IMUSample objects.
 * This format is optimized for bandwidth on 4G LTE connections.
 */
export function parseRawImu(payload: RawImuPayload): IMUSample[] {
  const interval = 1000 / payload.fs  // 10ms for 100Hz
  return payload.d.map((row, i) => ({
    timestamp: payload.ts + i * interval,
    ax: row[0],
    ay: row[1],
    az: row[2],
    gx: row[3],
    gy: row[4],
    gz: row[5],
  }))
}
