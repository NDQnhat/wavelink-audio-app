import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.docx_builder import (
    create_document_base, add_title, add_heading_1, add_heading_2, 
    add_heading_3, add_callout, add_code_block, add_table_data
)

def build_09():
    doc = create_document_base("09_PROGRESS_HISTORY_DESIGN")
    add_title(doc, "09. PROGRESS & HISTORY SYNCHRONIZATION", "Thiết Kế Đồng Bộ Tiến Trình 60 Giây & Quản Lý Lịch Sử Nghe")
    
    add_heading_1(doc, "1. Phân Biệt Tiến Trình (Progress) vs Lịch Sử (History)")
    headers = ["Thuộc tính", "Listening Progress (Tiến trình)", "Listening History (Lịch sử)"]
    data = [
        ["Mục đích", "Đang nghe tới đâu để Resume chính xác", "Đã nghe những nội dung gì, khi nào"],
        ["Số lượng bản ghi", "DUY NHẤT 1 bản ghi / (user_id, episode_id)", "Nhiều bản ghi theo thời gian thực (Append-only)"],
        ["Hành vi DB", "UPSERT (INSERT ... ON DUPLICATE KEY UPDATE)", "INSERT bản ghi mới sau khi nghe > 30s"],
        ["Dữ liệu lưu", "position_seconds, progress_percent, completed", "started_at, ended_at, duration_listened"]
    ]
    add_table_data(doc, headers, data, [1.5, 2.8, 2.7])

    add_heading_1(doc, "2. Chu Kỳ Đồng Bộ Tiến Trình 60 Giây & Resilience")
    doc.add_paragraph("Chiến lược đồng bộ hóa nhiều tầng (Multi-tier Sync Strategy):")
    doc.add_paragraph("• Định kỳ: Khi Player ở trạng thái PLAYING, Timer Client kích hoạt PUT /api/v1/progress sau mỗi 60 giây.")
    doc.add_paragraph("• Sự kiện tức thời: Kích hoạt ngay khi người dùng nhấn PAUSE, kết thúc bài (ENDED), hoặc chuyển tab (document.visibilitychange).")
    doc.add_paragraph("• Khôi phục ngoại tuyến: Nếu mất mạng, lưu position vào localStorage và tự động đồng bộ lại khi online.")

    doc.save("docs/09_PROGRESS_HISTORY_DESIGN.docx")
    print("Saved docs/09_PROGRESS_HISTORY_DESIGN.docx")

def build_10():
    doc = create_document_base("10_SECURITY_DESIGN")
    add_title(doc, "10. SECURITY & DATA INTEGRITY SPECIFICATION", "Thiết Kế An Ninh, Chống SSRF, Khử Độc URL & Bảo Vệ Tài Nguyên")
    
    add_heading_1(doc, "1. Cơ Chế Chống SSRF (Server-Side Request Forgery) Triệt Để")
    add_callout(doc,
        "QUY TẮC CHẶN ĐỨNG SSRF:\n"
        "1. Whitelist Hostname nghiêm ngặt: Chỉ chấp nhận tên miền: youtube.com, www.youtube.com, m.youtube.com, youtu.be.\n"
        "2. Cấm triệt để IP trực tiếp (ví dụ: http://127.0.0.1, http://169.254.169.254) và các port lạ.\n"
        "3. Regex cô lập Video ID 11 ký tự trước khi backend thực hiện bất kỳ lệnh gọi API bên ngoài nào.",
        "[FACT]"
    )

    add_heading_1(doc, "2. Chống Lạm Dụng Quota YouTube API")
    doc.add_paragraph("• Duplicate Check Trước Tiên: Khi user nhập URL, backend kiểm tra trước trong bảng youtube_videos qua youtube_video_id. Nếu đã tồn tại, không gọi API YouTube, tiết kiệm 100% quota.")
    doc.add_paragraph("• Ưu tiên oEmbed: Sử dụng YouTube oEmbed endpoint (https://www.youtube.com/oembed?url=...&format=json) để lấy Title và Author mà hoàn toàn KHÔNG TỐN QUOTA của YouTube Data API v3.")

    doc.save("docs/10_SECURITY_DESIGN.docx")
    print("Saved docs/10_SECURITY_DESIGN.docx")

def build_11():
    doc = create_document_base("11_DEPLOYMENT_LOW_RESOURCE_SERVER")
    add_title(doc, "11. LOW-RESOURCE SERVER DEPLOYMENT", "Triển Khai Hạ Tầng Máy Chủ Yếu (1 vCPU, 1GB RAM) Native Systemd & Nginx")
    
    add_heading_1(doc, "1. Cấu Hình Phân Bổ RAM Thực Tế VPS 1GB")
    headers = ["Thành phần", "RAM cấp phát", "Tỷ lệ %", "Cơ chế khống chế"]
    data = [
        ["Linux OS & Kernel", "120 MB", "12.0%", "Tắt dịch vụ thừa"],
        ["MySQL 8.x", "320 MB", "31.2%", "innodb_buffer_pool_size=256M, max_connections=40"],
        ["Go Backend API", "50 MB", "4.9%", "GOMEMLIMIT=45MiB, Single Binary"],
        ["Nginx Reverse Proxy", "25 MB", "2.4%", "worker_processes 1"],
        ["OS Buffer / Page Cache", "509 MB", "49.5%", "Bộ đệm I/O Linux kernel cực kỳ dồi dào"],
        ["TỔNG CỘNG", "1,024 MB", "100%", "Swap ZRAM 1GB an toàn phòng chống OOM"]
    ]
    add_table_data(doc, headers, data, [1.8, 1.4, 1.0, 2.8])

    doc.save("docs/11_DEPLOYMENT_LOW_RESOURCE_SERVER.docx")
    print("Saved docs/11_DEPLOYMENT_LOW_RESOURCE_SERVER.docx")

def build_12():
    doc = create_document_base("12_YOUTUBE_API_POLICY_RESEARCH")
    add_title(doc, "12. YOUTUBE API & POLICY COMPLIANCE RESEARCH", "Nghiên Cứu Chuyên Sâu YouTube Data API v3 & Developer Policies")
    
    add_heading_1(doc, "1. Nguồn Dữ Liệu Tra Cứu & Trích Dẫn Chính Thức")
    doc.add_paragraph("• FACT: YouTube Developer Policies Mục III.E cấm rõ ràng việc tách riêng luồng audio khỏi video (stream-ripping) để lưu trữ hoặc phân phối lại.")
    doc.add_paragraph("• FACT: YouTube Data API v3 hạn mức mặc định 10,000 units/ngày. Endpoint videos.list tiêu tốn 1 unit/request.")
    doc.add_paragraph("• RECOMMENDATION: Sử dụng YouTube IFrame Player API cho phát nhạc và oEmbed cho metadata ban đầu là giải pháp 100% hợp pháp và bền vững.")

    doc.save("docs/12_YOUTUBE_API_POLICY_RESEARCH.docx")
    print("Saved docs/12_YOUTUBE_API_POLICY_RESEARCH.docx")

def build_13():
    doc = create_document_base("13_ARCHITECTURE_DECISION_RECORD")
    add_title(doc, "13. ARCHITECTURE DECISION RECORDS (ADR)", "Biên Bản Quyết Định Kiến Trúc Cốt Lõi Từ ADR-001 Đến ADR-008")
    
    adrs = [
        ("ADR-001: YouTube Metadata Architecture", 
         "Sử dụng kết hợp oEmbed (không tốn quota) và YouTube Data API v3 có cache MySQL. Loại bỏ việc cào dữ liệu HTML (scraping)."),
        ("ADR-002: YouTube Playback vs Audio Transcoding", 
         "Chọn YouTube IFrame Player API chính thức. Không tải video, không convert MP3 từ YouTube nhằm tuân thủ 100% chính sách bản quyền và bảo vệ tài nguyên VPS 1 core."),
        ("ADR-003: Logical Episode vs Physical Audio Files", 
         "Sử dụng 100% Logical Episodes dựa trên mốc start_seconds và end_seconds trong MySQL. Không tạo các tệp MP3 vật lý dư thừa trên đĩa cứng."),
        ("ADR-004: 4-Hour Default Episode Size", 
         "Thiết lập hằng số DEFAULT_EPISODE_DURATION = 14400 giây (4 giờ) cho việc chia tập các video dài > 24h, cho phép cấu hình linh hoạt."),
        ("ADR-005: Progress Synchronization", 
         "Đồng bộ tiến trình định kỳ mỗi 60 giây khi PLAYING và ngay khi PAUSE/HIDE. Sử dụng UPSERT trong MySQL và offline backup qua localStorage."),
        ("ADR-006: Listening History Architecture", 
         "Tách biệt hoàn toàn bảng listening_progress (vị trí hiện tại) và listening_history (nhật ký đã nghe theo thời gian)."),
        ("ADR-007: Low-Resource Deployment", 
         "Triển khai Native Go binary + systemd + Nginx trên Ubuntu Linux VPS. Không sử dụng Docker daemon, Kafka, Redis hay Elasticsearch."),
        ("ADR-008: Search/Filter Architecture", 
         "Thực hiện 100% Server-side Search qua MySQL InnoDB FULLTEXT Index và phân trang LIMIT/OFFSET. Không tải toàn bộ dữ liệu về frontend.")
    ]
    for title, desc in adrs:
        add_heading_2(doc, title)
        add_callout(doc, desc, "[RECOMMENDATION]")

    doc.save("docs/13_ARCHITECTURE_DECISION_RECORD.docx")
    print("Saved docs/13_ARCHITECTURE_DECISION_RECORD.docx")

def build_14():
    doc = create_document_base("14_IMPLEMENTATION_ROADMAP")
    add_title(doc, "14. IMPLEMENTATION ROADMAP & SPRINT PLAN", "Lộ Trình Triển Khai Chi Tiết Từ Khởi Tạo Đến Hoàn Thành Thư Viện")
    
    headers = ["Sprint / Giai đoạn", "Nội dung triển khai chính", "Thời gian", "Sản phẩm bàn giao"]
    data = [
        ["Sprint 1: Database & Core Import", "Khởi tạo repo, DDL MySQL 8 bảng, YouTube URL Validator & Import API", "Ngày 1 - 3", "API Import YouTube & Cache Metadata"],
        ["Sprint 2: Episode Split Engine", "Thuật toán sinh Episode logic 4h, API lấy danh sách tập", "Ngày 4 - 5", "API Episodes & Chia tập tự động cho video 24h"],
        ["Sprint 3: Category & Tags", "CRUD Categories, Gán tags, API lọc và tìm kiếm FULLTEXT", "Ngày 6 - 8", "API Thư viện, Tìm kiếm & Lọc hoạt động"],
        ["Sprint 4: Progress & History", "Đồng bộ tiến trình 60s, Resume logic, ghi nhật ký history", "Ngày 9 - 11", "API Tiến trình & Lịch sử hoàn chỉnh"],
        ["Sprint 5: Vanilla JS Frontend", "Giao diện Library Card, Modal Import, Player Bar, Episode List", "Ngày 12 - 15", "Web tĩnh hoạt động trơn tru với API"],
        ["Sprint 6: Hardening & Launch", "Cấu hình Nginx, Rate Limiting, SSL, Deploy Cloudflare Pages & VPS", "Ngày 16 - 18", "Hệ thống chính thức vận hành trực tuyến"]
    ]
    add_table_data(doc, headers, data, [1.5, 2.5, 1.2, 1.8])

    doc.save("docs/14_IMPLEMENTATION_ROADMAP.docx")
    print("Saved docs/14_IMPLEMENTATION_ROADMAP.docx")

if __name__ == "__main__":
    build_09()
    build_10()
    build_11()
    build_12()
    build_13()
    build_14()
