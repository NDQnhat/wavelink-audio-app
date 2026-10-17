# THƯ MỤC TÍNH NĂNG: TRIỂN KHAI FRONTEND LÊN HOSTING ZHOST
### WaveLink Audio App - DirectAdmin / LiteSpeed + Render Backend API + GitHub CI/CD

Thư mục này chứa toàn bộ kế hoạch kỹ thuật, đặc tả kiến trúc, và hướng dẫn vận hành chi tiết cho việc đưa Frontend React Vite của ứng dụng WaveLink lên dịch vụ hosting cá nhân (zHost), kết nối với Backend Golang Gin đang chạy trên Render Cloud.

---

## 📂 Danh Mục Tài Liệu Kế Hoạch

| Tệp Tin | Nội Dung Trọng Tâm |
| :--- | :--- |
| **[01_TONG_QUAN_VA_KIEN_TRUC_GIAI_PHAP.md](./01_TONG_QUAN_VA_KIEN_TRUC_GIAI_PHAP.md)** | • Phân tích hiện trạng hạ tầng zHost (DirectAdmin port 2222, IP [HIDDEN_IP]).<br/>• Bản chất của việc "pull packages từ GitHub Action" trên Shared Hosting.<br/>• 3 phương án thực hiện (CI/CD Push, Trích xuất Docker Package GHCR, Pull script).<br/>• Kiến trúc tổng thể và cam kết bảo toàn dự án. |
| **[02_KE_HOACH_THUC_HIEN_TUNG_BUOC.md](./02_KE_HOACH_THUC_HIEN_TUNG_BUOC.md)** | • Lộ trình 5 giai đoạn thực hiện (Sao lưu -> Frontend -> Backend/CORS -> CI/CD -> E2E Test).<br/>• Checklist chi tiết từng đầu việc.<br/>• Ma trận rủi ro và giải pháp xử lý triệt để (404 Refresh, CORS, Xung đột WordPress). |
| **[03_CAU_HINH_MAU_HTACCESS_VA_CICD.md](./03_CAU_HINH_MAU_HTACCESS_VA_CICD.md)** | • Cấu hình mẫu `.htaccess` chuẩn LiteSpeed & React Router SPA.<br/>• Đoạn mã cập nhật cho GitHub Actions workflow (`docker-ci.yml`).<br/>• Script PowerShell kiểm tra kết nối FTP và sao lưu tự động. |

---

## ⚡ Các Điểm Cốt Lõi Cần Chú Ý Khi Triển Khai

1. **Giải quyết xung đột WordPress:**
   - Trên hosting zHost hiện đang có mã nguồn WordPress và file `.htaccess` chuyển hướng về `index.php`.
   - Cần sao lưu thư mục WordPress sang `wp_backup/` và cập nhật `.htaccess` cho React SPA để không bị kẹt ở trang đăng nhập WordPress khi vào `/student-login`.
2. **Cập nhật CORS trên Render Backend:**
   - Thêm `https://wavelink-audio-app.zhost.education` vào danh sách `ALLOWED_ORIGINS` trên Render Dashboard để trình duyệt không chặn API.
3. **Đồng bộ `.htaccess` vào `frontend/public/`:**
   - Đảm bảo file `.htaccess` nằm trong `frontend/public/` để khi chạy `npm run build`, file sẽ tự động xuất hiện trong `frontend/dist/` và được đẩy lên hosting.
4. **Bảo toàn 100% các môi trường khác:**
   - Local Dev (SQLite), Vercel CDN, Render Cloud và VPS cá nhân (Ubuntu 2-containers) hoàn toàn không bị ảnh hưởng.
