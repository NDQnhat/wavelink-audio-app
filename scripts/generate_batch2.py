import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.docx_builder import (
    create_document_base, add_title, add_heading_1, add_heading_2, 
    add_heading_3, add_callout, add_code_block, add_table_data
)

def build_06():
    doc = create_document_base("06_Golang_Backend_Architecture")
    add_title(doc, "06. GOLANG BACKEND ARCHITECTURE", "Thiết Kế Backend Golang Modular Monolith & Quản Lý Vận Hành")
    
    add_heading_1(doc, "1. Lựa Chọn Cấu Trúc Backend (Modular Monolith vs Microservices)")
    doc.add_paragraph(
        "Hệ thống lựa chọn triệt để mô hình Modular Monolith đóng gói thành một single binary duy nhất. "
        "Mô hình này loại bỏ hoàn toàn độ trễ IPC/network call giữa các service, không cần service mesh hay container orchestrator nặng nề."
    )
    add_callout(doc,
        "Đánh giá Router: So sánh giữa Chi, Gin, Echo và Go 1.22+ Standard net/http ServeMux. "
        "Chi (go-chi/chi/v5) được lựa chọn vì tính năng 100% tương thích net/http, footprint bộ nhớ cực nhỏ (< 15KB binary size overhead), "
        "hỗ trợ routing pattern ngữ nghĩa, context-friendly và không lạm dụng reflection như các framework lớn khác.",
        "[ANALYSIS]"
    )
    
    add_heading_1(doc, "2. Cấu Trúc Thư Mục Dự Án (Clean / Hexagonal Standard)")
    add_code_block(doc,
"""backend/
├── cmd/
│   └── api/
│       └── main.go                 # Entrypoint khởi tạo config, DB pool, router & graceful shutdown
├── internal/
│   ├── auth/                       # Module đăng nhập, đăng ký, JWT/Cookie logic
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── repository.go
│   ├── audio/                      # Quản lý danh mục bài hát, phát trực tuyến
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── repository.go
│   ├── playlist/                   # Quản lý danh sách phát
│   ├── favorite/                   # Quản lý yêu thích
│   ├── history/                    # Ghi nhận lịch sử nghe
│   ├── media/                      # Worker điều phối FFmpeg chuyển mã
│   │   ├── worker.go
│   │   └── processor.go
│   └── platform/                   # Các gói hạ tầng tái sử dụng
│       ├── database/               # Khởi tạo sql.DB pool
│       ├── logger/                 # Structured logger (log/slog chuẩn Go 1.21+)
│       └── validator/              # Sanitize và validate input
├── migrations/                     # Script DDL SQL thuần (001_init.sql)
├── configs/
│   └── config.yaml                 # Cấu hình môi trường qua env/file
└── scripts/
    └── deploy.sh                   # Script build binary và restart systemd"""
    )

    add_heading_1(doc, "3. Quản Lý Tiến Trình & Khởi Động/Tắt An Toàn (Graceful Shutdown)")
    doc.add_paragraph(
        "Ứng dụng lắng nghe tín hiệu SIGINT và SIGTERM qua os/signal.NotifyContext(). "
        "Khi nhận tín hiệu tắt, server dừng tiếp nhận request mới và cho phép 15 giây để hoàn tất các request đang xử lý trước khi đóng DB pool."
    )
    add_code_block(doc,
"""ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()

srv := &http.Server{
    Addr:         ":8080",
    Handler:      router,
    ReadTimeout:  10 * time.Second,
    WriteTimeout: 15 * time.Second,
    IdleTimeout:  60 * time.Second,
}

go func() {
    if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        slog.Error("listen failed", "error", err)
    }
}()

<-ctx.Done()
shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
defer cancel()
srv.Shutdown(shutdownCtx)"""
    )
    
    doc.save("docs/06_Golang_Backend_Architecture.docx")
    print("Saved docs/06_Golang_Backend_Architecture.docx")

def build_07():
    doc = create_document_base("07_Vanilla_JS_Frontend_Architecture")
    add_title(doc, "07. VANILLA JS FRONTEND ARCHITECTURE", "Thiết Kế Giao Diện Tĩnh & Trình Phát Nhạc Thuần Web Audio")
    
    add_heading_1(doc, "1. Triết Lý Thiết Kế Frontend Không Framework")
    doc.add_paragraph(
        "Toàn bộ giao diện người dùng được xây dựng bằng HTML5 ngữ nghĩa, CSS3 hiện đại (Flexbox/CSS Grid/CSS Variables) "
        "và Vanilla JavaScript (ES6+ Modules). Không sử dụng React, Vue, Angular hay Node.js runtime trong quá trình production."
    )
    add_callout(doc,
        "Lợi ích tài nguyên: 0ms thời gian build SSR, tệp bundle chỉ vài chục Kilobytes thay vì hàng Megabytes. "
        "Tải trang ban đầu < 200ms trên mạng 3G/4G, bộ nhớ RAM trình duyệt tiêu tốn dưới 25MB.",
        "[FACT]"
    )

    add_heading_1(doc, "2. Cấu Trúc Mã Nguồn Frontend")
    add_code_block(doc,
"""frontend/
├── index.html                      # Single page shell chứa Audio Player bar cố định
├── css/
│   ├── base.css                    # Biến CSS (dark/light theme), reset, typography
│   ├── layout.css                  # Grid layout: Sidebar, Main Content, Player Footer
│   └── components.css              # Track card, modal, slider thanh tiến trình
├── js/
│   ├── app.js                      # Điểm khởi tạo ứng dụng, router định tuyến hash (#/)
│   ├── api.js                      # Wrapper fetch() tập trung, đính kèm credentials & refresh token
│   ├── state.js                    # Store quản lý trạng thái Reactive nhẹ (Pub/Sub pattern)
│   ├── player.js                   # Điều khiển thẻ HTML5 <audio> / Web Audio API
│   ├── components/
│   │   ├── trackList.js            # Render bảng danh sách bài hát
│   │   ├── playlistView.js         # Quản lý giao diện playlist
│   │   └── searchBar.js            # Input tìm kiếm Debounce 300ms
│   └── pages/
│       ├── home.js
│       ├── favorites.js
│       └── login.js
└── assets/
    └── icons/                      # SVG icons tinh gọn (Play, Pause, Skip, Volume)"""
    )

    add_heading_1(doc, "3. Cơ Chế State Management & Web Audio Player")
    doc.add_paragraph("Player module quản lý thể hiện duy nhất của Audio element, đồng bộ thanh tua nhạc (Seek bar), thời gian hiện tại (currentTime), thời lượng (duration) và trạng thái bộ nhớ đệm (buffered ranges).")
    doc.add_paragraph("Hỗ trợ Media Session API giúp người dùng điều khiển nhạc trực tiếp từ màn hình khóa điện thoại hoặc bàn phím đa phương tiện máy tính.")
    
    doc.save("docs/07_Vanilla_JS_Frontend_Architecture.docx")
    print("Saved docs/07_Vanilla_JS_Frontend_Architecture.docx")

def build_08():
    doc = create_document_base("08_MySQL_Database_Design")
    add_title(doc, "08. MYSQL DATABASE DESIGN & TUNING", "Đặc Tả Cơ Sở Dữ Liệu MySQL 8.x & Tối Ưu Server Yếu")
    
    add_heading_1(doc, "1. Nguyên Lý Thiết Kế Schema & Ràng Buộc")
    doc.add_paragraph("• Storage Engine: Bắt buộc sử dụng 100% InnoDB để đảm bảo tính toàn vẹn giao dịch (ACID), Foreign Keys và Row-level Locking.")
    doc.add_paragraph("• Character Set: Bắt buộc sử dụng utf8mb4 với Collation utf8mb4_0900_ai_ci nhằm hỗ trợ đầy đủ tiếng Việt có dấu, ký tự quốc tế và emoji.")
    doc.add_paragraph("• Kiểu dữ liệu tối ưu: Sử dụng INT UNSIGNED hoặc BIGINT UNSIGNED cho Primary Key, VARCHAR độ dài hợp lý, ENUM/TINYINT cho trạng thái để tiết kiệm bộ nhớ chỉ mục.")

    add_heading_1(doc, "2. Cấu Hình MySQL Tối Ưu Cho Máy Chủ 1GB - 2GB RAM (my.cnf)")
    add_callout(doc,
        "Mặc định MySQL 8.x phân bổ innodb_buffer_pool_size lớn (> 128MB tới 80% RAM), dễ dẫn đến tình trạng máy chủ Linux bị tràn RAM và kích hoạt OOM Killer tiêu diệt tiến trình MySQL. "
        "Phải cấu hình my.cnf chuẩn xác theo bảng thông số dưới đây.",
        "[WARNING]"
    )
    headers = ["Tham số cấu hình", "Giá trị khuyến nghị", "Mục đích tối ưu tài nguyên"]
    data = [
        ["innodb_buffer_pool_size", "256M (cho VPS 1GB) / 512M (cho VPS 2GB)", "Khống chế bộ đệm RAM của InnoDB, chiếm tối đa 30% tổng RAM hệ thống"],
        ["innodb_log_file_size", "64M", "Duy trì log ghi transaction đủ cho throughput vừa phải"],
        ["max_connections", "50", "Giới hạn kết nối tối đa từ Go backend và admin CLI, tránh cạn RAM stack"],
        ["thread_cache_size", "8", "Tái sử dụng thread kết nối, giảm CPU overhead khởi tạo thread"],
        ["table_open_cache", "400", "Kiểm soát số lượng file descriptor mở"],
        ["slow_query_log", "1 (long_query_time = 1.0s)", "Bật giám sát các câu lệnh truy vấn chạy chậm vượt quá 1 giây"]
    ]
    add_table_data(doc, headers, data, [2.2, 2.0, 2.5])

    add_heading_1(doc, "3. Chiến Lược Đánh Chỉ Mục (Indexing Strategy)")
    doc.add_paragraph("• Fulltext Search: Đặt FULLTEXT INDEX idx_ft_title_artist ON audios(title) phục vụ tìm kiếm từ khóa với MATCH() AGAINST().")
    doc.add_paragraph("• Composite Index: Đặt INDEX idx_playlist_position ON playlist_items(playlist_id, position) để tối ưu việc load playlist có thứ tự.")
    doc.add_paragraph("• Tránh N+1 Query: Go backend sử dụng các câu lệnh JOIN tường minh hoặc mảng ID (WHERE id IN (...)) thay vì lặp từng query đơn lẻ.")

    doc.save("docs/08_MySQL_Database_Design.docx")
    print("Saved docs/08_MySQL_Database_Design.docx")

def build_09():
    doc = create_document_base("09_Audio_Media_Pipeline")
    add_title(doc, "09. AUDIO MEDIA PIPELINE SPECIFICATION", "Quy Trình Tiếp Nhận, Kiểm Thử & Chuyển Mã Media Bằng FFmpeg")
    
    add_heading_1(doc, "1. Thách Thức Kỹ Thuật Khi Xử Lý Media Trên Server Yếu")
    doc.add_paragraph(
        "FFmpeg là công cụ xử lý đa phương tiện rất mạnh nhưng có thể chiếm dụng 100% tài nguyên CPU đa nhân "
        "và hàng trăm Megabytes RAM nếu mã hóa tập tin chất lượng cao hoặc xử lý nhiều tệp song song."
    )
    add_callout(doc,
        "QUY TẮC CẤP THIẾT: Tuyệt đối không bao giờ thực thi FFmpeg đồng bộ (synchronous) ngay trong HTTP Request context! "
        "Mọi thao tác chuyển mã phải được đưa vào hàng đợi xử lý nền (Background Job Worker) với số lượng luồng thực thi đồng thời MAX_WORKERS = 1.",
        "[WARNING]"
    )

    add_heading_1(doc, "2. Sơ Đồ Quy Trình Pipeline Chuyển Mã")
    add_code_block(doc,
"""Admin Upload File (WAV/FLAC/MP3)
       │
       ▼ (1) Lưu file tạm vào /data/audio/tmp/{uuid}.upload
[ Go API Handler ]
       │
       ▼ (2) Kiểm tra MIME, File Signature & trích xuất metadata
[ FFprobe Inspector ] ──(Lỗi định dạng)──► Trả về lỗi 422 Unprocessable Entity
       │
       ▼ (3) Ghi bản ghi vào bảng `processing_jobs` (Status = 'QUEUED')
[ MySQL DB ]
       │
       ▼ (4) Go Worker nền claim job (Status = 'RUNNING')
[ Background Worker (Worker Pool = 1) ]
       │
       ▼ (5) Gọi FFmpeg với tham số giới hạn luồng và CPU
[ FFmpeg Transcoder ] (exec.CommandContext với timeout 120s, -threads 1, nice 19)
       │
       ├──► Tạo MP3 CBR 192kbps chuẩn hóa tại /data/audio/processed/{uuid}.mp3
       ├──► Trích xuất ảnh bìa Artwork nếu có sang /data/audio/covers/{uuid}.jpg
       │
       ▼ (6) Cập nhật trạng thái Job = 'COMPLETED', Audio Status = 'PUBLISHED'
[ MySQL Database ]"""
    )

    add_heading_1(doc, "3. Thông Số Dòng Lệnh FFmpeg Chuẩn Hóa")
    doc.add_paragraph("Dòng lệnh thực thi FFmpeg chuẩn hóa được đóng gói bảo mật không qua shell:")
    add_code_block(doc,
"""# Chuyển đổi an toàn, giới hạn 1 thread, độ ưu tiên CPU thấp
ffmpeg -y -hide_banner -loglevel error \
  -threads 1 \
  -i /data/audio/tmp/input.wav \
  -vn -c:a libmp3lame -b:a 192k -ar 44100 -ac 2 \
  /data/audio/processed/output.mp3"""
    )
    
    doc.save("docs/09_Audio_Media_Pipeline.docx")
    print("Saved docs/09_Audio_Media_Pipeline.docx")

def build_10():
    doc = create_document_base("10_Audio_Streaming_Architecture")
    add_title(doc, "10. AUDIO STREAMING ARCHITECTURE", "Kiến Trúc Phát Trực Tuyến & Cơ Chế Phục Vụ HTTP 206 Partial Content")
    
    add_heading_1(doc, "1. Bản Chất Giao Thức HTTP Range Request")
    doc.add_paragraph(
        "Trình duyệt khi phát tệp âm thanh HTML5 <audio> không tải về toàn bộ tệp ngay lập tức mà gửi yêu cầu từng phần thông qua header Range: bytes=start-end. "
        "Server phản hồi mã trạng thái 206 Partial Content với các header bắt buộc:"
    )
    doc.add_paragraph("• Accept-Ranges: bytes")
    doc.add_paragraph("• Content-Range: bytes 0-1048575/5242880 (Khoảng byte đang trả / Tổng kích thước tệp)")
    doc.add_paragraph("• Content-Length: 1048576 (Số byte trong chunk hiện tại)")
    doc.add_paragraph("• Content-Type: audio/mpeg")

    add_heading_1(doc, "2. Phân Tích Các Mô Hình Phục Vụ Streaming")
    headers = ["Phương án thiết kế", "Mô tả cơ chế", "Ưu điểm", "Nhược điểm / Đánh giá VPS yếu"]
    data = [
        ["Option A: Go Streaming", "Go mở tệp đĩa, tự parse Range và ghi io.Copy ra ResponseWriter", "Kiểm soát quyền truy cập chặt chẽ từng byte", "Tốn Goroutine, bộ đệm RAM Go phình to khi nhiều listener đồng thời"],
        ["Option B: Nginx Direct Serving", "Nginx trực tiếp phục vụ tệp MP3 qua static block", "Hiệu năng cực cao nhờ sendfile(2) của Linux kernel, 0% Go RAM", "Không thể kiểm tra authentication/token người dùng trước khi stream"],
        ["Option C: Nginx X-Accel-Redirect (KHUYẾN NGHỊ)", "Go xác thực quyền, nếu hợp lệ trả header X-Accel-Redirect: /internal_media/file.mp3", "Vừa bảo mật xác thực trong Go, vừa tận dụng zero-copy sendfile của Nginx", "Giải pháp tối thượng: Bảo vệ nội dung và giải phóng hoàn toàn Go process"]
    ]
    add_table_data(doc, headers, data, [1.5, 2.0, 1.6, 1.8])
    
    add_callout(doc,
        "QUYẾT ĐỊNH KIẾN TRÚC: Lựa chọn Option C (Nginx X-Accel-Redirect) kết hợp với Option B (Static Direct cho public audio có cache). "
        "Cơ chế này giúp server 1GB RAM có thể phục vụ đồng thời hàng trăm người nghe mà không làm tăng tải RAM của ứng dụng Go.",
        "[RECOMMENDATION]"
    )

    doc.save("docs/10_Audio_Streaming_Architecture.docx")
    print("Saved docs/10_Audio_Streaming_Architecture.docx")

if __name__ == "__main__":
    build_06()
    build_07()
    build_08()
    build_09()
    build_10()
