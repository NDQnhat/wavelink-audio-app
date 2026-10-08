import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.docx_builder import (
    create_document_base, add_title, add_heading_1, add_heading_2, 
    add_heading_3, add_callout, add_code_block, add_table_data
)

def build_01():
    doc = create_document_base("01_SYSTEM_OVERVIEW")
    add_title(doc, "01. SYSTEM OVERVIEW & PRODUCT SCOPE", "Tổng Quan Hệ Thống Personal YouTube Audio Listening Session")
    
    add_heading_1(doc, "1. Định Vị Dự Án & Tuyên Bố Phạm Vi (Product Positioning)")
    doc.add_paragraph(
        "Hệ thống là một Web Application cá nhân hóa cho phép người dùng nhập một URL YouTube hợp lệ để tạo ra "
        "một giao diện nghe audio tinh gọn, trực quan, đồng bộ tiến trình nghe (Listening Progress) tự động mỗi 60 giây. "
    )
    add_callout(doc,
        "ĐỊNH NGHĨA CỐT LÕI: ĐÂY KHÔNG PHẢI LÀ NỀN TẢNG MUSIC STREAMING HOSTING. ĐÂY KHÔNG PHẢI LÀ DỊCH VỤ DOWNLOAD/LƯU TRỮ MP3 VĨNH VIỄN. "
        "Mô hình hoạt động là: YouTube URL -> Listening Session -> Metadata + Progress Sync -> Playback -> Cleanup. "
        "Cơ sở dữ liệu chỉ lưu trữ Metadata, Thông tin Phiên (Session) và Vị trí phát (Progress). Tuyệt đối không lưu trữ tệp MP3 lâu dài.",
        "[FACT]"
    )
    
    add_heading_1(doc, "2. Hành Trình Người Dùng Cốt Lõi (Core User Journey)")
    doc.add_paragraph("1. Khởi tạo phiên: Người dùng dán liên kết YouTube (ví dụ: https://www.youtube.com/watch?v=dQw4w9WgXcQ) vào trang chủ web tĩnh.")
    doc.add_paragraph("2. Xác thực & Nhận dạng: Go Backend xác thực URL, chuẩn hóa Video ID (11 ký tự Base64 an toàn), truy xuất metadata hợp pháp và tạo bản ghi Session.")
    doc.add_paragraph("3. Giao diện Player: Trình duyệt hiển thị Audio Player hiện đại (Title, Channel, Duration, Artwork Thumbnail, Thanh tua Seek bar).")
    doc.add_paragraph("4. Khôi phục vị trí (Resume): Tự động khôi phục vị trí nghe dở dang gần nhất từ Database.")
    doc.add_paragraph("5. Đồng bộ tiến trình (Progress Sync): Trong quá trình phát, Client tự động gửi nhịp tim đồng bộ tiến trình nghe lên Backend mỗi 60 giây và khi đổi trạng thái (Pause, Tab Hidden).")

    add_heading_1(doc, "3. Bảng Phân Tách Trách Nhiệm Hạ Tầng (Deployment Architecture)")
    headers = ["Thành phần", "Công nghệ / Môi trường", "Trách nhiệm chính", "Nguyên tắc bảo vệ tài nguyên"]
    data = [
        ["Frontend UI", "HTML5, CSS3, Vanilla JS (ES6+)", "Giao diện nghe nhạc, điều khiển Player, đếm timer 60s", "Git-based Static Hosting (Cloudflare Pages), 0% CPU server"],
        ["Reverse Proxy", "Nginx", "SSL Termination, Rate Limit, Header Security, Cache cover", "Bảo vệ Backend, xử lý kết nối đồng thời với bộ nhớ < 25MB"],
        ["Backend API", "Golang (Single Binary)", "Validate URL, Quản lý Session, UPSERT Progress, Auth", "Modular Monolith, bộ nhớ < 45MB RAM, connection pool nhỏ"],
        ["Database", "MySQL 8.x InnoDB", "Lưu trữ metadata video, sessions, progress, accounts", "innodb_buffer_pool = 256M, Index (user_id, video_id) tối ưu"],
        ["Process Manager", "systemd", "Giám sát tiến trình Go, tự khởi động lại, giới hạn RAM", "MemoryMax = 150M ngăn ngừa OOM Killer làm sập VPS"]
    ]
    add_table_data(doc, headers, data, [1.5, 1.8, 2.0, 1.9])
    
    doc.save("docs/01_SYSTEM_OVERVIEW.docx")
    print("Saved docs/01_SYSTEM_OVERVIEW.docx")

def build_02():
    doc = create_document_base("02_TECHNICAL_ARCHITECTURE")
    add_title(doc, "02. TECHNICAL ARCHITECTURE & RESOURCE CONSTRAINTS", "Kiến Trúc Kỹ Thuật & Tối Ưu Hóa Máy Chủ Tài Nguyên Yếu")
    
    add_heading_1(doc, "1. Ràng Buộc Phần Cứng Máy Chủ (Budget VPS Constraints)")
    add_callout(doc,
        "Giả định tài nguyên phần cứng thực tế: 1 vCPU, 1024MB RAM vật lý, 25GB SSD, băng thông mạng hạn chế. "
        "Không được phép triển khai các thành phần nặng như Redis, Kafka, RabbitMQ, Elasticsearch hay cụm Kubernetes.",
        "[FACT]"
    )
    
    add_heading_1(doc, "2. Bảng Phân Bổ Ngân Sách Bộ Nhớ RAM (RAM Budget Allocation)")
    headers = ["Tiến trình / Dịch vụ", "Mức RAM tối đa", "Tỷ lệ %", "Cơ chế kiểm soát & cô lập"]
    data = [
        ["Linux Kernel & OS Core", "120 MB", "12.0%", "Loại bỏ snapd, ModemManager, giảm tải daemon"],
        ["MySQL 8.x Database", "320 MB", "31.2%", "innodb_buffer_pool_size=256M, max_connections=40"],
        ["Golang Backend API", "50 MB", "4.9%", "GOMEMLIMIT=45MiB, GOGC=80, connection pool = 15"],
        ["Nginx Reverse Proxy", "25 MB", "2.4%", "worker_processes 1, worker_connections 512"],
        ["Temporary Workspace / Buffer", "150 MB", "14.6%", "Giới hạn dung lượng tối đa cho file tạm"],
        ["Linux OS Page Cache / Free", "359 MB", "34.9%", "Bộ đệm I/O của hệ điều hành, chống nghẽn đĩa"],
        ["TỔNG CỘNG HỆ THỐNG", "1,024 MB", "100%", "Kích hoạt 1GB Swap (vm.swappiness=10) an toàn"]
    ]
    add_table_data(doc, headers, data, [1.8, 1.4, 1.0, 2.8])

    add_heading_1(doc, "3. Thiết Kế Backend Golang Modular Monolith")
    doc.add_paragraph("Mã nguồn Backend tổ chức theo cấu trúc module rõ ràng, biên dịch thành một file binary duy nhất (< 20MB):")
    add_code_block(doc,
"""backend/
├── cmd/server/main.go          # Khởi tạo config, database, chi router, graceful shutdown
├── internal/
│   ├── session/                # Quản lý listening session & vòng đời URL
│   ├── progress/               # Xử lý đồng bộ vị trí nghe mỗi 60 giây (UPSERT logic)
│   ├── youtube/                # Validate YouTube URL, Regex parsing, trích xuất Video ID
│   ├── auth/                   # Quản lý tài khoản User & Guest Session Token
│   └── platform/
│       ├── database/           # sql.DB connection pool tối ưu cho máy chủ yếu
│       └── response/           # JSON envelope chuẩn hóa {success, data, error}
└── migrations/                 # DDL migrations cho MySQL"""
    )
    
    doc.save("docs/02_TECHNICAL_ARCHITECTURE.docx")
    print("Saved docs/02_TECHNICAL_ARCHITECTURE.docx")

def build_03():
    doc = create_document_base("03_YOUTUBE_INTEGRATION_AND_POLICY")
    add_title(doc, "03. YOUTUBE INTEGRATION & POLICY RESEARCH", "Nghiên Cứu Tích Hợp YouTube, Phân Tích IFrame API & Ràng Buộc Pháp Lý")
    
    add_heading_1(doc, "1. Phân Tích Pháp Lý & Điều Khoản YouTube (Terms of Service)")
    add_callout(doc,
        "ĐIỀU KHOẢN PHÁP LÝ BẮT BUỘC (YouTube Terms of Service Mục II.1 & Developer Policies Mục III.E):\n"
        "1. Nghiêm cấm trích xuất stream (stream-ripping), tải lậu video hoặc tách riêng luồng âm thanh khỏi hình ảnh để phân phối lại mà không có sự cho phép trước bằng văn bản.\n"
        "2. Nghiêm cấm can thiệp, bypass các cơ chế DRM, Access Control, hoặc giới hạn kỹ thuật của YouTube.\n"
        "3. Phương thức được YouTube chính thức hỗ trợ và cấp phép để phát nội dung trên web của bên thứ ba là: YouTube IFrame Player API.",
        "[POLICY LIMITATION]"
    )

    add_heading_1(doc, "2. So Sánh Hai Kiến Trúc: IFrame Player API vs Backend Audio Processing")
    headers = ["Tiêu chí so sánh", "Kiến trúc A: YouTube IFrame Player API (KHUYẾN NGHỊ)", "Kiến trúc B: Backend Media Conversion"]
    data = [
        ["Tính hợp pháp & Policy", "100% Hợp lệ theo chính sách của Google / YouTube", "Vi phạm nghiêm trọng YouTube ToS, nguy cơ bị chặn IP/kiện"],
        ["Tải CPU & RAM Server", "GẦN NHƯ BẰNG 0 (YouTube gánh toàn bộ tải streaming)", "RẤT CAO: FFmpeg chiếm 100% CPU 1 core, dễ tràn RAM"],
        ["Băng thông Server (Bandwidth)", "0 Mbps (Trình duyệt tải trực tiếp từ CDN của Google)", "Hàng chục Mbps (Server phải stream audio cho Client)"],
        ["Độ trễ bắt đầu phát (Latency)", "< 500ms (Phát ngay lập tức sau khi nạp Player)", "> 5 - 15 giây (Thời gian chờ tải và convert)"],
        ["Trải nghiệm Audio UI", "Có thể tùy biến Audio-centric UI che video phía sau", "Xây dựng thẻ <audio> thuần túy hoàn toàn"],
        ["Độ phức tạp bảo trì", "Rất thấp: Chỉ gọi JS API có sẵn của Google", "Rất cao: Phải duy trì tool phân giải URL thường xuyên bị block"]
    ]
    add_table_data(doc, headers, data, [1.5, 2.7, 2.8])

    add_heading_1(doc, "3. Thuật Toán Trích Xuất & Chuẩn Hóa YouTube Video ID Trong Go")
    doc.add_paragraph("Backend thực hiện phân tích và khử độc URL nghiêm ngặt bằng biểu thức chính quy (Regex):")
    add_code_block(doc,
"""// Regex nhận dạng chính xác Video ID 11 ký tự từ mọi dạng link YouTube phổ biến
var ytRegex = regexp.MustCompile(`^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&].*)?$`)

func ExtractVideoID(rawURL string) (string, error) {
    if len(rawURL) > 500 {
        return "", errors.New("URL quá dài")
    }
    matches := ytRegex.FindStringSubmatch(strings.TrimSpace(rawURL))
    if len(matches) < 2 {
        return "", errors.New("URL không hợp lệ hoặc không phải YouTube Video")
    }
    videoID := matches[1]
    return videoID, nil
}"""
    )
    
    doc.save("docs/03_YOUTUBE_INTEGRATION_AND_POLICY.docx")
    print("Saved docs/03_YOUTUBE_INTEGRATION_AND_POLICY.docx")

def build_04():
    doc = create_document_base("04_AUDIO_PROCESSING_AND_STREAMING")
    add_title(doc, "04. AUDIO PROCESSING & STREAMING PIPELINE", "Đặc Tả Xử Lý Media Tạm Thời, FFmpeg Sandboxing & Cơ Chế Dọn Dẹp")
    
    add_heading_1(doc, "1. Nguyên Tắc Quản Trị Tệp Âm Thanh Tạm Thời (Temporary Ephemeral Audio)")
    doc.add_paragraph(
        "Trong trường hợp triển khai media processing cho nguồn âm thanh được phép (user upload hoặc hybrid fallback): "
        "Tệp âm thanh MP3 chỉ được xem là tài nguyên tạm thời (ephemeral cache) có vòng đời gắn liền với Session, "
        "tuyệt đối không lưu trữ vĩnh viễn và bị tiêu hủy ngay khi hết hạn."
    )
    add_callout(doc,
        "QUY TẮC KHÔNG LƯU TRỮ VĨNH VIỄN (NO PERMANENT MP3): "
        "1. Thư mục làm việc: /tmp/audio-sessions/{session_id}/audio.mp3 với quyền hạn 0700 thuộc về user unprivileged (audioweb).\n"
        "2. Thời gian sống (TTL): Tối đa 30 phút kể từ lần tương tác cuối cùng.\n"
        "3. Ngân sách đĩa tối đa (MAX_TEMP_STORAGE): Giới hạn 2GB tổng dung lượng tạm. Nếu vượt ngưỡng, hệ thống kích hoạt dọn dẹp khẩn cấp theo cơ chế LRU (Least Recently Used).",
        "[FACT]"
    )

    add_heading_1(doc, "2. Kiểm Soát Tài Nguyên FFmpeg Trên Server 1 Core")
    doc.add_paragraph("Thực thi chuyển mã media bắt buộc tuân thủ cơ chế Sandboxing và giới hạn tài nguyên:")
    add_code_block(doc,
"""// Giới hạn 1 worker đồng thời, timeout 120s, độ ưu tiên CPU thấp nhất
ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
defer cancel()

cmd := exec.CommandContext(ctx, "nice", "-n", "19",
    "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
    "-threads", "1",
    "-i", sanitizedInput,
    "-vn", "-c:a", "libmp3lame", "-b:a", "128k",
    sanitizedOutput,
)"""
    )

    add_heading_1(doc, "3. Ba Tầng Dọn Dẹp Tệp Tạm (Three-Tier Cleanup Strategy)")
    doc.add_paragraph("• Tầng 1 (Session Termination): Khi người dùng đóng phiên hoặc gọi DELETE /api/v1/sessions/{id}, backend xóa ngay thư mục tạm.")
    doc.add_paragraph("• Tầng 2 (Background Cleaner Goroutine): Định kỳ 5 phút quét toàn bộ /tmp/audio-sessions/ và xóa mọi tệp có mtime > 30 phút.")
    doc.add_paragraph("• Tầng 3 (Server Startup Cleanup): Mỗi khi Go Backend hoặc máy chủ khởi động lại, hàm init() sẽ tự động dọn sạch thư mục tạm để giải phóng 100% dung lượng đĩa.")

    doc.save("docs/04_AUDIO_PROCESSING_AND_STREAMING.docx")
    print("Saved docs/04_AUDIO_PROCESSING_AND_STREAMING.docx")

if __name__ == "__main__":
    build_01()
    build_02()
    build_03()
    build_04()
