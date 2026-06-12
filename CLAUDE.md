# Frontend — Fall Detection Dashboard

## Tech Stack
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix UI) + `components.json`
- **State**: Zustand v5 (`store/`)
- **Server state / fetch**: TanStack React Query v5
- **Realtime**: MQTT over WebSocket — thư viện `mqtt` v5
- **Charts**: Recharts v3
- **Toast**: Sonner
- **Test**: Vitest + Testing Library (`test/`)
- **Tunnel dev**: ngrok (`ngrok.yml`, `npm run share`)

## Cấu trúc thư mục

```
app/                          # Next.js App Router
├── layout.tsx                # Root layout: providers, theme
├── page.tsx                  # Trang chính (Dashboard)
└── globals.css               # Tailwind base styles

components/
└── providers.tsx             # QueryClientProvider + ThemeProvider

hooks/
├── useMqtt.ts                # Kết nối MQTT broker, subscribe topics, dispatch vào store
└── useDeviceData.ts          # React Query hook fetch danh sách device + trạng thái

lib/
├── apiClient.ts              # Axios/fetch wrapper — tự động đính JWT header
├── mqtt-client.ts            # Khởi tạo MQTT client singleton (WebSocket)
├── imu-parser.ts             # Parse payload IMU binary/JSON từ MQTT
├── alarm.ts                  # Phát âm thanh cảnh báo khi có alert
├── jwt.ts                    # Decode JWT, check expiry
├── query-client.ts           # TanStack QueryClient singleton config
└── utils.ts                  # cn() helper (clsx + tailwind-merge)

services/
└── api.ts                    # Tất cả API call function (auth, devices, wearers, alerts, history)

store/                        # Zustand stores
├── useAlertStore.ts          # Danh sách alert chưa resolve, âm thanh, overlay state
├── useTelemetryStore.ts      # Dữ liệu IMU realtime theo device_id
└── useSettingsStore.ts       # User preferences (theme, MQTT config...)

src/types/
├── index.d.ts                # Global TypeScript types (Device, Wearer, Alert, User...)
└── mqtt.d.ts                 # Types cho MQTT payload

proxy.ts                      # Dev proxy — forward /api/* đến backend local
openapi.json                  # OpenAPI spec của backend — source of truth cho API types
```

## Luồng dữ liệu realtime

```
MQTT Broker (WebSocket)
  └── mqtt-client.ts (singleton)
        └── useMqtt.ts (hook)
              ├── imu-parser.ts ──► useTelemetryStore  ──► Chart components
              └── alert payload ──► useAlertStore ──► alarm.ts + Alert overlay UI
```

## Luồng fetch REST

```
services/api.ts ──► apiClient.ts (JWT header) ──► Backend FastAPI
      ↑
useDeviceData.ts (React Query) ──► components
```

## Quy ước
- **Store** = chỉ dữ liệu realtime (MQTT). Dữ liệu từ REST dùng React Query, không bỏ vào store.
- **`services/api.ts`** là nơi duy nhất gọi HTTP — component không fetch trực tiếp.
- Types sinh ra từ `openapi.json` — khi backend thay đổi schema thì regenerate types từ file này.
- Test file đặt trong `test/`, đặt tên `<ComponentName>.test.tsx` hoặc `<hook>.test.ts`.
- `npm run share` = build + start + ngrok tunnel cùng lúc (demo).
