import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { IMUSample } from "@/src/types"
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * TÍnh SVM (Square Root of the Sum of the Squares) của dữ liệu accelerometer
 * @param x - Dữ liệu accelerometer trục x
 * @param y - Dữ liệu accelerometer trục y
 * @param z - Dữ liệu accelerometer trục z
 * @returns Giá trị SVM
 */
export function computeSVM(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

/**
 * Downsample dữ liệu accelerometer
 * @param samples - Dữ liệu accelerometer
 * @param factor - Hệ số downsample
 * @returns Dữ liệu accelerometer downsampled
 */
export function downsample(samples: IMUSample[], factor: number): IMUSample[] {
  return samples.filter((_, i) => i % factor === 0)
}


export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  const deciseconds = Math.floor((seconds % 1) * 10);
  return `${minutes}:${secs}.${deciseconds}`;
}

/**
 * Export dữ liệu accelerometer sang CSV
 * @param samples - Dữ liệu accelerometer
 * @param label - Nhãn
 * @returns Dữ liệu CSV
 */
export function exportToCSV(samples: IMUSample[], label: string): string {
  const header = 'timestamp,ax,ay,az,gx,gy,gz,label'
  const rows = samples.map(s =>
    `${s.timestamp},${s.ax},${s.ay},${s.az},${s.gx},${s.gy},${s.gz},${label}`
  )
  return [header, ...rows].join('\n')
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}