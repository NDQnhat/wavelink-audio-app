import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.docx_builder import (
    create_document_base, add_title, add_heading_1, add_heading_2, 
    add_heading_3, add_callout, add_code_block, add_table_data
)

def build_05():
    doc = create_document_base("05_DATABASE_AND_PROGRESS_SYNC")
    add_title(doc, "05. DATABASE DESIGN & PROGRESS SYNCHRONIZATION", "Thiết Kế Cơ Sở Dữ Liệu MySQL 8.x & Cơ Chế Sao Lưu Tiến Trình Mỗi 1 Phút")
    
    add_heading_1(doc, "1. Nguyên Lý Thiết Kế Schema Tinh Gọn (Lean Data Model)")
    doc.add_paragraph(
        "Hệ thống loại bỏ hoàn toàn các bảng phức tạp của nền tảng nghe nhạc truyền thống (không có bảng audios, mp3_files, artists, albums, genres). "
        "Dữ liệu tập trung hoàn toàn vào 4 thực thể cốt lõi: users, youtube_videos, listening_sessions, và listening_progress."
    )
    add_callout(doc,
        "ĐỘC QUYỀN TIẾN TRÌNH: Bảng listening_progress sử dụng khóa duy nhất UNIQUE KEY uk_user_video (user_id, youtube_video_id). "
        "Mỗi người dùng với một video chỉ có DUY NHẤT một bản ghi tiến trình nghe, cập nhật qua câu lệnh INSERT ... ON DUPLICATE KEY UPDATE. "
        "Không bao giờ phát sinh hàng triệu dòng log rác trong database.",
        "[FACT]"
    )

    add_heading_1(doc, "2. Mã Nguồn MySQL DDL Schema Hoàn Chỉnh")
    add_code_block(doc,
"""-- 1. Bảng tài khoản người dùng & Guest identity
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    is_guest BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Bảng cache metadata video YouTube
CREATE TABLE IF NOT EXISTS youtube_videos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    youtube_video_id VARCHAR(20) NOT NULL UNIQUE,
    youtube_url VARCHAR(500) NOT NULL,
    normalized_url VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    thumbnail_url VARCHAR(500) NULL,
    channel_id VARCHAR(100) NULL,
    channel_name VARCHAR(150) NULL,
    duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_video_id (youtube_video_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Bảng phiên nghe đang hoạt động
CREATE TABLE IF NOT EXISTS listening_sessions (
    id VARCHAR(36) PRIMARY KEY, -- UUID v4
    user_id INT UNSIGNED NOT NULL,
    youtube_video_id VARCHAR(20) NOT NULL,
    status ENUM('CREATED', 'READY', 'PLAYING', 'PAUSED', 'ENDED', 'EXPIRED') DEFAULT 'CREATED',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    INDEX idx_user_session (user_id, status),
    CONSTRAINT fk_session_video FOREIGN KEY (youtube_video_id) REFERENCES youtube_videos (youtube_video_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Bảng vị trí tiến trình nghe (Quan trọng nhất)
CREATE TABLE IF NOT EXISTS listening_progress (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    youtube_video_id VARCHAR(20) NOT NULL,
    position_seconds INT UNSIGNED NOT NULL DEFAULT 0,
    duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
    last_state ENUM('PLAYING', 'PAUSED', 'ENDED') DEFAULT 'PLAYING',
    client_updated_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_video (user_id, youtube_video_id),
    INDEX idx_progress_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"""
    )

    add_heading_1(doc, "3. Cơ Chế Sao Lưu Tiến Trình Định Kỳ 60 Giây (1-Minute Progress Backup)")
    doc.add_paragraph("Chiến lược đồng bộ tiến trình bảo vệ người dùng trước mọi sự cố mất mạng hoặc sập tab:")
    doc.add_paragraph("• Phía Client: Khởi tạo setInterval 60 giây khi player ở trạng thái PLAYING, đọc player.getCurrentTime() làm nguồn sự thật và gửi PUT /api/v1/sessions/{id}/progress.")
    doc.add_paragraph("• Sự kiện tức thời: Ngay khi người dùng nhấn Pause, Ended, hoặc chuyển tab (document.visibilityState === 'hidden'), client gửi ngay bản tin progress.")
    doc.add_paragraph("• Xử lý ngoại tuyến (Offline Resiliency): Nếu API thất bại (mất mạng), lưu last_unsynced_position vào localStorage và tự động đồng bộ lại khi mạng online.")
    doc.add_paragraph("• Giải quyết xung đột (Conflict Resolution): Server so sánh client_updated_at với bản ghi hiện tại. Chỉ ghi đè nếu thời gian client gửi là mới nhất, loại trừ trường hợp nhận request cũ gửi muộn do trễ mạng.")

    doc.save("docs/05_DATABASE_AND_PROGRESS_SYNC.docx")
    print("Saved docs/05_DATABASE_AND_PROGRESS_SYNC.docx")

def build_06():
    doc = create_document_base("06_API_SPECIFICATION")
    add_title(doc, "06. REST API SPECIFICATION", "Quy Chuẩn Giao Tiếp RESTful API v1 Cho Listening Session & Progress")
    
    add_heading_1(doc, "1. Tiêu Chuẩn Giao Tiếp & Response Envelope")
    doc.add_paragraph("• Base URL: https://api.example.com/api/v1")
    doc.add_paragraph("• Headers bắt buộc: Content-Type: application/json; charset=utf-8")
    doc.add_paragraph("• Định dạng Envelope chuẩn:")
    add_code_block(doc,
"""// Thành công (HTTP 200/201):
{
  "success": true,
  "data": { ... }
}

// Lỗi (HTTP 400/404/422/500):
{
  "success": false,
  "error": {
    "code": "INVALID_YOUTUBE_URL",
    "message": "Đường dẫn YouTube không đúng định dạng hoặc không hợp lệ"
  }
}"""
    )

    add_heading_1(doc, "2. Bảng Danh Mục Endpoints Chi Tiết")
    headers = ["Phương thức", "Endpoint", "Xác thực", "Mô tả nghiệp vụ"]
    data = [
        ["POST", "/api/v1/sessions", "Guest/User", "Nhận YouTube URL, validate, tạo listening session & trả về metadata"],
        ["GET", "/api/v1/sessions/{id}", "Public/Auth", "Lấy thông tin phiên nghe và trạng thái player"],
        ["DELETE", "/api/v1/sessions/{id}", "Owner", "Kết thúc phiên nghe, kích hoạt dọn dẹp tài nguyên tạm thời"],
        ["GET", "/api/v1/progress/{videoId}", "Guest/User", "Lấy vị trí nghe gần nhất để Resume player"],
        ["PUT", "/api/v1/sessions/{id}/progress", "Guest/User", "Cập nhật vị trí nghe (được gọi mỗi 60 giây và khi pause/hide)"],
        ["GET", "/api/v1/videos/{videoId}", "Public", "Truy vấn metadata video đã được cache trong MySQL"],
        ["POST", "/api/v1/auth/guest", "Public", "Cấp phát Guest Session Token lưu trong HttpOnly Cookie"],
        ["GET", "/health", "Public", "Kiểm tra tình trạng sống (Liveness check) của API"]
    ]
    add_table_data(doc, headers, data, [1.0, 2.3, 1.4, 2.3])

    add_heading_1(doc, "3. Chi Tiết Payload Điển Hình")
    doc.add_paragraph("Payload khởi tạo session (POST /api/v1/sessions):")
    add_code_block(doc,
"""// Request Body:
{
  "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}

// Response Body (HTTP 201 Created):
{
  "success": true,
  "data": {
    "sessionId": "e83d8a7c-4c6e-49d7-8e62-95f2a58b29cf",
    "videoId": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
    "channelName": "Rick Astley",
    "duration": 213,
    "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "lastPosition": 45, // Vị trí đã nghe trước đó nếu có
    "status": "READY"
  }
}"""
    )
    
    doc.save("docs/06_API_SPECIFICATION.docx")
    print("Saved docs/06_API_SPECIFICATION.docx")

def build_07():
    doc = create_document_base("07_SECURITY_AND_RESOURCE_MANAGEMENT")
    add_title(doc, "07. SECURITY & RESOURCE MANAGEMENT", "Bảo Mật Hệ Thống, Phòng Chống SSRF, Command Injection & OOM Killer")
    
    add_heading_1(doc, "1. Phòng Ngừa Tấn Công SSRF & URL Forgery")
    doc.add_paragraph(
        "Kẻ tấn công có thể cố tình gửi các URL nội bộ như http://127.0.0.1:8080/admin hoặc http://169.254.169.254/metadata "
        "để ép server truy cập và đánh cắp thông tin nhạy cảm."
    )
    add_callout(doc,
        "BIỆN PHÁP CHẶN ĐỨNG SSRF:\n"
        "1. Hostname Whitelist nghiêm ngặt: Chỉ chấp nhận các host: youtube.com, www.youtube.com, m.youtube.com, youtu.be.\n"
        "2. Khử trùng triệt để: Mọi URL có IP trực tiếp, localhost, hoặc port tùy ý đều bị từ chối ngay lập tức bằng mã lỗi 400 Bad Request.\n"
        "3. Regex cô lập: Chỉ trích xuất Video ID 11 ký tự [a-zA-Z0-9_-]{11}, sau đó tái cấu trúc URL an toàn chuẩn hóa.",
        "[FACT]"
    )

    add_heading_1(doc, "2. Phòng Chống Command Injection Tuyệt Đối")
    doc.add_paragraph("Không bao giờ đưa chuỗi URL của người dùng vào shell command. Sử dụng mảng đối số tách rời:")
    add_code_block(doc,
"""// TUYỆT ĐỐI KHÔNG: exec.Command("sh", "-c", "tool " + userInput) -> NGUY HIỂM CHẾT NGƯỜI
// AN TOÀN TUYỆT ĐỐI: Chỉ truyền Video ID đã qua Regex kiểm duyệt
if !validVideoIDRegex.MatchString(videoID) {
    return errors.New("Video ID bất hợp pháp")
}
cmd := exec.CommandContext(ctx, "nice", "-n", "19", "ffmpeg", "-i", validatedInputPath, ...)"""
    )

    add_heading_1(doc, "3. Cơ Chế Bảo Vệ Server Trước Tấn Công Cạn Kiệt Tài Nguyên (DoS/OOM)")
    doc.add_paragraph("• Nginx Rate Limiting: Giới hạn 5 req/phút cho tạo session mới, 30 req/phút cho cập nhật progress theo từng địa chỉ IP.")
    doc.add_paragraph("• Giới hạn thời lượng (Duration Limit): Từ chối các video có thời lượng vượt quá 3 giờ (10,800 giây) để tránh tràn bộ đệm hoặc treo worker.")
    doc.add_paragraph("• Systemd Memory Protection: Khống chế MemoryMax = 150M cho Go binary, ngăn ngừa tiến trình Go chiếm dụng RAM của MySQL.")

    doc.save("docs/07_SECURITY_AND_RESOURCE_MANAGEMENT.docx")
    print("Saved docs/07_SECURITY_AND_RESOURCE_MANAGEMENT.docx")

def build_08():
    doc = create_document_base("08_DEPLOYMENT_AND_MVP")
    add_title(doc, "08. DEPLOYMENT & MVP ROADMAP", "Quy Trình Triển Khai Hạ Tầng Native Systemd, Nginx & Lộ Trình MVP")
    
    add_heading_1(doc, "1. Kiến Trúc Triển Khai Thực Tế (Deployment Topology)")
    doc.add_paragraph("• Frontend: Phân phối toàn cầu qua Cloudflare Pages (Git-based static hosting) với chi phí 0đ, không tiêu tốn RAM hay CPU của VPS.")
    doc.add_paragraph("• Backend Server: Chạy trực tiếp Native Go binary trên Ubuntu Server 22.04 LTS quản lý bởi systemd và reverse proxy Nginx.")

    add_heading_1(doc, "2. Lộ Trình Triển Khai MVP (Implementation Roadmap)")
    headers = ["Giai đoạn (Sprint)", "Hạng mục triển khai chính", "Thời gian", "Sản phẩm bàn giao"]
    data = [
        ["Sprint 1: Schema & Core Backend", "Khởi tạo repo, DDL MySQL 4 bảng, URL parser & Session manager", "Ngày 1 - 3", "Go API tạo session & lưu metadata"],
        ["Sprint 2: Progress Sync Engine", "Xây dựng UPSERT progress API, kiểm thử ghi nhận tiến trình 60s", "Ngày 4 - 5", "API PUT progress & GET resume hoạt động"],
        ["Sprint 3: Vanilla JS Audio UI", "Xây dựng giao diện Input link, nạp YouTube Player, custom Audio Bar", "Ngày 6 - 8", "Giao diện nghe nhạc tĩnh hoạt động mượt mà"],
        ["Sprint 4: Resume & Sync Integration", "Kết nối timer 60s, sự kiện pause/hide, xử lý offline localStorage", "Ngày 9 - 10", "Khôi phục vị trí nghe hoàn hảo"],
        ["Sprint 5: Nginx & Hardening", "Cấu hình Nginx reverse proxy, Rate limiting, SSL Let's Encrypt", "Ngày 11 - 12", "Hạ tầng an toàn và tối ưu tải"],
        ["Sprint 6: Live Production Launch", "Deploy Frontend lên Cloudflare Pages, Backend lên VPS systemd", "Ngày 13 - 14", "Dự án chính thức vận hành công khai"]
    ]
    add_table_data(doc, headers, data, [1.5, 2.5, 1.2, 1.8])

    doc.save("docs/08_DEPLOYMENT_AND_MVP.docx")
    print("Saved docs/08_DEPLOYMENT_AND_MVP.docx")

if __name__ == "__main__":
    build_05()
    build_06()
    build_07()
    build_08()
