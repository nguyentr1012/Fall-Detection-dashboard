# Báo cáo Quá trình Refactor Frontend (v2.0)
**Thời gian:** 07/05/2026
**Trạng thái:** Hoàn thành chuyển đổi hệ thống Auth & API (Custom JWT + FastAPI)

## 1. Những thay đổi chính (Core Changes)

### 🔐 Hệ thống Xác thực (Authentication)
- **Custom JWT Auth**: Đã chuyển từ Supabase Auth sang hệ thống xác thực tùy chỉnh gọi API FastAPI.
- **HTTP-Only Cookies**: Token JWT được lưu trữ an toàn trong Cookie `auth_token` với thuộc tính `httpOnly`, giúp chống tấn công XSS.
- **Middleware/Proxy**: Đã chuyển đổi từ `middleware.ts` sang `proxy.ts` (chuẩn Next.js 16) để bảo vệ các route Dashboard. Người dùng chưa đăng nhập sẽ tự động bị điều hướng về `/login`.

### 🌐 Giao tiếp Dữ liệu (API Layer)
- **apiClient**: Tạo mới `lib/apiClient.ts` sử dụng `fetch` thuần, tự động đính kèm Bearer Token từ Cookie vào mọi request gửi lên Backend.
- **Dọn dẹp Supabase**: 
    - Gỡ bỏ hoàn toàn các thư viện `@supabase/ssr` và `@supabase/supabase-js`.
    - Xóa các file cấu hình `lib/supabase.ts`, `lib/supabase-server.ts`.
    - Viết lại `services/api.ts` để gọi API Backend FastAPI (localhost:8000) thay vì truy vấn trực tiếp vào Database Supabase.
- **Đồng bộ hóa**: Cập nhật `hooks/useDeviceData.ts` để định kỳ cập nhật dữ liệu (Polling):
    - Dữ liệu thiết bị: 60 giây/lần.
    - Cảnh báo (Alerts): 30 giây/lần.

### 📡 Real-time & Store
- **MQTT Integration**: Chuyển toàn bộ cơ chế nhận cảnh báo Té ngã (Fall Detection) từ Supabase Realtime sang **MQTT over WebSockets**.
- **Alert Store**: Cập nhật `useAlertStore.ts` để loại bỏ logic Supabase, tập trung quản lý cảnh báo nhận được từ MQTT.

## 2. Các lỗi đã xử lý (Bug Fixes)
- **Fix lỗi Crash**: Xóa bỏ các tham chiếu cũ tới `subscribeToRealtime` trong `providers.tsx`.
- **Fix lỗi Recharts**: Sửa lỗi "width(-1) height(-1)" bằng cách trì hoãn render biểu đồ cho đến khi component đã mount hoàn toàn trên trình duyệt.
- **Fix lỗi Bcrypt**: Xử lý xung đột giữa `passlib` và `bcrypt` trên Python 3.12 (phía Backend).

## 3. Lưu ý cho cộng sự
- **Biến môi trường**: Đã cập nhật `.env.local`. Cần đảm bảo có `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`.
- **Chạy Backend**: Trước khi chạy Frontend (`npm run dev`), hãy đảm bảo Backend FastAPI đang chạy để các hàm API không bị lỗi 404/500.
- **Tài khoản test**: Sử dụng `admin` / `admin123` để đăng nhập.

---
*Báo cáo này được tạo tự động bởi Antigravity AI Assistant.*
