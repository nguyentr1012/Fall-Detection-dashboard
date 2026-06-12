import type { IMUSample } from '@/src/types'

interface RawImuPayload {
  ts: number      // Unix ms - timestamp of first sample
  fs: number      // Sampling frequency (100)
  cnt?: number    // Number of samples (e.g. 50)
  data_b64?: string // Base64 encoded binary data (int16_t x 6 array)
  mode?: string   // Current activity mode
  d?: number[][]  // Legacy 2D array: [[ax,ay,az,gx,gy,gz], ...]
}

/**
 * Parses the compact format from MQTT into an array of IMUSample objects.
 * Supports both legacy 2D array and new Base64 binary formats.
 * Scales raw int16_t values to G (accelerometer) and deg/s (gyroscope).
 */
export function parseRawImu(payload: RawImuPayload): IMUSample[] {
  const interval = 1000 / (payload.fs || 100)

  if (payload.data_b64) {
    const binaryStr = atob(payload.data_b64)
    const len = binaryStr.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    const view = new DataView(bytes.buffer)
    const samples: IMUSample[] = []
    const cnt = payload.cnt || (len / 12)

    for (let i = 0; i < cnt; i++) {
      const offset = i * 12
      // ESP32 uses Little Endian. Scale values: Accel 8g (4096 LSB/g), Gyro 2000dps (16.4 LSB/deg/s)
      const ax = view.getInt16(offset + 0, true) / 4096.0
      const ay = view.getInt16(offset + 2, true) / 4096.0
      const az = view.getInt16(offset + 4, true) / 4096.0
      const gx = view.getInt16(offset + 6, true) / 16.4
      const gy = view.getInt16(offset + 8, true) / 16.4
      const gz = view.getInt16(offset + 10, true) / 16.4

      samples.push({
        timestamp: payload.ts + i * interval,
        ax, ay, az, gx, gy, gz
      })
    }
    return samples
  }

  if (payload.d) {
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

  return []
}
