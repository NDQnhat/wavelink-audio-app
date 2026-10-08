# YouTube Audio Library - Golang Backend API

Hệ thống Backend viết bằng **Golang (Modular Monolith)** cho ứng dụng **YouTube Audio Library**, tuân thủ toàn diện và chính xác toàn bộ đặc tả kiến trúc trong các tài liệu DOCX (`01` đến `25` và `MASTER_SPECIFICATION.docx`).

---

## 1. Kiến Trúc & Cấu Trúc Module (Modular Monolith)

Hệ thống được thiết kế theo cấu trúc Clean / Modular Monolith chuẩn công nghiệp, cô lập từng domain nghiệp vụ thành các module độc lập:

```
backend/
├── cmd/
│   └── api/
│       └── main.go                 # Entrypoint: nạp config, db pool, routes & graceful shutdown
├── internal/
│   ├── config/                     # Quản lý biến môi trường (.env) và giá trị mặc định
│   │   └── config.go
│   ├── platform/                   # Hạ tầng dùng chung (Cross-cutting Concerns)
│   │   ├── database/               # Quản lý connection pool (MySQL 8.x & SQLite), auto migration, seed
│   │   │   ├── database.go
│   │   │   ├── migrate.go
│   │   │   └── seed.go
│   │   ├── logger/                 # Structured Logger (log/slog chuẩn Go 1.21+)
│   │   │   └── logger.go
│   │   ├── response/               # Envelope Response chuẩn hóa { success, data, meta, error }
│   │   │   └── response.go
│   │   └── middleware/             # CORS, Request Logger, Panic Recovery, Auth & Guest Session
│   │       ├── cors.go
│   │       ├── logger.go
│   │       ├── recovery.go
│   │       └── auth.go
│   └── modules/                    # Các Module nghiệp vụ độc lập
│       ├── auth/                   # [Module 1] Quản lý User, Guest Identity & JWT Token
│       │   ├── model.go
│       │   ├── repository.go
│       │   ├── service.go
│       │   └── handler.go
│       ├── audio/                  # [Module 2] YouTube URL Sanitizer, oEmbed Metadata, Audio Library
│       │   ├── model.go
│       │   ├── youtube.go          # Regex cô lập 11 ký tự Base64, chống SSRF, oEmbed client
│       │   ├── repository.go
│       │   ├── service.go
│       │   └── handler.go
│       ├── episode/                # [Module 3] Thuật toán chia tập logic (4 giờ / tập)
│       │   ├── model.go
│       │   ├── generator.go        # Logical segmentation (start_seconds, end_seconds)
│       │   ├── repository.go
│       │   ├── service.go
│       │   └── handler.go
│       ├── category/               # [Module 4] Quản lý Thể loại sách nói / truyện audio
│       │   ├── model.go
│       │   ├── repository.go
│       │   ├── service.go
│       │   └── handler.go
│       ├── tag/                    # [Module 5] Quản lý Thẻ tìm kiếm & phân loại
│       │   ├── model.go
│       │   ├── repository.go
│       │   ├── service.go
│       │   └── handler.go
│       ├── progress/               # [Module 6] Đồng bộ tiến trình nghe định kỳ 60s (UPSERT)
│       │   ├── model.go
│       │   ├── repository.go       # Thuật toán UPSERT (INSERT ... ON DUPLICATE KEY UPDATE)
│       │   ├── service.go
│       │   └── handler.go
│       ├── history/                # [Module 7] Lịch sử nghe (Append-only logs)
│       │   ├── model.go
│       │   ├── repository.go
│       │   ├── service.go
│       │   └── handler.go
│       ├── favorite/               # [Module 8] Quản lý danh sách audio yêu thích
│       │   ├── model.go
│       │   ├── repository.go
│       │   ├── service.go
│       │   └── handler.go
│       └── stats/                  # [Module 9] Thống kê hệ thống cho Dashboard Admin & Profile
│           ├── model.go
│           ├── service.go
│           └── handler.go
├── migrations/
│   └── 001_init.sql                # DDL Schema MySQL 8.x chuẩn hóa 8 bảng
├── .env.example
├── go.mod
└── go.sum
```

---

## 2. Các Đặc Điểm Kỹ Thuật Đạt Chuẩn Theo Văn Kiện Đặc Tả

### 2.1. Không Lưu Trữ MP3 Lậu (Tuân Thủ Chính Sách YouTube)
- 100% video YouTube được phát thông qua YouTube IFrame Player API chính thức.
- Máy chủ **hoàn toàn không tải về, không lưu trữ file MP3** trên ổ cứng, giúp tiết kiệm bộ nhớ đĩa và tuân thủ bản quyền.

### 2.2. Phân Đoạn Tập Logic Cho Video Siêu Dài (> 24 Giờ)
- Thuật toán `GenerateLogicalEpisodes()` tự động chia nhỏ video 10h - 30h thành các khối logic mặc định **4 giờ (14,400 giây)**.
- Người dùng có thể seek và theo dõi tiến độ từng tập độc lập mà không làm đứt đoạn ngữ cảnh.

### 2.3. Cơ Chế Đồng Bộ Tiến Trình 60 Giây & UPSERT Thông Minh
- Đồng bộ định kỳ mỗi 60s khi đang nghe, và lập tức khi Pause / Tua / Chuyển tab.
- Sử dụng câu lệnh **UPSERT** (`INSERT ... ON DUPLICATE KEY UPDATE` trong MySQL hoặc `ON CONFLICT DO UPDATE` trong SQLite), đảm bảo mỗi cặp `(user_id, episode_id)` chỉ có duy nhất **1 bản ghi**, không bao giờ làm phình to CSDL.

### 2.4. Khử Độc URL YouTube Chống SSRF
- Sử dụng Regex nghiêm ngặt cô lập chính xác 11 ký tự Base64:
  `^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})`
- Tự động lấy metadata từ endpoint YouTube oEmbed chính thức với cơ chế fallback dự phòng an toàn.

### 2.5. Hỗ Trợ Kép Cơ Sở Dữ Liệu: MySQL 8.x & SQLite
- **MySQL 8.x**: Dành cho môi trường Production, đã thiết lập connection pool tối ưu (`MaxOpenConns: 40`, `MaxIdleConns: 10`, `ConnMaxLifetime: 5m`) thích hợp cho VPS 1GB RAM.
- **SQLite (Pure Go)**: Dành cho chạy thử nghiệm / phát triển cục bộ ngay lập tức mà không cần cài đặt cấu hình mật khẩu DB ban đầu. Tự động chuyển đổi mượt mà!

---

## 3. Danh Mục REST API Endpoints Chi Tiết

Base URL: `http://localhost:8080/api/v1`

| Phương thức | Endpoint | Chức năng nghiệp vụ |
| :--- | :--- | :--- |
| `GET` | `/health` | Kiểm tra tình trạng hoạt động của hệ thống & CSDL |
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản người dùng mới |
| `POST` | `/api/v1/auth/login` | Đăng nhập tài khoản |
| `POST` | `/api/v1/auth/guest` | Cấp phát token cho khách nghe vãng lai |
| `GET` | `/api/v1/auth/me` | Lấy thông tin tài khoản hoặc phiên khách hiện tại |
| `POST` | `/api/v1/audios/import-youtube` | Validate URL YouTube, lấy oEmbed metadata, chia tập 4h |
| `GET` | `/api/v1/audios` | Danh sách Audio (tìm kiếm, lọc thể loại, trạng thái, thẻ) |
| `GET` | `/api/v1/audios/{id}` | Chi tiết Audio kèm danh sách tập và tiến trình |
| `PUT` | `/api/v1/audios/{id}` | Cập nhật thông tin Audio (tiêu đề, tác giả, thể loại, thẻ) |
| `DELETE` | `/api/v1/audios/{id}` | Xóa Audio khỏi thư viện |
| `POST` | `/api/v1/audios/{id}/refresh` | Làm mới lại metadata từ YouTube oEmbed |
| `GET` | `/api/v1/audios/{id}/episodes` | Danh sách các tập logic của Audio |
| `POST` | `/api/v1/audios/{id}/episodes/generate`| Tính toán và chia lại tập theo block size mới (2h, 4h, 6h...) |
| `GET` | `/api/v1/categories` | Danh sách Thể loại kèm số lượng tác phẩm |
| `POST` | `/api/v1/categories` | Thêm mới thể loại |
| `PUT` | `/api/v1/categories/{id}` | Cập nhật thể loại |
| `DELETE` | `/api/v1/categories/{id}` | Xóa thể loại |
| `GET` | `/api/v1/tags` | Danh sách Thẻ tìm kiếm |
| `POST` | `/api/v1/tags` | Thêm mới thẻ |
| `DELETE` | `/api/v1/tags/{id}` | Xóa thẻ |
| `PUT` | `/api/v1/progress` | Đồng bộ tiến trình nghe (vị trí giây, phần trăm, hoàn thành) |
| `GET` | `/api/v1/audios/{id}/progress` | Lấy vị trí nghe gần nhất của Audio |
| `GET` | `/api/v1/users/me/progress` | Lấy danh sách các bài đang nghe dở của người dùng |
| `POST` | `/api/v1/history` | Ghi nhận một phiên nghe vào lịch sử |
| `GET` | `/api/v1/history` | Lấy lịch sử nghe gần nhất |
| `POST` | `/api/v1/favorites/{audioId}` | Đánh dấu yêu thích bài nghe |
| `DELETE` | `/api/v1/favorites/{audioId}` | Hủy đánh dấu yêu thích |
| `GET` | `/api/v1/stats` | Thống kê số lượng Audio, Tập, Thể loại, Giờ nghe |

---

## 4. Hướng Dẫn Chạy & Khởi Động

### Khởi chạy Backend:
```bash
cd backend
go run ./cmd/api
```
Hoặc chạy trực tiếp file thực thi nhị phân đã biên dịch sẵn:
```bash
cd backend
./api.exe
```

Máy chủ sẽ tự động:
1. Kết nối cơ sở dữ liệu (SQLite hoặc MySQL tùy `.env`).
2. Tự động chạy Migration tạo đầy đủ bảng.
3. Tự động Seed sẵn dữ liệu mẫu thực tế (Thể loại, Thẻ, Audiobook mẫu).
4. Phục vụ luôn Frontend tĩnh tại: `http://localhost:8080/`.

Người dùng chỉ cần mở trình duyệt vào `http://localhost:8080/` để trải nghiệm toàn bộ giao diện và backend hoạt động đồng bộ với nhau!
