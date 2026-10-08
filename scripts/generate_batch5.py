import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.docx_builder import (
    create_document_base, add_title, add_heading_1, add_heading_2, 
    add_heading_3, add_callout, add_code_block, add_table_data
)

def build_21():
    doc = create_document_base("21_Testing_Strategy")
    add_title(doc, "21. TESTING & QUALITY ASSURANCE STRATEGY", "Chiến Lược Kiểm Thử Phần Mềm, Tải Băng Thông & Tự Động Hóa")
    
    add_heading_1(doc, "1. Kim Tự Tháp Kiểm Thử (Testing Pyramid)")
    doc.add_paragraph("• Unit Tests (Backend Go): Kiểm thử các business logic độc lập trong tầng Service, tính toán hash mật khẩu, phân tích JWT và sanitize dữ liệu đầu vào. Mục tiêu độ phủ > 75%.")
    doc.add_paragraph("• Integration Tests (Database & Handler): Kiểm thử giao dịch MySQL qua mock hoặc test database SQLite/MySQL test container, xác minh đúng đắn của các câu lệnh JOIN, transaction rollbacks.")
    doc.add_paragraph("• Media Processing Test: Kiểm thử chức năng FFmpeg với các tệp âm thanh mẫu (WAV, FLAC, corrupt MP3) để đảm bảo không xảy ra treo luồng vô hạn.")
    doc.add_paragraph("• End-to-End & Load Testing: Sử dụng công cụ nhẹ như k6 / wrk để giả lập 50 - 200 kết nối đồng thời nghe nhạc và gọi API.")

    add_heading_1(doc, "2. Kịch Bản Kiểm Thử Tải (Load Testing Benchmark)")
    headers = ["Kịch bản test", "Công cụ thực thi", "Ngưỡng chấp nhận (Pass Criteria)", "Chỉ số thất bại (Fail Criteria)"]
    data = [
        ["Stress Test API Endpoint /audios", "k6 (100 VUs / 5 phút)", "p95 latency < 50ms, 0% lỗi 5xx", "Latency > 200ms hoặc xuất hiện HTTP 500/502"],
        ["Stream Partial Content HTTP 206", "curl Range request", "Đúng mã 206, Content-Range byte chính xác", "Trả về mã 200 nguyên khối (Full download)"],
        ["OOM Test FFmpeg Concurrency", "2 file upload đồng thời", "Job 2 xếp hàng QUEUED, RAM không tăng đột biến", "2 tiến trình FFmpeg chạy cùng lúc, RAM vọt > 500MB"]
    ]
    add_table_data(doc, headers, data, [1.8, 1.4, 2.0, 2.0])

    doc.save("docs/21_Testing_Strategy.docx")
    print("Saved docs/21_Testing_Strategy.docx")

def build_22():
    doc = create_document_base("22_MVP_Roadmap")
    add_title(doc, "22. MVP ROADMAP & IMPLEMENTATION PHASES", "Lộ Trình Triển Khai Chi Tiết Từ Khởi Tạo Đến Vận Hành Thực Tế")
    
    add_heading_1(doc, "1. Thứ Tự Triển Khai 14 Giai Đoạn Bắt Buộc")
    headers = ["Giai đoạn (Phase)", "Nội dung triển khai chính", "Thời gian dự kiến", "Sản phẩm bàn giao (Deliverables)"]
    data = [
        ["Phase 1: Project Foundation", "Khởi tạo Git repo, cấu hình Go module, linter, cấu trúc thư mục", "Ngày 1 - 2", "Skeleton codebase, Makefile, .gitignore"],
        ["Phase 2: Database Migration", "Viết mã DDL MySQL, migrate 16 bảng thực thể và chỉ mục", "Ngày 3 - 4", "Script migrations/001_init.sql hoàn chỉnh"],
        ["Phase 3: Go Backend Core", "Cấu hình DB pool, base handler, response envelope, Chi router", "Ngày 5 - 6", "HTTP server hoạt động với health check"],
        ["Phase 4: Authentication", "Đăng ký, Đăng nhập Bcrypt, HttpOnly JWT Cookie, Middleware RBAC", "Ngày 7 - 8", "API Auth và phân quyền hoàn chỉnh"],
        ["Phase 5: Audio Catalog", "CRUD Audio, Artist, Album, Genre, FULLTEXT Search", "Ngày 9 - 11", "API Catalog và tìm kiếm"],
        ["Phase 6: Audio Streaming", "Tích hợp HTTP 206 Range headers và X-Accel-Redirect", "Ngày 12 - 13", "Stream nhạc mượt mà trên browser"],
        ["Phase 7: Vanilla JS Frontend", "Xây dựng Shell UI, CSS Grid, Audio Player Bar, Play/Pause/Seek", "Ngày 14 - 17", "Giao diện nghe nhạc tĩnh hoạt động"],
        ["Phase 8: Playlists & Favorites", "Giao diện và API quản lý Playlist cá nhân, History, Favorite", "Ngày 18 - 20", "Trải nghiệm cá nhân hóa đầy đủ"],
        ["Phase 9: Admin Management", "Trang quản trị tải lên nhạc, quản lý danh mục và duyệt nội dung", "Ngày 21 - 23", "Admin portal tĩnh kết nối API admin"],
        ["Phase 10: Media Processing", "Tích hợp FFprobe, FFmpeg background job worker (1 worker)", "Ngày 24 - 26", "Tự động trích xuất tag và convert MP3"],
        ["Phase 11: Security Hardening", "Cấu hình Nginx reverse proxy, Rate limiting, CORS, Header security", "Ngày 27 - 28", "Hệ thống bảo vệ toàn diện"],
        ["Phase 12: Deployment", "Deploy Frontend lên Cloudflare Pages, Backend lên Linux VPS systemd", "Ngày 29 - 30", "Production live trên tên miền chính"],
        ["Phase 13: Backup Automation", "Thiết lập Crontab backup MySQL và rclone đồng bộ R2", "Ngày 31", "Hệ thống tự động sao lưu định kỳ"],
        ["Phase 14: Performance Testing", "Kiểm thử tải k6, tinh chỉnh my.cnf buffer pool và Nginx", "Ngày 32", "Báo cáo tải nghiệm thu hệ thống"]
    ]
    add_table_data(doc, headers, data, [1.5, 2.4, 1.2, 2.1])

    doc.save("docs/22_MVP_Roadmap.docx")
    print("Saved docs/22_MVP_Roadmap.docx")

def build_23():
    doc = create_document_base("23_Data_Model_and_ERD")
    add_title(doc, "23. DATA MODEL & DETAILED ERD SPECIFICATION", "Chi Tiết Mô Hình Dữ Liệu Thực Thể & Định Nghĩa Schema SQL")
    
    add_heading_1(doc, "1. Danh Sách 16 Bảng Thực Thể Chuẩn Hóa")
    doc.add_paragraph("Hệ thống loại bỏ hoàn toàn các bảng dư thừa, chuẩn hóa về 16 bảng cốt lõi:")
    doc.add_paragraph("1. users, 2. roles, 3. permissions, 4. user_roles, 5. role_permissions")
    doc.add_paragraph("6. audios, 7. artists, 8. albums, 9. genres, 10. tags, 11. audio_tags")
    doc.add_paragraph("12. playlists, 13. playlist_items, 14. favorites, 15. listening_history")
    doc.add_paragraph("16. processing_jobs, 17. audit_logs")

    add_heading_1(doc, "2. Schema SQL MySQL 8.x DDL Chuẩn")
    add_code_block(doc,
"""CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255) NULL,
    status ENUM('ACTIVE', 'SUSPENDED', 'PENDING') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS audios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    artist_id INT UNSIGNED NULL,
    album_id INT UNSIGNED NULL,
    genre_id INT UNSIGNED NULL,
    duration INT UNSIGNED NOT NULL DEFAULT 0, -- Thời lượng tính theo giây
    file_path VARCHAR(255) NOT NULL,         -- /data/audio/processed/{uuid}.mp3
    cover_path VARCHAR(255) NULL,            -- /data/audio/covers/{uuid}.jpg
    file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
    bitrate INT UNSIGNED NOT NULL DEFAULT 192000,
    status ENUM('DRAFT', 'PROCESSING', 'PUBLISHED', 'UNPUBLISHED') DEFAULT 'DRAFT',
    play_count BIGINT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FULLTEXT INDEX idx_ft_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS processing_jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    audio_id INT UNSIGNED NOT NULL,
    input_file_path VARCHAR(255) NOT NULL,
    status ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED') DEFAULT 'QUEUED',
    error_message TEXT NULL,
    attempt_count TINYINT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_job_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"""
    )

    doc.save("docs/23_Data_Model_and_ERD.docx")
    print("Saved docs/23_Data_Model_and_ERD.docx")

def build_24():
    doc = create_document_base("24_User_Flows")
    add_title(doc, "24. USER FLOWS & SYSTEM STATE TRANSITIONS", "Đặc Tả Quy Trình Người Dùng & Trạng Thái Thực Thể")
    
    add_heading_1(doc, "1. Sơ Đồ Chuyển Đổi Trạng Thái Âm Thanh (Audio State Machine)")
    add_code_block(doc,
"""[ Tải lên File ]
       │
       ▼
   [ DRAFT ] ──(Đưa vào hàng đợi)──► [ PROCESSING ] ──(Lỗi FFmpeg)──► [ FAILED ]
                                            │                              │
                                     (Chuyển mã xong)                 (Thử lại)
                                            │                              │
                                            ▼                              ▼
                                     [ PUBLISHED ] ◄───────────────────────┘
                                       │        ▲
                           (Bản quyền/ │        │ (Khôi phục)
                             Ẩn nội dung)       │
                                       ▼        │
                                    [ UNPUBLISHED ]"""
    )

    add_heading_1(doc, "2. Quy Trình Người Nghe Tương Tác (Listener User Journey)")
    doc.add_paragraph("1. Khám phá: Mở web tĩnh -> Tải danh sách bài hát hot từ API -> Chọn thể loại / gõ từ khóa tìm kiếm.")
    doc.add_paragraph("2. Trải nghiệm phát nhạc: Bấm nút Play trên một track -> Thẻ audio nạp stream URL -> Nginx truyền stream bytes 206 -> Hiển thị thanh sóng âm thanh và thời gian.")
    doc.add_paragraph("3. Cá nhân hóa: Người dùng nhấn nút Tim (Favorite) -> Kiểm tra đăng nhập (nếu chưa hiện Modal Login) -> Gửi POST /api/v1/favorites/{id} -> Nút Tim sáng đỏ tức thì.")

    doc.save("docs/24_User_Flows.docx")
    print("Saved docs/24_User_Flows.docx")

def build_25():
    doc = create_document_base("25_Technical_Decision_Record")
    add_title(doc, "25. TECHNICAL DECISION RECORD (TDR)", "Biên Bản Quyết Định Kỹ Thuật (Architecture Decision Records)")
    
    add_heading_1(doc, "1. Quyết Định Kỹ Thuật 1: Cơ Sở Dữ Liệu (MySQL vs PostgreSQL)")
    doc.add_paragraph("• Vấn đề: Lựa chọn cơ sở dữ liệu quan hệ cho máy chủ 1GB RAM.")
    doc.add_paragraph("• Quyết định: Bắt buộc chọn MySQL 8.x InnoDB.")
    doc.add_paragraph("• Lý do kỹ thuật: MySQL 8.x InnoDB cho phép tinh chỉnh footprint bộ nhớ RAM xuống mức rất thấp (~200MB - 300MB) rất ổn định, truy vấn index cơ bản cực nhẹ, hỗ trợ utf8mb4 hoàn hảo, và là ràng buộc công nghệ bắt buộc từ thiết kế ban đầu.")

    add_heading_1(doc, "2. Quyết Định Kỹ Thuật 2: Nơi Lưu Trữ Audio (Local Disk vs Cloudflare R2)")
    doc.add_paragraph("• Vấn đề: Lưu tệp MP3 ở đâu với chi phí thấp và server yếu?")
    doc.add_paragraph("• Quyết định: Giai đoạn MVP lưu trữ tại Local NVMe Disk (/data/audio/) và sao lưu đồng bộ ra Cloudflare R2.")
    doc.add_paragraph("• Lý do kỹ thuật: Local disk cho tốc độ I/O nhanh nhất, không tốn băng thông internet gọi S3 API, kết hợp Nginx sendfile zero-copy đem lại hiệu năng phát nhạc tối đa trên VPS nhỏ. Khi vượt ngưỡng dung lượng đĩa, chỉ cần chuyển đường dẫn sang R2 mà không sửa đổi logic ứng dụng.")

    add_heading_1(doc, "3. Quyết Định Kỹ Thuật 3: Hàng Đợi Xử Lý Job (MySQL Job Table vs Redis/RabbitMQ)")
    doc.add_paragraph("• Vấn đề: Cần hàng đợi điều phối FFmpeg mà không tiêu tốn RAM.")
    doc.add_paragraph("• Quyết định: Sử dụng bảng MySQL `processing_jobs` kết hợp Worker Go đơn luồng polling.")
    doc.add_paragraph("• Lý do kỹ thuật: Loại bỏ hoàn toàn sự cần thiết của Redis (tiết kiệm 50MB RAM) hoặc RabbitMQ (tiết kiệm 200MB RAM Erlang VM). Với tần suất upload vài chục file/ngày của một hệ thống MVP, bảng MySQL đáp ứng hoàn toàn tin cậy và không bao giờ mất job khi server khởi động lại.")

    doc.save("docs/25_Technical_Decision_Record.docx")
    print("Saved docs/25_Technical_Decision_Record.docx")

if __name__ == "__main__":
    build_21()
    build_22()
    build_23()
    build_24()
    build_25()
