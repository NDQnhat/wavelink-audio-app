import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.docx_builder import (
    create_document_base, add_title, add_heading_1, add_heading_2, 
    add_heading_3, add_callout, add_code_block, add_table_data
)

def build_01_master():
    doc = create_document_base("01_HE_THONG_VA_KIEN_TRUC_TONG_THE")
    add_title(doc, "01. HỆ THỐNG & KIẾN TRÚC TỔNG THỂ", "Tài Liệu Hướng Dẫn Vận Hành & Kiến Trúc Nền Tảng (Core Architecture)")
    
    add_heading_1(doc, "1. Định Vị Dự Án & Nguyên Lý Bất Biến (Core Mandate)")
    doc.add_paragraph(
        "Hệ thống là một Web Application cá nhân hóa cho phép người dùng nhập bất kỳ URL YouTube nào để đưa vào Thư viện Audio, "
        "tự động gán Thể loại (Category), Thẻ gắn (Tags), chia nhỏ các video siêu dài (> 24 giờ) thành các tập logic (Logical Episodes 4 giờ), "
        "tìm kiếm/lọc đa tiêu chí, phát âm thanh qua YouTube IFrame Player API và tự động đồng bộ tiến trình nghe (Listening Progress) mỗi 60 giây."
    )
    add_callout(doc,
        "3 NGUYÊN TẮC BẤT BIẾN DÀNH CHO BẢO TRÌ (MAINTENANCE PRINCIPLES):\n"
        "1. KHÔNG PHẢI LÀ NỀN TẢNG HOSTING MP3: Tuyệt đối không tải về, không lưu trữ vĩnh viễn tệp âm thanh MP3 từ YouTube.\n"
        "2. PHÂN BIỆT METADATA VÀ PHÁT NHẠC: Database MySQL chỉ lưu Metadata, Phân loại, Tập logic, Tiến trình và Lịch sử. Tải truyền phát media được ủy thác hoàn toàn cho YouTube CDN thông qua IFrame Player API.\n"
        "3. LOGICAL SEGMENTATION: Video 24h - 30h được chia thành các tập 4 giờ bằng mốc giây logic (start_seconds, end_seconds). Không tạo bất kỳ file MP3 vật lý nào trên ổ cứng.",
        "[FACT]"
    )

    add_heading_1(doc, "2. Mô Hình Phân Tách Hạ Tầng (Deployment Topology)")
    doc.add_paragraph(
        "Kiến trúc tách biệt hoàn toàn giữa giao diện tĩnh (Frontend) và máy chủ API (Backend), "
        "đảm bảo server backend 1 vCPU, 1GB RAM không bị quá tải bởi các tài nguyên tĩnh."
    )
    add_code_block(doc,
"""[ TRÌNH DUYỆT NGƯỜI DÙNG ]
        │
        ├──────────────────────────────────────────┐
        │ (1) Nạp HTML/CSS/JS (0% Tải Server VPS) │ (2) Gọi REST API & Đồng bộ Progress
        ▼                                          ▼
┌──────────────────────────────┐            ┌─────────────────────────────────────────┐
│ GIT-BASED STATIC HOSTING     │            │ BACKEND LINUX VPS (1 vCPU, 1GB RAM)     │
│ (Cloudflare Pages / GitHub)  │            │                                         │
│                              │            │  ┌───────────────────────────────────┐  │
│ - index.html                 │            │  │ NGINX (Reverse Proxy & Shield)    │  │
│ - css/style.css              │            │  │ - SSL Let's Encrypt (Port 443)    │  │
│ - js/app.js, player.js       │            │  │ - Rate Limiting & Bảo mật Header  │  │
│ - Chi phí 0đ, Băng thông vô hạn           │  └─────────────────┬─────────────────┘  │
└──────────────────────────────┘            │                    │ (Proxy 127.0.0.1)  │
                                            │                    ▼                    │
                                            │  ┌───────────────────────────────────┐  │
                                            │  │ GOLANG BACKEND (Modular Monolith) │  │
                                            │  │ - Single Binary duy nhất (<20MB)  │  │
                                            │  │ - Chi Router, GOMEMLIMIT=45MiB    │  │
                                            │  │ - Quản lý dưới systemd service    │  │
                                            │  └─────────────────┬─────────────────┘  │
                                            │                    │ (Prepared Stmts)   │
                                            │                    ▼                    │
                                            │  ┌───────────────────────────────────┐  │
                                            │  │ MySQL 8.x DATABASE (InnoDB)       │  │
                                            │  │ - buffer_pool = 256M, max_conn=40 │  │
                                            │  │ - 8 Bảng chuẩn hóa lưu Metadata   │  │
                                            │  └───────────────────────────────────┘  │
                                            └─────────────────────────────────────────┘"""
    )

    add_heading_1(doc, "3. Bảng Phân Bổ Ngân Sách Bộ Nhớ RAM Trên VPS 1GB")
    headers = ["Thành phần tiến trình", "Mức RAM khống chế", "Tỷ lệ %", "Kỹ thuật kiểm soát & cô lập"]
    data = [
        ["Hệ điều hành Linux OS Core", "120 MB", "12.0%", "Loại bỏ daemon thừa (snapd, bluetooth)"],
        ["MySQL 8.x Database", "320 MB", "31.2%", "innodb_buffer_pool_size=256M, max_connections=40"],
        ["Golang Backend API", "50 MB", "4.9%", "GOMEMLIMIT=45MiB, GOGC=80, systemd MemoryMax=150M"],
        ["Nginx Reverse Proxy", "25 MB", "2.4%", "worker_processes 1, worker_connections 512"],
        ["OS Page Cache & Buffer", "509 MB", "49.5%", "Bộ đệm I/O của Linux kernel cực kỳ dồi dào"],
        ["TỔNG CỘNG HỆ THỐNG", "1,024 MB", "100%", "Kích hoạt 1GB Swap (vm.swappiness=10) chống OOM tuyệt đối"]
    ]
    add_table_data(doc, headers, data, [1.8, 1.4, 1.0, 2.8])

    doc.save("docs/01_HE_THONG_VA_KIEN_TRUC_TONG_THE.docx")
    print("Saved docs/01_HE_THONG_VA_KIEN_TRUC_TONG_THE.docx")

def build_02_database():
    doc = create_document_base("02_CSDL_MYSQL_VA_DONG_BO_TIEN_TRINH")
    add_title(doc, "02. CƠ SỞ DỮ LIỆU & ĐỒNG BỘ TIẾN TRÌNH", "Thiết Kế Schema MySQL 8.x, Logical Episodes & Thuật Toán Progress 60s")
    
    add_heading_1(doc, "1. Sơ Đồ Thực Thể Quan Hệ (Entity Relationship Model)")
    doc.add_paragraph(
        "Hệ thống chuẩn hóa trên 8 bảng thực thể tinh gọn (3NF). "
        "Mối quan hệ giữa Audio và Tags là Many-to-Many qua audio_tags. "
        "Mối quan hệ giữa Audio và Episodes là One-to-Many với ràng buộc duy nhất (audio_id, episode_number)."
    )

    add_heading_1(doc, "2. Mã Nguồn DDL MySQL 8.x Đầy Đủ")
    add_code_block(doc,
"""-- 1. Bảng Người dùng & Guest identity
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    is_guest BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Bảng Thể loại (Categories: Tiên hiệp, Huyền huyễn, Podcast...)
CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Bảng Thẻ (Tags: Tu tiên, Truyện dài...)
CREATE TABLE IF NOT EXISTS tags (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Bảng Audio chính (YouTube Videos Metadata)
CREATE TABLE IF NOT EXISTS youtube_videos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    youtube_video_id VARCHAR(20) NOT NULL UNIQUE,
    youtube_url VARCHAR(500) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    author_name VARCHAR(150) NULL,
    channel_id VARCHAR(100) NULL,
    thumbnail_url VARCHAR(500) NULL,
    duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
    category_id INT UNSIGNED NULL,
    published_at TIMESTAMP NULL,
    status ENUM('ACTIVE', 'HIDDEN', 'DELETED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FULLTEXT INDEX idx_ft_title_author (title, author_name),
    INDEX idx_category (category_id),
    CONSTRAINT fk_videos_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Bảng liên kết Many-to-Many: audio_tags
CREATE TABLE IF NOT EXISTS audio_tags (
    audio_id INT UNSIGNED NOT NULL,
    tag_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (audio_id, tag_id),
    INDEX idx_tag (tag_id),
    CONSTRAINT fk_at_audio FOREIGN KEY (audio_id) REFERENCES youtube_videos (id) ON DELETE CASCADE,
    CONSTRAINT fk_at_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Bảng Phân đoạn tập (Logical Episodes)
CREATE TABLE IF NOT EXISTS episodes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    audio_id INT UNSIGNED NOT NULL,
    episode_number INT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    start_seconds INT UNSIGNED NOT NULL DEFAULT 0,
    end_seconds INT UNSIGNED NOT NULL,
    duration_seconds INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_audio_episode (audio_id, episode_number),
    CONSTRAINT fk_episodes_audio FOREIGN KEY (audio_id) REFERENCES youtube_videos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Bảng Tiến trình nghe (Listening Progress - UPSERT độc quyền)
CREATE TABLE IF NOT EXISTS listening_progress (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    audio_id INT UNSIGNED NOT NULL,
    episode_id INT UNSIGNED NOT NULL,
    position_seconds INT UNSIGNED NOT NULL DEFAULT 0,
    duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
    progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_episode (user_id, episode_id),
    INDEX idx_user_audio (user_id, audio_id),
    CONSTRAINT fk_lp_audio FOREIGN KEY (audio_id) REFERENCES youtube_videos (id) ON DELETE CASCADE,
    CONSTRAINT fk_lp_episode FOREIGN KEY (episode_id) REFERENCES episodes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Bảng Lịch sử nghe (Listening History - Append-only log)
CREATE TABLE IF NOT EXISTS listening_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    audio_id INT UNSIGNED NOT NULL,
    episode_id INT UNSIGNED NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    duration_listened INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_history (user_id, created_at),
    CONSTRAINT fk_lh_audio FOREIGN KEY (audio_id) REFERENCES youtube_videos (id) ON DELETE CASCADE,
    CONSTRAINT fk_lh_episode FOREIGN KEY (episode_id) REFERENCES episodes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"""
    )

    add_heading_1(doc, "3. Cơ Chế Đồng Bộ Tiến Trình 60 Giây & Resume Thông Minh")
    doc.add_paragraph("• Chu kỳ 60 giây: Khi trạng thái là PLAYING, JavaScript Client kích hoạt timer mỗi 60 giây gửi PUT /api/v1/progress.")
    doc.add_paragraph("• Sự kiện tức thời: Ngay khi người dùng nhấn PAUSE, kết thúc bài (ENDED), tua nhạc (SEEK) hoặc chuyển tab (visibilitychange), client gửi ngay tiến trình.")
    doc.add_paragraph("• Thuật toán UPSERT trong MySQL: Đảm bảo mỗi cặp (user_id, episode_id) chỉ có DUY NHẤT 1 bản ghi, không bao giờ làm phình to database.")
    doc.add_paragraph("• Khôi phục ngoại tuyến: Nếu mạng mất, ghi tạm vị trí vào localStorage và tự động đồng bộ bù khi sự kiện window.online kích hoạt.")

    doc.save("docs/02_CSDL_MYSQL_VA_DONG_BO_TIEN_TRINH.docx")
    print("Saved docs/02_CSDL_MYSQL_VA_DONG_BO_TIEN_TRINH.docx")

def build_03_api():
    doc = create_document_base("03_DAC_TA_REST_API_VA_XU_LY_YOUTUBE")
    add_title(doc, "03. ĐẶC TẢ REST API & TÍCH HỢP YOUTUBE", "Chi Tiết 13 REST Endpoints, Khử Độc URL & Cơ Chế IFrame Player API")
    
    add_heading_1(doc, "1. Quy Chuẩn Giao Tiếp & Envelope Chuẩn Hóa")
    doc.add_paragraph("• Base URL: https://api.example.com/api/v1")
    doc.add_paragraph("• Headers bắt buộc: Content-Type: application/json; charset=utf-8")
    doc.add_paragraph("• Envelope chuẩn hóa:")
    add_code_block(doc,
"""// Phản hồi thành công:
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "pageSize": 20, "total": 45 } // Nếu có phân trang
}

// Phản hồi thất bại:
{
  "success": false,
  "error": {
    "code": "DUPLICATE_VIDEO",
    "message": "Video này đã tồn tại trong thư viện",
    "details": { "existingAudioId": 12 }
  }
}"""
    )

    add_heading_1(doc, "2. Bảng Danh Mục 13 Endpoints Cốt Lõi Cần Maintain")
    headers = ["Method", "Endpoint Path", "Xác thực", "Mô tả chức năng nghiệp vụ"]
    data = [
        ["POST", "/api/v1/audios/import-youtube", "User/Admin", "Validate link YouTube, kiểm tra trùng lặp, lưu metadata & sinh Episode"],
        ["GET", "/api/v1/audios", "Public", "Danh sách Audio Library (Phân trang 20/trang, Lọc Category/Author/Tag)"],
        ["GET", "/api/v1/audios/{id}", "Public", "Chi tiết Audio (Metadata, Category, Tags, Tổng thời lượng)"],
        ["PUT", "/api/v1/audios/{id}", "Owner/Admin", "Cập nhật Category, Tags hoặc mô tả của Audio"],
        ["POST", "/api/v1/audios/{id}/refresh", "Owner/Admin", "Đồng bộ lại Metadata mới nhất từ YouTube oEmbed"],
        ["GET", "/api/v1/audios/{id}/episodes", "Public", "Danh sách các Episode logic (kèm mốc start_seconds, end_seconds)"],
        ["POST", "/api/v1/audios/{id}/episodes/generate", "Owner/Admin", "Tạo lại danh sách Episode theo block size mới (ví dụ 2h, 4h, 6h)"],
        ["GET", "/api/v1/categories", "Public", "Danh sách toàn bộ Category nội bộ (Cache in-memory)"],
        ["GET", "/api/v1/tags", "Public", "Danh sách các Tags phổ biến trong thư viện"],
        ["GET", "/api/v1/users/me/progress", "Auth/Guest", "Lấy toàn bộ danh sách audio đang nghe dở của người dùng"],
        ["GET", "/api/v1/audios/{id}/progress", "Auth/Guest", "Lấy vị trí nghe gần nhất của Audio/Episode để Resume"],
        ["PUT", "/api/v1/progress", "Auth/Guest", "Cập nhật vị trí nghe (định kỳ 60s, khi pause/seek/hide)"],
        ["POST", "/api/v1/history", "Auth/Guest", "Ghi nhận một lượt nghe hoàn thành vào bảng listening_history"]
    ]
    add_table_data(doc, headers, data, [1.0, 2.4, 1.3, 2.3])

    add_heading_1(doc, "3. Khử Độc URL YouTube & Chống SSRF Bằng Regex")
    add_code_block(doc,
"""// Regex cô lập chính xác 11 ký tự Base64 của YouTube Video ID
var ytRegex = regexp.MustCompile(`^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&].*)?$`)

func ParseYouTubeURL(rawURL string) (string, error) {
    cleanURL := strings.TrimSpace(rawURL)
    if len(cleanURL) > 500 {
        return "", errors.New("URL vượt quá độ dài tối đa")
    }
    matches := ytRegex.FindStringSubmatch(cleanURL)
    if len(matches) < 2 {
        return "", errors.New("URL không hợp lệ hoặc không thuộc hệ thống YouTube")
    }
    return matches[1], nil // Trả về Video ID an toàn tuyệt đối
}"""
    )

    doc.save("docs/03_DAC_TA_REST_API_VA_XU_LY_YOUTUBE.docx")
    print("Saved docs/03_DAC_TA_REST_API_VA_XU_LY_YOUTUBE.docx")

def build_04_ops():
    doc = create_document_base("04_TRIEN_KHAI_BAO_MAT_VA_VAN_HANH")
    add_title(doc, "04. TRIỂN KHAI, BẢO MẬT & VẬN HÀNH", "Hướng Dẫn Cấu Hình Nginx, Systemd, Backup R2 & Lộ Trình Triển Khai MVP")
    
    add_heading_1(doc, "1. File Cấu Hình Nginx Hoàn Chỉnh Chuẩn Production")
    add_code_block(doc,
"""# /etc/nginx/conf.d/audio_library.conf

limit_req_zone $binary_remote_addr zone=api_general:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=import_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=progress_limit:10m rate=60r/m;

server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Bảo mật Headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate Limit cho Import endpoint
    location /api/v1/audios/import-youtube {
        limit_req zone=import_limit burst=3 nodelay;
        proxy_pass http://127.0.0.1:8080;
        include proxy_params;
    }

    # Proxy mặc định sang Go Backend API
    location / {
        limit_req zone=api_general burst=50 nodelay;
        proxy_pass http://127.0.0.1:8080;
        include proxy_params;
    }
}"""
    )

    add_heading_1(doc, "2. Cấu Hình Systemd Service Quản Lý Go Backend")
    add_code_block(doc,
"""# /etc/systemd/system/audio-backend.service
[Unit]
Description=YouTube Audio Library - Go Backend API
After=network.target mysql.service

[Service]
Type=simple
User=audioweb
Group=audioweb
WorkingDirectory=/var/www/audio-backend
ExecStart=/var/www/audio-backend/bin/server
Restart=always
RestartSec=5s

# Khống chế tài nguyên bảo vệ VPS 1GB RAM
MemoryMax=150M
TasksMax=100
LimitNOFILE=65535

EnvironmentFile=/var/www/audio-backend/.env
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target"""
    )

    add_heading_1(doc, "3. Kịch Bản Tự Động Sao Lưu MySQL Hàng Ngày Ra Cloudflare R2")
    add_code_block(doc,
"""#!/usr/bin/env bash
# /usr/local/bin/backup_library.sh
set -euo pipefail

BACKUP_DIR="/var/backups/audio_library"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# 1. Dump MySQL Database và nén gzip
mysqldump --single-transaction --quick -u root audio_library_db | gzip -9 > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# 2. Đẩy bản sao lưu ngoại vi lên Cloudflare R2 qua rclone
rclone copy "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" remote_r2:audio-backup-bucket/daily_db/

# 3. Giữ lại bản sao lưu cục bộ tối đa 7 ngày
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete"""
    )

    doc.save("docs/04_TRIEN_KHAI_BAO_MAT_VA_VAN_HANH.docx")
    print("Saved docs/04_TRIEN_KHAI_BAO_MAT_VA_VAN_HANH.docx")

if __name__ == "__main__":
    build_01_master()
    build_02_database()
    build_03_api()
    build_04_ops()
