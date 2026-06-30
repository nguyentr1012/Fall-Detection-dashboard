'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { useDevices, useSendDeviceCommand } from '@/hooks/useDeviceData'
import { useMqtt } from '@/hooks/useMqtt'
import { useCreateVerificationSession, useSubmitVerificationData, useVerificationSessions, useUpdateVerificationTrial, useDeleteVerificationSession } from '@/hooks/useVerification'
import { AccelChart } from '@/components/features/data-collection/AccelChart'
import { GyroChart } from '@/components/features/data-collection/GyroChart'
import { api } from '@/services/api'
import { computeSVM, downsample } from '@/lib/utils'
import type { AccelChartPoint, GyroChartPoint } from '@/src/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { PlugZap, Power, PlayCircle, StopCircle, Download, Archive, Timer, User, LineChart, Trash2, Pencil } from 'lucide-react'

// ---------------------------------------------------------------------------
// Activity metadata
// ---------------------------------------------------------------------------

type ModelLabel = 'Walk' | 'Run' | 'Idle' | 'Trans' | 'Trans + Idle' | 'Fall'

interface TempSession {
  id: string
  subjectCode: string
  activityCode: string
  samples: number[][]
  sampleCount: number
  durationS: number
  isSaving: boolean
}

interface ActivityInfo {
  code: string
  desc: string
  group: string
  modelLabel: ModelLabel
  durationS: number
}

const ACTIVITIES: ActivityInfo[] = [
  // ADL
  { code: 'D01', desc: 'Đi bộ bình thường trên đường phẳng',      group: 'ADL — Đi bộ',          modelLabel: 'Walk',         durationS: 60 },
  { code: 'D02', desc: 'Đi bộ nhanh trên đường phẳng',             group: 'ADL — Đi bộ',          modelLabel: 'Walk',         durationS: 60 },
  { code: 'D05', desc: 'Leo cầu thang lên rồi xuống chậm',          group: 'ADL — Đi bộ',          modelLabel: 'Walk',         durationS: 20 },
  { code: 'D03', desc: 'Chạy chậm (jog)',                           group: 'ADL — Chạy',           modelLabel: 'Run',          durationS: 60 },
  { code: 'D07', desc: 'Ngồi xuống ghế, chờ 3s, đứng lên',          group: 'ADL — Chuyển tư thế',  modelLabel: 'Trans + Idle', durationS: 12 },
  { code: 'D12', desc: 'Ngồi → nằm từ từ → chờ 3s → ngồi dậy',     group: 'ADL — Chuyển tư thế',  modelLabel: 'Trans + Idle', durationS: 15 },
  { code: 'D15', desc: 'Đứng → gập gối cúi xuống → đứng lại',       group: 'ADL — Chuyển tư thế',  modelLabel: 'Trans',        durationS: 12 },
  { code: 'D00', desc: 'Đứng yên / ngồi yên tại chỗ',               group: 'ADL — Nghỉ',           modelLabel: 'Idle',         durationS: 30 },
  // Falls
  { code: 'F01', desc: 'Đang đi bộ, ngã về phía trước',             group: 'Ngã — Đứng/Đi',        modelLabel: 'Fall',         durationS: 15 },
  { code: 'F02', desc: 'Đang đi bộ, ngã ra phía sau',               group: 'Ngã — Đứng/Đi',        modelLabel: 'Fall',         durationS: 15 },
  { code: 'F03', desc: 'Đang đi bộ, ngã sang bên',                  group: 'Ngã — Đứng/Đi',        modelLabel: 'Fall',         durationS: 15 },
  { code: 'F06', desc: 'Đang đi bộ, đổ thẳng xuống (giả lập ngất)', group: 'Ngã — Đứng/Đi',        modelLabel: 'Fall',         durationS: 15 },
  { code: 'F08', desc: 'Đang đứng dậy, ngã về phía trước',          group: 'Ngã — Đứng dậy',       modelLabel: 'Fall',         durationS: 15 },
  { code: 'F09', desc: 'Đang đứng dậy, ngã sang bên',               group: 'Ngã — Đứng dậy',       modelLabel: 'Fall',         durationS: 15 },
  { code: 'F10', desc: 'Đang ngồi xuống, ngã về phía trước',        group: 'Ngã — Ngồi xuống',     modelLabel: 'Fall',         durationS: 15 },
  { code: 'F11', desc: 'Đang ngồi xuống, ngã ra phía sau',          group: 'Ngã — Ngồi xuống',     modelLabel: 'Fall',         durationS: 15 },
  { code: 'F13', desc: 'Đang ngồi, ngã về phía trước (ngủ gật)',    group: 'Ngã — Đang ngồi',      modelLabel: 'Fall',         durationS: 15 },
  { code: 'F15', desc: 'Đang ngồi, ngã sang bên',                   group: 'Ngã — Đang ngồi',      modelLabel: 'Fall',         durationS: 15 },
]

const MODEL_LABEL_STYLE: Record<ModelLabel, string> = {
  Walk:           'bg-blue-100 text-blue-700',
  Run:            'bg-green-100 text-green-700',
  Idle:           'bg-gray-100 text-gray-600',
  Trans:          'bg-orange-100 text-orange-700',
  'Trans + Idle': 'bg-amber-100 text-amber-700',
  Fall:           'bg-red-100 text-red-700',
}

const ACTIVITY_GROUPS = Array.from(new Set(ACTIVITIES.map(a => a.group))).map(group => ({
  group,
  activities: ACTIVITIES.filter(a => a.group === group),
}))

const MAX_CHART_POINTS = 150       // ~30s @ 5Hz preview
const MAX_BUFFER_SAMPLES = 12_000  // 2 phút @ 100Hz — trần an toàn (auto-stop theo durationS của từng activity)
const SUBJECT_MAP_KEY = 'verification_subject_map'  // localStorage: { [wearerId]: 'SV01' }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nextTrialNo(
  sessions: { subject_code: string; activity_code: string }[],
  subject: string,
  activity: string
): string {
  const count = sessions.filter(
    s => s.subject_code === subject && s.activity_code === activity
  ).length
  return `R${String(count + 1).padStart(2, '0')}`
}

function fmtDuration(s: number): string {
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`
  return `${s}s`
}

/** Gợi ý mã SV kế tiếp dựa trên các mã đã gán (SV01, SV02, ...). */
function suggestSubjectCode(map: Record<string, string>): string {
  const nums = Object.values(map)
    .map(c => /^SV(\d+)$/i.exec(c.trim()))
    .filter(Boolean)
    .map(m => parseInt((m as RegExpExecArray)[1], 10))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `SV${String(next).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DataCollectionPage() {
  const { data: devices = [] } = useDevices()
  const { mutate: sendCommand, isPending: connectPending } = useSendDeviceCommand()
  const { mutate: createSession } = useCreateVerificationSession()
  const { mutate: submitData } = useSubmitVerificationData()
  const { data: sessions = [] } = useVerificationSessions()
  const { mutate: updateTrial } = useUpdateVerificationTrial()
  const { mutate: deleteSession } = useDeleteVerificationSession()

  // Setup
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [subjectCode, setSubjectCode] = useState('')
  const [subjectMap, setSubjectMap] = useState<Record<string, string>>({})
  const [activityCode, setActivityCode] = useState('')

  // Flow state (2 bước: stream preview → record)
  const [delayCountdown, setDelayCountdown] = useState<number | null>(null)
  const [tempSessions, setTempSessions] = useState<TempSession[]>([])
  const delayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [isStreaming, setIsStreaming] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sampleCount, setSampleCount] = useState(0)
  const elapsedS = sampleCount / 100

  // Chart data
  const [accelData, setAccelData] = useState<AccelChartPoint[]>([])
  const [gyroData, setGyroData] = useState<GyroChartPoint[]>([])
  const [previewTempId, setPreviewTempId] = useState<string | null>(null)

  // Đổi tên trial cho session đã lưu DB
  const [renameTarget, setRenameTarget] = useState<{ id: string; label: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Refs (tránh re-render 100Hz)
  const recordBuffer = useRef<number[][]>([])
  const isRecordingRef = useRef(false)

  // MQTT topics dùng MAC (eldercare/{mac}/...) → phải truyền MAC cho useMqtt
  // để callback map khớp với deviceId extract từ topic.
  const mountedDevices = devices.filter(d => d.wearerId != null)
  const selectedDevice = mountedDevices.find(d => d.id === selectedDeviceId)
  const selectedDeviceMac = selectedDevice?.mac ?? null
  const { lastBatch } = useMqtt(selectedDeviceMac)

  const selectedWearerId = selectedDevice?.wearerId ?? null
  const activityInfo = ACTIVITIES.find(a => a.code === activityCode)
  const trialNo = activityCode && subjectCode ? nextTrialNo(sessions, subjectCode, activityCode) : 'R01'

  // Load bản đồ wearer→SV từ localStorage 1 lần
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SUBJECT_MAP_KEY)
      if (raw) setSubjectMap(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  const persistSubjectMap = useCallback((next: Record<string, string>) => {
    setSubjectMap(next)
    try { localStorage.setItem(SUBJECT_MAP_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }, [])

  const clearTimers = useCallback(() => {
    if (delayTimerRef.current) { clearInterval(delayTimerRef.current); delayTimerRef.current = null }
    setDelayCountdown(null)
  }, [])

  // Đổi thiết bị → reset toàn bộ stream/record + nạp mã SV của người đeo
  useEffect(() => {
    clearTimers()
    setIsStreaming(false)
    isRecordingRef.current = false
    setIsRecording(false)
    setSessionId(null)
    setSampleCount(0)
    setAccelData([])
    setGyroData([])
    recordBuffer.current = []

    if (selectedWearerId) {
      setSubjectCode(prev => subjectMap[selectedWearerId] ?? (prev || suggestSubjectCode(subjectMap)))
    } else {
      setSubjectCode('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId])

  // Xử lý batch MQTT — vẽ chart khi đang stream, ghi buffer khi đang record
  useEffect(() => {
    if (!lastBatch || !isStreaming) return

    const downsampled = downsample(lastBatch.samples, 20)

    setAccelData(prev => [
      ...prev,
      ...downsampled.map(s => ({
        t: s.timestamp,
        ax: s.ax, ay: s.ay, az: s.az,
        svm: computeSVM(s.ax, s.ay, s.az),
      })),
    ].slice(-MAX_CHART_POINTS))

    setGyroData(prev => [
      ...prev,
      ...downsampled.map(s => ({ t: s.timestamp, gx: s.gx, gy: s.gy, gz: s.gz })),
    ].slice(-MAX_CHART_POINTS))

    if (isRecordingRef.current) {
      recordBuffer.current.push(
        ...lastBatch.samples.map(s => [s.ax, s.ay, s.az, s.gx, s.gy, s.gz])
      )
      setSampleCount(recordBuffer.current.length)

      if (recordBuffer.current.length >= MAX_BUFFER_SAMPLES) {
        toast.warning('Đã đạt giới hạn buffer (2 phút), tự động kết thúc thu.')
        handleStopRecord()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBatch, isStreaming])

  // ── Bước 1: Kết nối → bật stream để xem preview (chưa ghi) ────────────────
  const handleConnect = useCallback(() => {
    if (!selectedDeviceId) return
    sendCommand({ deviceId: selectedDeviceId, action: 'start_stream' }, {
      onSuccess: () => {
        setIsStreaming(true)
        setAccelData([])
        setGyroData([])
        toast.success('Đã kết nối — xem chart, khi tín hiệu ổn định thì bấm "Bắt đầu ghi"')
      },
      onError: () => toast.error('Không gửi được lệnh kết nối, thử lại.'),
    })
  }, [selectedDeviceId, sendCommand])

  // ── Bước 2: Bắt đầu ghi → tạo session + buffer (stream đã chạy) ───────────
  const startActualRecording = useCallback(() => {
    const currentActivityInfo = ACTIVITIES.find(a => a.code === activityCode)
    recordBuffer.current = []
    setSampleCount(0)
    isRecordingRef.current = true
    setIsRecording(true)

    toast.info(`Đang ghi: ${activityCode} — ${currentActivityInfo?.desc ?? ''}`)
  }, [activityCode])

  const handleStartRecord = useCallback(() => {
    if (!isStreaming || !selectedDeviceId || !activityCode || !subjectCode) return
    setDelayCountdown(5)
    delayTimerRef.current = setInterval(() => {
      setDelayCountdown(prev => {
        if (prev === null) return null
        if (prev <= 1) {
          if (delayTimerRef.current) clearInterval(delayTimerRef.current)
          startActualRecording()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }, [isStreaming, selectedDeviceId, activityCode, subjectCode, startActualRecording])

  const handleStopRecord = useCallback(() => {
    if (!isRecordingRef.current) return

    clearTimers()
    isRecordingRef.current = false
    setIsRecording(false)

    const snapshot = [...recordBuffer.current]
    recordBuffer.current = []

    setSessionId(null)
    setSampleCount(0)

    if (snapshot.length === 0) {
      toast.warning('Không có dữ liệu (0 samples)')
      return
    }

    const durationS = snapshot.length / 100
    const newTemp: TempSession = {
      id: Math.random().toString(36).substr(2, 9),
      subjectCode,
      activityCode,
      samples: snapshot,
      sampleCount: snapshot.length,
      durationS,
      isSaving: false
    }
    setTempSessions(prev => [...prev, newTemp])
    setPreviewTempId(newTemp.id)
    toast.success(`Đã thu xong mẫu tạm (${durationS.toFixed(1)}s).`)
  }, [clearTimers, subjectCode, activityCode])

  const handleSaveTempSession = useCallback((tempId: string) => {
    const temp = tempSessions.find(t => t.id === tempId)
    if (!temp) return
    if (!selectedDeviceId) {
      toast.error('Vui lòng chọn thiết bị trước khi lưu lên server.')
      return
    }
    
    setTempSessions(prev => prev.map(t => t.id === tempId ? { ...t, isSaving: true } : t))
    
    const currentTrialNo = nextTrialNo(sessions, temp.subjectCode, temp.activityCode)

    createSession({
      device_id: selectedDeviceId,
      subject_code: temp.subjectCode,
      activity_code: temp.activityCode,
      trial_no: currentTrialNo
    }, {
      onSuccess: (session) => {
        submitData({
          sessionId: session.id,
          samples: temp.samples
        }, {
          onSuccess: () => {
            setTempSessions(prev => prev.filter(t => t.id !== tempId))
            toast.success(`Đã lưu thành công lên server: ${temp.activityCode}_${temp.subjectCode}_${currentTrialNo}`)
          },
          onError: (err) => {
            toast.error(`Lỗi upload data: ${(err as Error).message}`)
            setTempSessions(prev => prev.map(t => t.id === tempId ? { ...t, isSaving: false } : t))
          }
        })
      },
      onError: (err) => {
        toast.error(`Lỗi tạo session: ${(err as Error).message}`)
        setTempSessions(prev => prev.map(t => t.id === tempId ? { ...t, isSaving: false } : t))
      }
    })
  }, [tempSessions, createSession, submitData, selectedDeviceId, sessions])

  const handleDownloadTempSession = useCallback((tempId: string) => {
    const temp = tempSessions.find(t => t.id === tempId)
    if (!temp) return
    const currentTrialNo = nextTrialNo(sessions, temp.subjectCode, temp.activityCode)
    const content = temp.samples.map(row => row.map(v => v.toFixed(6)).join(',')).join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${temp.activityCode}_${temp.subjectCode}_${currentTrialNo}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [tempSessions, sessions])

  // ── Data tạm: xóa khỏi danh sách (chỉ FE, chưa đụng server) ───────────────
  const handleDeleteTempSession = useCallback((tempId: string) => {
    setTempSessions(prev => prev.filter(t => t.id !== tempId))
    setPreviewTempId(prev => (prev === tempId ? null : prev))
    toast.info('Đã xóa mẫu tạm.')
  }, [])

  // ── Data DB: xóa hẳn session + file trên server ───────────────────────────
  const handleDeleteSession = useCallback((session: typeof sessions[number]) => {
    const name = `${session.activity_code}_${session.subject_code}_${session.trial_no}`
    if (!window.confirm(`Xóa vĩnh viễn "${name}" (cả file trên server)?`)) return
    setDeletingId(session.id)
    deleteSession(session.id, {
      onSuccess: () => toast.success(`Đã xóa: ${name}`),
      onError: (err) => toast.error(`Lỗi xóa: ${(err as Error).message}`),
      onSettled: () => setDeletingId(null),
    })
  }, [deleteSession])

  // ── Data DB: mở dialog đổi trial_no ───────────────────────────────────────
  const openRenameDialog = useCallback((session: typeof sessions[number]) => {
    setRenameTarget({
      id: session.id,
      label: `${session.activity_code}_${session.subject_code}`,
    })
    setRenameValue(session.trial_no)
  }, [])

  const handleConfirmRename = useCallback(() => {
    if (!renameTarget) return
    const next = renameValue.trim().toUpperCase()
    if (!next) { toast.error('Trial không được rỗng.'); return }
    setRenaming(true)
    updateTrial({ sessionId: renameTarget.id, trialNo: next }, {
      onSuccess: () => {
        toast.success(`Đã đổi tên thành ${renameTarget.label}_${next}`)
        setRenameTarget(null)
      },
      onError: (err) => toast.error(`Lỗi đổi tên: ${(err as Error).message}`),
      onSettled: () => setRenaming(false),
    })
  }, [renameTarget, renameValue, updateTrial])

  // ── Ngắt kết nối → dừng ghi (nếu đang) + tắt stream ───────────────────────
  const handleDisconnect = useCallback(() => {
    if (!selectedDeviceId) return
    if (isRecordingRef.current) handleStopRecord()
    setIsStreaming(false)
    sendCommand({ deviceId: selectedDeviceId, action: 'stop_stream' }, {
      onSuccess: () => toast.info('Đã ngắt kết nối stream'),
      onError: () => toast.error('Không gửi được lệnh ngắt kết nối.'),
    })
  }, [selectedDeviceId, sendCommand, handleStopRecord])

  useEffect(() => () => clearTimers(), [clearTimers])

  useEffect(() => {
    if (isRecording && activityInfo && elapsedS >= activityInfo.durationS) {
      toast.info(`Đã thu đủ ${activityInfo.durationS}s data, tự động cắt phiên stream.`)
      handleDisconnect()
    }
  }, [elapsedS, isRecording, activityInfo, handleDisconnect])

  // Watchdog timer: Nếu đang stream mà bị ngắt tín hiệu MQTT quá 3s (do firmware cắt cơm)
  useEffect(() => {
    if (!isStreaming) return
    const tid = setTimeout(() => {
      if (isStreaming) {
        if (isRecordingRef.current) {
          toast.error('Firmware đã ngắt kết nối stream! Tự động dừng thu và lưu tạm.')
        } else {
          toast.error('Mất tín hiệu stream từ thiết bị!')
        }
        handleDisconnect()
      }
    }, 3000)
    return () => clearTimeout(tid)
  }, [lastBatch, isStreaming, handleDisconnect])

  const canRecord = isStreaming && !isRecording && !!activityCode && !!subjectCode

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-end flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => api.exportAllVerification().catch(e => toast.error(e.message))}
        >
          <Archive className="size-4 mr-1.5" />
          Xuất ZIP tất cả
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ===== Left panel: Setup ===== */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Thiết lập phiên thu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">

            {/* Device / wearer selector */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Người đeo (thiết bị đã gán)</label>
              <Select
                value={selectedDeviceId}
                onValueChange={setSelectedDeviceId}
                disabled={isStreaming}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn người đeo..." />
                </SelectTrigger>
                <SelectContent>
                  {mountedDevices.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      Chưa có thiết bị nào được gán người
                    </SelectItem>
                  ) : (
                    mountedDevices.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="flex items-center gap-1.5">
                          <User className="size-3.5 text-gray-400" />
                          <span>{d.name}</span>
                          <span className="font-mono text-[11px] text-gray-400">({d.id})</span>
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Subject code (đặt tên trên FE, lưu localStorage theo wearer) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Mã subject (SisFall)</label>
              <Input
                value={subjectCode}
                maxLength={4}
                placeholder="SV01"
                disabled={!selectedWearerId || isRecording}
                onChange={e => {
                  const v = e.target.value.toUpperCase().replace(/\s/g, '')
                  setSubjectCode(v)
                  if (selectedWearerId) persistSubjectMap({ ...subjectMap, [selectedWearerId]: v })
                }}
                className="font-mono"
              />
              <p className="text-[11px] text-gray-400">
                {selectedWearerId
                  ? `Gán cho "${selectedDevice?.name}" — nhớ trên máy này cho lần sau`
                  : 'Chọn người đeo trước'}
              </p>
            </div>

            {/* Activity */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Hoạt động</label>
              <Select value={activityCode} onValueChange={setActivityCode} disabled={isRecording}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn hoạt động..." />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {ACTIVITY_GROUPS.map(({ group, activities }) => (
                    <SelectGroup key={group}>
                      <SelectLabel className="font-semibold">{group}</SelectLabel>
                      {activities.map(a => (
                        <SelectItem key={a.code} value={a.code}>
                          <span className="flex items-center gap-1.5 pr-2">
                            <span className="font-mono text-[11px] text-gray-400">{a.code}</span>
                            <span className="flex-1">{a.desc}</span>
                            <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${MODEL_LABEL_STYLE[a.modelLabel]}`}>
                              {a.modelLabel}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Activity info card (khi đã chọn, chưa ghi) */}
            {activityInfo && !isRecording && (
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Nhãn model</span>
                  <span className={`font-medium px-2 py-0.5 rounded-full ${MODEL_LABEL_STYLE[activityInfo.modelLabel]}`}>
                    {activityInfo.modelLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Timer className="size-3" />Thời lượng gợi ý
                  </span>
                  <span className="font-semibold text-gray-800">{fmtDuration(activityInfo.durationS)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Trial tiếp theo</span>
                  <span className="font-mono font-bold text-gray-800">{subjectCode ? trialNo : '—'}</span>
                </div>
              </div>
            )}

            {/* Recording status */}
            {delayCountdown !== null && (
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 space-y-2 text-center">
                <p className="text-sm font-semibold text-yellow-800">Chuẩn bị thu dữ liệu...</p>
                <p className="text-4xl font-bold text-yellow-600">{delayCountdown}</p>
                <p className="text-xs text-yellow-700">Vui lòng vào tư thế sẵn sàng</p>
              </div>
            )}

            {isRecording && activityInfo && delayCountdown === null && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-red-500 animate-pulse inline-block" />
                  <span className="font-semibold text-red-700">
                    {subjectCode} · {activityCode} — {activityInfo.desc}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-600">Đã thu</span>
                  <span className="font-mono font-bold text-red-700">{elapsedS.toFixed(1)}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-600 flex items-center gap-1">
                    <Timer className="size-3" />Còn lại (gợi ý)
                  </span>
                  <span className={`font-mono font-bold ${Math.max(0, activityInfo.durationS - elapsedS) <= 5 ? 'text-red-700 text-sm' : 'text-gray-700'}`}>
                    {Math.max(0, activityInfo.durationS - Math.floor(elapsedS))}s
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-600">Samples @100Hz</span>
                  <span className="font-mono font-bold text-red-700">{sampleCount.toLocaleString()}</span>
                </div>
                <div className="w-full bg-red-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-red-400 h-1.5 rounded-full transition-all duration-1000"
                    style={{ width: `${activityInfo.durationS > 0 ? Math.min(100, (elapsedS / activityInfo.durationS) * 100) : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Controls — luồng 2 bước */}
            <div className="pt-1 space-y-2">
              {!isStreaming ? (
                <Button
                  className="w-full"
                  onClick={handleConnect}
                  disabled={!selectedDeviceId || connectPending}
                >
                  <PlugZap className="size-4 mr-1.5" />
                  {connectPending ? 'Đang kết nối...' : 'Kết nối (xem preview)'}
                </Button>
              ) : (
                <>
                  {!isRecording && delayCountdown === null ? (
                    <Button className="w-full" onClick={handleStartRecord} disabled={!canRecord}>
                      <PlayCircle className="size-4 mr-1.5" />
                      Bắt đầu ghi (sau 5s)
                    </Button>
                  ) : delayCountdown !== null ? (
                    <Button variant="destructive" className="w-full" onClick={() => {
                        if (delayTimerRef.current) clearInterval(delayTimerRef.current)
                        setDelayCountdown(null)
                    }}>
                      <StopCircle className="size-4 mr-1.5" />
                      Hủy chuẩn bị
                    </Button>
                  ) : (
                    <Button variant="destructive" className="w-full" onClick={handleStopRecord}>
                      <StopCircle className="size-4 mr-1.5" />
                      Kết thúc ghi
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDisconnect}
                    disabled={connectPending}
                  >
                    <Power className="size-4 mr-1.5" />
                    Ngắt kết nối
                  </Button>
                </>
              )}

              {isStreaming && !isRecording && !canRecord && (
                <p className="text-center text-xs text-gray-400">
                  {!subjectCode ? 'Đặt mã subject cho người đeo' : !activityCode ? 'Chọn hoạt động cần thu' : 'Sẵn sàng ghi'}
                </p>
              )}
              {!isStreaming && !selectedDeviceId && (
                <p className="text-center text-xs text-gray-400">Assign thiết bị cho người đeo trước, rồi chọn ở đây</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ===== Right panel: Charts ===== */}
        <div className="lg:col-span-2 space-y-3">
          {isStreaming ? (
            <>
              <AccelChart data={accelData} />
              <GyroChart data={gyroData} />
            </>
          ) : (
            <Card className="h-[474px] flex items-center justify-center border-dashed">
              <div className="text-center text-gray-400 space-y-1">
                <PlugZap className="size-10 mx-auto opacity-30" />
                <p className="text-sm">Nhấn <strong>Kết nối</strong> để xem biểu đồ IMU realtime trước khi ghi</p>
                <p className="text-xs">AccelChart (ax/ay/az/SVM) + GyroChart (gx/gy/gz)</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ===== Session log table ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Lịch sử phiên thu
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({sessions.length} đã lưu{tempSessions.length > 0 ? ` · ${tempSessions.length} tạm` : ''})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-1">
          {sessions.length === 0 && tempSessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Chưa có phiên thu nào</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Subject</TableHead>
                    <TableHead>Hoạt động</TableHead>
                    <TableHead className="w-12">Trial</TableHead>
                    <TableHead className="text-right w-20">Samples</TableHead>
                    <TableHead className="text-right w-20">Thời gian</TableHead>
                    <TableHead className="w-20">Trạng thái</TableHead>
                    <TableHead className="w-32 text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tempSessions.map((t, idx) => {
                    const info = ACTIVITIES.find(a => a.code === t.activityCode)
                    return (
                      <TableRow key={t.id} className="bg-orange-50/50">
                        <TableCell className="font-mono text-xs">{t.subjectCode}</TableCell>
                        <TableCell>
                          <div>
                            <span className={`inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded mr-1 ${info ? MODEL_LABEL_STYLE[info.modelLabel] : 'bg-gray-100 text-gray-500'}`}>
                              {t.activityCode}
                            </span>
                            <span className="text-xs text-gray-600">{info?.desc ?? '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-orange-600 font-bold">Tạm {idx+1}</TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {t.sampleCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {t.durationS.toFixed(1)}s
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-orange-500 font-medium">Chưa lưu</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[10px]"
                              onClick={() => setPreviewTempId(t.id)}
                            >
                              <LineChart className="size-3 mr-1" />
                              Xem
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[10px]"
                              disabled={t.isSaving}
                              onClick={() => handleDownloadTempSession(t.id)}
                            >
                              <Download className="size-3 mr-1" />
                              Tải
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 px-2 text-[10px]"
                              disabled={t.isSaving || !selectedDeviceId}
                              onClick={() => handleSaveTempSession(t.id)}
                            >
                              {t.isSaving ? 'Đang lưu...' : 'Lưu'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              disabled={t.isSaving}
                              title="Xóa mẫu tạm"
                              onClick={() => handleDeleteTempSession(t.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {sessions.map(s => {
                    const info = ACTIVITIES.find(a => a.code === s.activity_code)
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.subject_code}</TableCell>
                        <TableCell>
                          <div>
                            <span className={`inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded mr-1 ${info ? MODEL_LABEL_STYLE[info.modelLabel] : 'bg-gray-100 text-gray-500'}`}>
                              {s.activity_code}
                            </span>
                            <span className="text-xs text-gray-600">{info?.desc ?? '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{s.trial_no}</TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {s.sample_count != null ? s.sample_count.toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {s.duration_s != null ? `${s.duration_s.toFixed(1)}s` : '—'}
                        </TableCell>
                        <TableCell>
                          {s.file_path ? (
                            <span className="text-xs font-medium text-green-600">✓ Lưu</span>
                          ) : s.sample_count === 0 ? (
                            <span className="text-xs text-orange-500">Rỗng</span>
                          ) : (
                            <span className="text-xs text-gray-400">Chờ…</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5 justify-end">
                            {s.file_path && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                title={`Tải ${s.activity_code}_${s.subject_code}_${s.trial_no}.txt`}
                                onClick={() =>
                                  api.downloadVerificationFile(
                                    s.id,
                                    `${s.activity_code}_${s.subject_code}_${s.trial_no}.txt`
                                  ).catch(e => toast.error(e.message))
                                }
                              >
                                <Download className="size-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="Đổi tên trial"
                              onClick={() => openRenameDialog(s)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              disabled={deletingId === s.id}
                              title="Xóa session"
                              onClick={() => handleDeleteSession(s)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog cho Temp Session */}
      <Dialog open={!!previewTempId} onOpenChange={(open) => !open && setPreviewTempId(null)}>
        <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Mẫu Tạm</DialogTitle>
            <DialogDescription>
              Biểu đồ IMU (đã downsample về 5Hz) của bản ghi tạm chưa lưu.
            </DialogDescription>
          </DialogHeader>
          {previewTempId && (() => {
            const temp = tempSessions.find(t => t.id === previewTempId)
            if (!temp) return null
            const ds = downsample(temp.samples.map(s => ({
              timestamp: 0, ax: s[0], ay: s[1], az: s[2], gx: s[3], gy: s[4], gz: s[5]
            })), 20)
            const pAccel = ds.map((s, i) => ({ t: i, ax: s.ax, ay: s.ay, az: s.az, svm: computeSVM(s.ax, s.ay, s.az) }))
            const pGyro = ds.map((s, i) => ({ t: i, gx: s.gx, gy: s.gy, gz: s.gz }))
            return (
              <div className="space-y-4">
                <AccelChart data={pAccel} />
                <GyroChart data={pGyro} />
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog đổi tên trial cho session đã lưu DB */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && !renaming && setRenameTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Đổi tên trial</DialogTitle>
            <DialogDescription>
              {renameTarget
                ? `File sẽ đổi thành ${renameTarget.label}_${(renameValue.trim().toUpperCase() || '?')}.txt`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Trial mới</label>
            <Input
              value={renameValue}
              maxLength={6}
              placeholder="R01"
              className="font-mono"
              disabled={renaming}
              onChange={e => setRenameValue(e.target.value.toUpperCase().replace(/\s/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirmRename() }}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={renaming} onClick={() => setRenameTarget(null)}>
                Hủy
              </Button>
              <Button size="sm" disabled={renaming} onClick={handleConfirmRename}>
                {renaming ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
