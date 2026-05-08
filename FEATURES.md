# Tài liệu Chức năng Frontend (Web Dashboard)

Tài liệu này mô tả chi tiết các chức năng đã được hoàn thành trong dự án Web Dashboard quản lý người già và thiết bị chống té ngã, cùng với vị trí mã nguồn tương ứng để tiện tra cứu và bảo trì.

## 1. Cấu trúc Kiến trúc (Architecture)
- **Framework:** Next.js (App Router).
- **Data Fetching:** TanStack (React) Query được sử dụng để cache, refetch và đồng bộ trạng thái server.
- **Styling & UI:** Tailwind CSS và thư viện component Shadcn UI.
- **Giao tiếp API:** Tập trung toàn bộ logic fetch tại `services/api.ts` kết hợp với `lib/apiClient.ts` để tự động chèn JWT token.

## 2. Hệ thống Xác thực (Authentication)
- **Tính năng:** Đăng nhập, lưu trữ phiên bản an toàn, bảo vệ các tuyến đường (Protected Routes).
- **Vị trí Code:**
  - `app/login/page.tsx`: Giao diện đăng nhập.
  - `app/actions/auth.ts`: Next.js Server Action thực hiện gọi API Backend và ghi JWT Token vào HTTP Cookie.
  - `lib/apiClient.ts`: Tự động đọc Cookie (client-side) và đính kèm `Authorization: Bearer <token>` vào mọi request.

## 3. Các màn hình chính (Screens & Routes)

### 3.1. Dashboard Tổng quan (`app/page.tsx`)
- **Chức năng:** Trình bày cái nhìn toàn cảnh về hệ thống. Giám sát thiết bị theo thời gian thực.
- **Thành phần UI (`components/features/dashboard/`):**
  - `DeviceGrid.tsx`: Hiển thị danh sách thiết bị dạng lưới, trạng thái online/offline, phần trăm pin.
  - `CriticalAlertBanner.tsx`: Banner đỏ xuất hiện ngay lập tức khi có cảnh báo té ngã chưa xử lý.
  - `PatientProfile.tsx`: Khung hiển thị thông tin bệnh nhân khi click vào thiết bị.
  - `WeeklyActivityTrends.tsx`: Biểu đồ thống kê bước chân và mức độ hoạt động.

### 3.2. Quản lý Thiết bị (`app/devices/page.tsx`)
- **Chức năng:** Quản lý vòng đời phần cứng.
- **Tính năng chi tiết:** Đăng ký thiết bị (MAC address), Gán (Assign) thiết bị cho bệnh nhân, Gỡ (Unassign), Cập nhật Firmware Version.
- **Thành phần UI:** `components/features/devices/DeviceTable.tsx`, `DeviceFormDialog.tsx`.

### 3.3. Quản lý Bệnh nhân (`app/wearers/page.tsx`)
- **Chức năng:** Quản lý hồ sơ người đeo thiết bị trong viện dưỡng lão/tổ chức.
- **Tính năng chi tiết:** Thêm mới, chỉnh sửa thông tin (Đặc biệt: Trường chiều cao `height_cm` được quản lý chặt chẽ để Backend dùng nội suy quãng đường bước chân).
- **Thành phần UI:** `components/features/wearers/WearerTable.tsx`, `WearerFormDialog.tsx`.

### 3.4. Lịch sử Cảnh báo (`app/alerts/page.tsx`)
- **Chức năng:** Truy xuất và kiểm tra các sự kiện bất thường.
- **Tính năng chi tiết:** Xem danh sách Fall Alerts, mức độ tin cậy (Confidence). Nút đánh dấu đã xử lý (Acknowledge/Resolve).

### 3.5. Thu thập Dữ liệu - Phase 1 (`app/data-collection/page.tsx`)
- **Chức năng:** Màn hình chuyên dụng cho giai đoạn 1 của dự án để thu thập dữ liệu IMU thô (Raw Data).
- **Tính năng chi tiết:** Cấu hình nhãn (Label: Đi bộ, té ngã,...), stream dữ liệu, gửi batch lên InfluxDB qua Backend.

## 4. Quản lý Trạng thái & API Hooks (`hooks/useDeviceData.ts`)
Thay vì gọi trực tiếp `api.ts` trong các Component, dự án bọc API vào các custom hooks để tái sử dụng:
- `useDevices()`, `useDeviceAlerts()`: Tự động polling dữ liệu (refetchInterval) để UI luôn cập nhật thời gian thực.
- `useStepsHistory()`: Tải dữ liệu biểu đồ.
- Các Mutations (`useCreateWearer`, `useAssignDevice`...): Tự động vô hiệu hoá cache (invalidate) sau khi POST/PUT/DELETE thành công để bảng dữ liệu tự động làm mới.
