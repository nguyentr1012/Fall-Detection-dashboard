# Tài liệu Kiến trúc & Chức năng Frontend (Web Dashboard)
Tài liệu này cung cấp thông tin chi tiết về kiến trúc, luồng nghiệp vụ và công nghệ của Frontend, được chuẩn hóa để làm tài liệu đầu vào cho việc viết Báo cáo Đồ án tốt nghiệp (Chương 4 và Chương 5).

## 1. Công nghệ cốt lõi & Kiến trúc (Phục vụ viết Mục 3.6 và 4.7)
- **Framework nền tảng:** Next.js 16 (App Router) kết hợp với công cụ đóng gói Turbopack, hỗ trợ Server-Side Rendering (SSR) giúp tải trang nhanh và bảo mật API key nội bộ.
- **Quản lý dữ liệu & Trạng thái:** 
  - **TanStack (React) Query:** Đảm nhiệm việc fetch dữ liệu qua REST API, quản lý bộ nhớ đệm (caching), tự động cập nhật lại dữ liệu (refetching) khi cần thiết.
  - **Zustand:** Quản lý trạng thái cục bộ (local state) nhẹ nhàng cho các biến UI (như trạng thái Sidebar, bộ lọc tìm kiếm).
- **Trải nghiệm người dùng (UI/UX):** Sử dụng Tailwind CSS cùng thư viện component Shadcn UI mang lại giao diện hiện đại, tính đáp ứng (Responsive) tốt.
- **Real-time Engine:** Tích hợp `MQTT.js` kết nối WebSocket trực tiếp đến Broker để nhận cảnh báo theo thời gian thực (độ trễ < 1s).

## 2. Giải pháp kỹ thuật nổi bật (Phục vụ viết Chương 5)
### Đồng bộ cảnh báo lai (Hybrid Alert Sync)
- **Vấn đề:** Ứng dụng web thông thường chỉ lấy dữ liệu qua REST API (cần polling liên tục gây tốn tài nguyên), dẫn đến cảnh báo té ngã bị chậm trễ.
- **Giải pháp:** Frontend duy trì một kết nối WebSocket ẩn bằng MQTT.js. Khi thiết bị biên (ESP32) phát hiện ngã, nó đẩy gói tin lên MQTT. Ngay lập tức Frontend nhận được sự kiện và hiển thị **Banner đỏ khẩn cấp** toàn màn hình, kèm âm thanh cảnh báo. Cùng lúc đó, Frontend gọi API để invalidate cache, buộc TanStack Query tự động kéo danh sách lịch sử cảnh báo mới nhất từ Backend về để đồng bộ.

## 3. Các màn hình chức năng chính (Phục vụ viết Mục 4.8 - Kết quả thực nghiệm)
Cần chụp ảnh các màn hình này và đưa vào báo cáo:
1. **Màn hình Dashboard (Trang chủ):**
   - Lưới giám sát trạng thái thiết bị thời gian thực (Pin, Online/Offline).
   - Biểu đồ xu hướng vận động hàng tuần (số bước chân) của bệnh nhân.
2. **Màn hình Quản lý Bệnh nhân (Wearers):**
   - Quản lý hồ sơ người đeo (Tên, tuổi, mức độ rủi ro).
   - **Lưu ý:** Quản lý chặt chẽ thông số `Chiều cao (cm)` để Backend nội suy quãng đường di chuyển.
3. **Màn hình Quản lý Thiết bị (Devices):**
   - Thêm thiết bị mới bằng địa chỉ MAC.
   - Gán (Assign) thiết bị cho bệnh nhân (1 thiết bị chỉ gán được cho 1 người tại một thời điểm).
4. **Màn hình Lịch sử Cảnh báo (Alerts):**
   - Liệt kê các lần té ngã kèm độ tin cậy (Confidence).
   - Nút đánh dấu đã xử lý (Resolve) cho điều dưỡng viên.
