# 01. HỆ THỐNG & KIẾN TRÚC TỔNG THỂ
### Tài Liệu Hướng Dẫn Vận Hành & Kiến Trúc Nền Tảng (Core Architecture)

---

## 1. Định Vị Dự Án & Nguyên Lý Bất Biến (Core Mandate)

Hệ thống là một Web Application cá nhân hóa cho phép người dùng nhập bất kỳ URL YouTube nào để đưa vào Thư viện Audio, tự động gán Thể loại (Category), Thẻ gắn (Tags), chia nhỏ các video siêu dài (> 24 giờ) thành các tập logic (Logical Episodes 4 giờ), tìm kiếm/lọc đa tiêu chí, phát âm thanh qua YouTube IFrame Player API và tự động đồng bộ tiến trình nghe (Listening Progress) mỗi 60 giây.

> [!IMPORTANT]
> **3 NGUYÊN TẮC BẤT BIẾN DÀNH CHO BẢO TRÌ (MAINTENANCE PRINCIPLES):**
> 1. **KHÔNG PHẢI LÀ NỀN TẢNG HOSTING MP3:** Tuyệt đối không tải về, không lưu trữ vĩnh viễn tệp âm thanh MP3 từ YouTube.
> 2. **PHÂN BIỆT METADATA VÀ PHÁT NHẠC:** Database chỉ lưu Metadata, Phân loại, Tập logic, Tiến trình và Lịch sử. Tải truyền phát media được ủy thác hoàn toàn cho YouTube CDN thông qua IFrame Player API.
> 3. **LOGICAL SEGMENTATION:** Video 24h - 30h được chia thành các tập 4 giờ bằng mốc giây logic (`start_seconds`, `end_seconds`). Không tạo bất kỳ file MP3 vật lý nào trên ổ cứng.

---

## 2. Mô Hình Phân Tách Hạ Tầng (Deployment Topology)

Kiến trúc tách biệt hoàn toàn giữa giao diện tĩnh (Frontend) và máy chủ API (Backend), đảm bảo server backend 1 vCPU, 1GB RAM không bị quá tải bởi các tài nguyên tĩnh:

```
[ TRÌNH DUYỆT NGƯỜI DÙNG ]
        │
        ├──────────────────────────────────────────┐
        │ (1) Nạp HTML/CSS/JS (0% Tải Server VPS) │ (2) Gọi REST API & Đồng bộ Progress
        ▼                                          ▼
┌──────────────────────────────┐            ┌─────────────────────────────────────────┐
│ GIT-BASED STATIC HOSTING     │            │ BACKEND LINUX VPS (1 vCPU, 1GB RAM)     │
│ (Cloudflare Pages / GitHub)  │            │                                         │
│                              │            │  ┌───────────────────────────────────┐  │
│ - index.html                 │            │  │ NGINX (Reverse Proxy & Shield)    │  │
│ - assets/ (bundle JS/CSS)    │            │  │ - SSL Let's Encrypt (Port 443)    │  │
│ - Chi phí 0đ, Băng thông max │            │  │ - Rate Limiting & Bảo mật Header  │  │
└──────────────────────────────┘            │  └─────────────────┬─────────────────┘  │
                                            │                    │ (Proxy 127.0.0.1)  │
                                            │                    ▼                    │
                                            │  ┌───────────────────────────────────┐  │
                                            │  │ GOLANG BACKEND (Modular Monolith) │  │
                                            │  │ - Single Binary (<20MB) / go run  │  │
                                            │  │ - Router, GOMEMLIMIT=45MiB        │  │
                                            │  │ - Quản lý dưới systemd service    │  │
                                            │  └─────────────────┬─────────────────┘  │
                                            │                    │ (Prepared Stmts)   │
                                            │                    ▼                    │
                                            │  ┌───────────────────────────────────┐  │
                                            │  │ SQLite WAL / MySQL 8.x (InnoDB)   │  │
                                            │  │ - buffer_pool = 256M, max_conn=40 │  │
                                            │  │ - Bảng chuẩn hóa lưu Metadata     │  │
                                            │  └───────────────────────────────────┘  │
                                            └─────────────────────────────────────────┘
```

---

## 3. Bảng Phân Bổ Ngân Sách Bộ Nhớ RAM Trên VPS 1GB

| Thành phần tiến trình | Mức RAM khống chế | Tỷ lệ % | Kỹ thuật kiểm soát & cô lập |
| :--- | :---: | :---: | :--- |
| **Hệ điều hành Linux OS Core** | 120 MB | 12.0% | Loại bỏ daemon thừa (snapd, bluetooth) |
| **Database (SQLite / MySQL)** | 320 MB | 31.2% | innodb_buffer_pool_size=256M hoặc SQLite WAL in-memory cache |
| **Golang Backend API** | 50 MB | 4.9% | GOMEMLIMIT=45MiB, GOGC=80, systemd MemoryMax=150M |
| **Nginx Reverse Proxy** | 25 MB | 2.4% | worker_processes 1, worker_connections 512 |
| **OS Page Cache & Buffer** | 509 MB | 49.5% | Bộ đệm I/O của Linux kernel cực kỳ dồi dào |
| **TỔNG CỘNG HỆ THỐNG** | **1,024 MB** | **100%** | Kích hoạt 1GB Swap (vm.swappiness=10) chống OOM tuyệt đối |
