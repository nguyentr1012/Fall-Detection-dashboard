'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { useDevices, useSendDeviceCommand } from '@/hooks/useDeviceData'
import { useMqtt } from '@/hooks/useMqtt'
import { useCreateVerificationSession, useSubmitVerificationData, useVerificationSessions } from '@/hooks/useVerification'
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
import { PlugZap, Power, PlayCircle, StopCircle, Download, Archive, Timer, User } from 'lucide-react'

// ---------------------------------------------------------------------------
// Activity metadata
// ---------------------------------------------------------------------------

type ModelLabel = 'Walk' | 'Run' | 'Idle' | 'Trans' | 'Trans + Idle' | 'Fall'

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

const MAX_CHART_POINTS = 300       // ~30s @ 10Hz preview
const MAX_BUFFER_SAMPLES = 72_000  // 12 phút @ 100Hz — trần an toàn
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

  // Setup
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [subjectCode, setSubjectCode] = useState('')
  const [subjectMap, setSubjectMap] = useState<Record<string, string>>({})
  const [activityCode, setActivityCode] = useState('')

  // Flow state (2 bước: stream preview → record)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sampleCount, setSampleCount] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [elapsedS, setElapsedS] = useState(0)

  // Chart data
  const [accelData, setAccelData] = useState<AccelChartPoint[]>([])
  const [gyroData, setGyroData] = useState<GyroChartPoint[]>([])

  // Refs (tránh re-render 100Hz)
  const recordBuffer = useRef<number[][]>([])
  const isRecordingRef = useRef(false)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { lastBatch } = useMqtt(selectedDeviceId || null)

  const mountedDevices = devices.filter(d => d.wearerId != null)
  const selectedDevice = mountedDevices.find(d => d.id === selectedDeviceId)
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
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null }
    if (elapsedTimerRef.current)   { clearInterval(elapsedTimerRef.current);   elapsedTimerRef.current = null }
  }, [])

  // Đổi thiết bị → reset toàn bộ stream/record + nạp mã SV của người đeo
  useEffect(() => {
    clearTimers()
    setIsStreaming(false)
    isRecordingRef.current = false
    setIsRecording(false)
    setSessionId(null)
    setSampleCount(0)
    setCountdown(0)
    setElapsedS(0)
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

    const downsampled = downsample(lastBatch.samples, 10)

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
        toast.warning('Đã đạt giới hạn buffer (12 phút), tự động kết thúc thu.')
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
  const handleStartRecord = useCallback(() => {
    if (!isStreaming || !selectedDeviceId || !activityCode || !subjectCode) return

    const currentTrialNo = trialNo
    const currentActivityInfo = activityInfo

    createSession(
      { device_id: selectedDeviceId, subject_code: subjectCode, activity_code: activityCode, trial_no: currentTrialNo },
      {
        onSuccess: (session) => {
          setSessionId(session.id)
          recordBuffer.current = []
          setSampleCount(0)
          isRecordingRef.current = true
          setIsRecording(true)

          if (currentActivityInfo) {
            setCountdown(currentActivityInfo.durationS)
            countdownTimerRef.current = setInterval(() => {
              setCountdown(prev => Math.max(0, prev - 1))
            }, 1000)
          }
          setElapsedS(0)
          elapsedTimerRef.current = setInterval(() => setElapsedS(prev => prev + 1), 1000)

          toast.info(`Đang ghi: ${activityCode} — ${currentActivityInfo?.desc ?? ''}`)
        },
        onError: (err) => toast.error(`Lỗi tạo session: ${(err as Error).message}`),
      }
    )
  }, [isStreaming, selectedDeviceId, activityCode, subjectCode, trialNo, activityInfo, createSession])

  // ── Kết thúc ghi → submit data, GIỮ stream để thu trial tiếp ──────────────
  const handleStopRecord = useCallback(() => {
    if (!isRecordingRef.current) return

    clearTimers()
    isRecordingRef.current = false
    setIsRecording(false)

    const snapshot = [...recordBuffer.current]
    recordBuffer.current = []
    const currentSessionId = sessionId

    setSessionId(null)
    setSampleCount(0)
    setCountdown(0)
    setElapsedS(0)

    if (!currentSessionId) return

    submitData(
      { sessionId: currentSessionId, samples: snapshot },
      {
        onSuccess: () => {
          const durationS = (snapshot.length / 100).toFixed(1)
          toast.success(`Đã lưu ${snapshot.length.toLocaleString()} samples (${durationS}s)`)
        },
        onError: (err) => toast.error(`Lỗi lưu data: ${(err as Error).message}`),
      }
    )

    if (snapshot.length === 0) toast.warning('Không có dữ liệu (0 samples)')
  }, [sessionId, clearTimers, submitData])

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

  const canRecord = isStreaming && !isRecording && !!activityCode && !!subjectCode

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Thu Data Verification</h1>
          <p className="text-sm text-gray-500">Verify model fall detection v30_optimize — xuất raw .txt định dạng SisFall</p>
        </div>
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
            {isRecording && activityInfo && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-red-500 animate-pulse inline-block" />
                  <span className="font-semibold text-red-700">
                    {subjectCode} · {activityCode} — {activityInfo.desc}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-600">Đã thu</span>
                  <span className="font-mono font-bold text-red-700">{elapsedS}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-600 flex items-center gap-1">
                    <Timer className="size-3" />Còn lại (gợi ý)
                  </span>
                  <span className={`font-mono font-bold ${countdown <= 5 ? 'text-red-700 text-sm' : 'text-gray-700'}`}>
                    {countdown > 0 ? `${countdown}s` : 'Hết giờ gợi ý'}
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
                  {!isRecording ? (
                    <Button className="w-full" onClick={handleStartRecord} disabled={!canRecord}>
                      <PlayCircle className="size-4 mr-1.5" />
                      Bắt đầu ghi
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
            <span className="ml-2 text-xs font-normal text-gray-400">({sessions.length} phiên)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-1">
          {sessions.length === 0 ? (
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
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
    </div>
  )
}
