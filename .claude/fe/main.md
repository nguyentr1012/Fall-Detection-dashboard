# THÔNG TIN DỰ ÁN
- **Tên dự án:** Web Frontend - Hệ thống giám sát hành vi người già & Phát hiện té ngã (IoT + TinyML).
- **Phạm vi (Strict Scope):** Chỉ gồm 3 màn hình: Dashboard (List device + Alert), Data Collection (Thu thập raw data IMU), Device Detail (Lịch sử + Cấu hình).

# TECH STACK BẮT BUỘC
- **Framework:** Next.js (App Router `app/`).
- **UI/Styling:** Tailwind CSS, Shadcn UI.
- **State Management:** Zustand (Chỉ dùng cho Global Alert & Trạng thái tĩnh).
- **Realtime:** `mqtt` (WSS trực tiếp từ Browser đến Broker).
- **Data Fetching:** TanStack Query.
- **Charting:** Recharts.

# QUY TẮC LÀM VIỆC KHẮT KHE (CRITICAL RULES)
1. **ĐÁNH GIÁ KHẢ THI TRƯỚC TIÊN:** Không bao giờ viết code ngay khi có yêu cầu mới. Phải phân tích rủi ro hiệu năng (đặc biệt là realtime 2Hz/100Hz), bundle size và đưa ra đề xuất tinh gọn.
2. **HỎI VÀ CHỜ XÁC NHẬN:** Chỉ sinh code chi tiết khi User phản hồi "Đồng ý" với bảng thiết kế/kiến trúc.
3. **NO FEATURE CREEP:** Không tự ý thêm tính năng rườm rà ngoài yêu cầu. Giữ mọi thứ tối giản, đúng mô tả UI Zones.
4. **BẢO VỆ HIỆU NĂNG REALTIME (DOM LEAK PREVENTION):** 
   - Không đẩy data realtime tần số cao vào Global State (Zustand). Dùng Local State (`useState`/`useRef`) kết hợp `React.memo` cho các component biểu đồ.
   - Tránh re-render toàn trang khi nhận data WSS.

# CẤU TRÚC THƯ MỤC (FOLDER STRUCTURE)
/src
  /app
    /data-collection/page.tsx
    /device/[id]/page.tsx
    layout.tsx, page.tsx
  /components
    /features (charts, dashboard, alerts)
    /shared
    /ui (shadcn components)
  /hooks (useMqtt.ts, useDeviceData.ts)
  /lib (mqtt-client.ts, utils.ts)
  /services (api.ts)
  /store (useAlertStore.ts)
  /types (mqtt.d.ts, index.d.ts)

# THIẾT KẾ CHI TIẾT: MÀN HÌNH DATA COLLECTION (`app/data-collection/page.tsx`)

## 1. GIAO DIỆN (UI ZONES BẮT BUỘC)
Tuyệt đối tuân thủ layout 3 Zone sau, không tự ý thêm bớt:
- **Zone 1: Header (Quản lý kết nối)**
  - Dropdown/Select Box: Chọn thiết bị (Fetch danh sách thiết bị đang **Online** từ API).
  - Badge trạng thái: 🟢 Connected / 🔴 Disconnected (Của thiết bị đang được chọn).
- **Zone 2: Control Panel (Điều khiển thu thập)**
  - Dropdown/Select Box (Nhãn - Label): Gồm các option `[Đi bộ, Đứng yên, Chạy, Té ngã]`.
  - Nút bấm: `[▶ Bắt đầu ghi]` (Primary) / `[⏹ Dừng & Lưu CSV]` (Destructive - chỉ hiện khi đang ghi).
  - Text thông tin: Hiển thị "Số mẫu: X samples" và "Thời gian: mm:ss.S".
- **Zone 3: Biểu đồ Realtime (Visualization)**
  - **Card 1: Accelerometer:** Trục Y fix cứng `domain={[-8, 8]}` (g). Gồm 4 lines: X (Đỏ), Y (Xanh lá), Z (Xanh dương) nét liền; và **SVM** (Đen/Tím) nét đứt.
  - **Card 2: Gyroscope:** Trục Y fix cứng `domain={[-500, 500]}` (deg/s). Gồm 3 lines: X (Đỏ), Y (Xanh lá), Z (Xanh dương) nét liền.

## 2. XỬ LÝ DỮ LIỆU & HIỆU NĂNG (DATA FLOW)
- **Đầu vào:** Nhận batch 50 samples mỗi 0.5s từ MQTT (Tần số gốc 100Hz).
- **Luồng Monitor (Luôn chạy để quan sát):**
  - Downsample từ 100Hz xuống 10Hz (chỉ bốc 5 điểm mỗi 0.5s) để vẽ Recharts.
  - Tính SVM cho Accel: `SVM = sqrt(x^2 + y^2 + z^2)`.
  - Duy trì Sliding Window tối đa 100 điểm (10 giây). Điểm cũ tự động bị đẩy ra khỏi mảng.
- **Luồng Record (Chỉ chạy khi bấm Ghi):**
  - Lưu FULL 100Hz raw data vào Buffer State để xuất CSV.
  - Công thức tính thời gian UI: `Thời gian (giây) = Số sample trong buffer / 100`.

## 3. QUẢN LÝ BỘ NHỚ & SESSION (MEMORY MANAGEMENT)
- **Monitor & Forget:** Khi CHƯA nhấn ghi (`isRecording = false`), dữ liệu raw 100Hz nhận từ WSS phải bị loại bỏ ngay lập tức (để Garbage Collector dọn dẹp), KHÔNG lưu vào bộ nhớ dài hạn.
- **Giới hạn 5 Phút (Session Limit):** Thời gian thu thập tối đa cho 1 lần nhấn ghi là 5 phút (30,000 samples). Khi đạt mốc này, hệ thống phải **tự động Auto-stop**, khóa thu thập, hiện Toast thông báo và gọi API lưu file.