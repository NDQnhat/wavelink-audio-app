import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.docx_builder import (
    create_document_base, add_title, add_heading_1, add_heading_2, 
    add_heading_3, add_callout, add_code_block, add_table_data
)

def build_01():
    doc = create_document_base("01_Project_Overview")
    add_title(doc, "01. PROJECT OVERVIEW & SCOPE", "Tổng quan Dự án, Bối cảnh Vận hành & Nguyên lý Cốt lõi")
    
    add_heading_1(doc, "1. Bối Cảnh Và Động Lực Dự Án")
    doc.add_paragraph(
        "Dự án nhằm mục tiêu thiết kế và xây dựng một hệ thống nghe audio trực tuyến chất lượng cao, "
        "hoạt động ổn định trên hạ tầng máy chủ chi phí thấp (low-resource / budget VPS) với frontend hoàn toàn tách biệt, "
        "được phân phối tĩnh qua mạng lưới Git-based Hosting / Edge CDN."
    )
    add_callout(doc, 
        "Hạ tầng thực tế được xác định là môi trường bị giới hạn nghiêm ngặt về tài nguyên: 1 vCPU, 1GB - 2GB RAM, dung lượng ổ cứng NVMe/SSD hạn chế (20-40GB), và băng thông mạng không dư dả. "
        "Không được phép sử dụng các kiến trúc cồng kềnh như Kubernetes, Kafka, Elasticsearch hay cụm Redis nếu không thực sự bắt buộc.",
        "[FACT]"
    )
    
    add_heading_1(doc, "2. Mục Tiêu Kỹ Thuật Trọng Tâm")
    doc.add_paragraph("Kiến trúc hệ thống được định hình dựa trên 4 nguyên lý kỹ thuật tối thượng:")
    doc.add_paragraph("• Hiệu năng tối đa trên tài nguyên tối thiểu (Extreme Resource Efficiency): Mỗi MB RAM và chu kỳ xung nhịp CPU đều phải được bảo toàn cho việc stream và phục vụ API.")
    doc.add_paragraph("• Phân tách trách nhiệm triệt để (Separation of Concerns): Frontend tĩnh thuần túy (Vanilla JS) không tiêu tốn tài nguyên máy chủ backend.")
    doc.add_paragraph("• Tuân thủ Pháp lý & Bản quyền (Strict Legal & Copyright Compliance): Tuyệt đối không cho phép cơ chế bypass DRM, trích xuất lậu nội dung YouTube hay phát tán nhạc vi phạm bản quyền.")
    doc.add_paragraph("• Độ tin cậy và Bảo mật (Correctness & Security by Design): Bảo vệ hệ thống trước tấn công cạn kiệt tài nguyên (ReDoS, Zip Bomb, OOM Killer) và lỗi bảo mật phổ biến.")

    add_heading_1(doc, "3. Bảng Phân Tích Phạm Vi Hệ Thống (Scope Matrix)")
    headers = ["Thành phần / Tính năng", "Phạm vi MVP (In-Scope)", "Nâng cao (Post-MVP)", "Cơ chế kỹ thuật"]
    data = [
        ["Frontend UI", "Có", "Có", "HTML5, CSS3, Vanilla JS ES6+, Web Audio API"],
        ["Backend API", "Có", "Có", "Golang net/http + Chi Router (Single Binary)"],
        ["Database", "Có", "Có", "MySQL 8.x InnoDB, UTF-8 (utf8mb4), Connection Pool tối ưu"],
        ["Streaming Audio", "Có", "Có", "HTTP 206 Partial Content qua Nginx Offloading / Local Disk"],
        ["User Management", "Có", "Có", "RBAC: Guest, Registered User, System Admin"],
        ["Playlist & Favorite", "Có", "Có", "CRUD Playlist, Bookmark yêu thích, Lịch sử nghe (History)"],
        ["Media Ingestion", "Có", "Có", "Upload trực tiếp bởi Admin, Xác thực định dạng qua ffprobe"],
        ["Transcoding / FFmpeg", "Có (Giới hạn)", "Có", "Background Worker đơn luồng (Worker pool = 1) chạy lúc thấp điểm"],
        ["Search Audio", "Có", "Có", "MySQL FULLTEXT Search tự nhiên, hạn chế LIKE '%keyword%'"],
        ["YouTube Scraping/Download", "KHÔNG (Loại trừ)", "KHÔNG", "Tuân thủ nghiêm ngặt YouTube ToS; chỉ hỗ trợ Official Embed/API nếu cần"]
    ]
    add_table_data(doc, headers, data, [1.5, 1.2, 1.2, 2.6])
    
    add_callout(doc, 
        "Hệ thống tuân thủ thứ tự ưu tiên kiến trúc bắt buộc: Correctness > Security > Legal Compliance > Simplicity > Maintainability > Resource Efficiency > Performance > Scalability.",
        "[RECOMMENDATION]"
    )
    
    doc.save("docs/01_Project_Overview.docx")
    print("Saved docs/01_Project_Overview.docx")

def build_02():
    doc = create_document_base("02_Business_Requirements")
    add_title(doc, "02. BUSINESS REQUIREMENTS SPECIFICATION", "Đặc Tả Yêu Cầu Nghiệp Vụ & Mô Hình Vận Hành")
    
    add_heading_1(doc, "1. Mục Tiêu Nghiệp Vụ (Business Objectives)")
    doc.add_paragraph("1. Cung cấp nền tảng trải nghiệm âm thanh mượt mà cho người nghe mà không yêu cầu cấu hình thiết bị người dùng hay tài nguyên server đắt đỏ.")
    doc.add_paragraph("2. Tối ưu hóa toàn diện chi phí vận hành (TCO - Total Cost of Ownership): Chi phí lưu trữ máy chủ backend dưới $5 - $10/tháng.")
    doc.add_paragraph("3. Tạo cơ chế quản lý tập trung kho nội dung âm thanh có bản quyền, nội dung podcast nội bộ hoặc nhạc miễn phí bản quyền (Creative Commons, Public Domain).")
    
    add_heading_1(doc, "2. Đối Tượng Người Dùng (Target Personas)")
    doc.add_paragraph("• Khách vãng lai (Guest): Có thể duyệt danh mục, tìm kiếm bài hát, nghe trực tuyến các bản nhạc công khai mà không bắt buộc đăng nhập.")
    doc.add_paragraph("• Người dùng thành viên (Registered User): Có tài khoản cá nhân, khả năng lưu bài hát yêu thích (Favorites), tạo danh sách phát cá nhân (Playlists), đồng bộ lịch sử nghe (Listening History) và tiếp tục phát từ điểm dừng.")
    doc.add_paragraph("• Quản trị viên (Content Admin): Quản lý danh mục Nghệ sĩ, Album, Thể loại, tải lên tệp âm thanh hợp pháp, theo dõi hàng đợi xử lý media và cấu hình hệ thống.")

    add_heading_1(doc, "3. Ma Trận Giá Trị Nghiệp Vụ & Giới Hạn Vận Hành")
    headers = ["Hoạt động nghiệp vụ", "Kỳ vọng kết quả", "Ràng buộc chi phí / Tài nguyên", "Giải pháp đáp ứng"]
    data = [
        ["Nghe trực tuyến", "Không giật lag, độ trễ bắt đầu phát < 1.5s", "Băng thông server giới hạn", "Nginx HTTP Range Chunking 206, Cache browser 30 ngày"],
        ["Tìm kiếm nội dung", "Kết quả trả về tức thì < 200ms", "Không có RAM cho Elasticsearch", "MySQL InnoDB FULLTEXT Index trên Title/Artist"],
        ["Đăng tải nhạc mới", "Tự động chuẩn hóa MP3 128/192kbps", "CPU 1 core dễ bị treo do FFmpeg", "Xử lý hàng đợi nền bất đồng bộ, chỉ chạy 1 job tại một thời điểm"],
        ["Quản lý bản quyền", "Tránh rủi ro pháp lý và tranh chấp", "Không có đội ngũ pháp lý rà soát", "Bộ lọc Metadata bản quyền, ghi nhận nguồn gốc rõ ràng"]
    ]
    add_table_data(doc, headers, data, [1.5, 1.8, 1.5, 1.7])
    
    doc.save("docs/02_Business_Requirements.docx")
    print("Saved docs/02_Business_Requirements.docx")

def build_03():
    doc = create_document_base("03_Functional_Requirements")
    add_title(doc, "03. FUNCTIONAL REQUIREMENTS SPECIFICATION", "Chi Tiết Yêu Cầu Chức Năng (Functional Specifications)")
    
    add_heading_1(doc, "1. Phân Hệ Người Dùng & Xác Thực (User & Auth Module)")
    doc.add_paragraph("• FR-AUTH-01: Đăng ký tài khoản người dùng mới với email, username và mật khẩu an toàn (Bcrypt cost 11-12).")
    doc.add_paragraph("• FR-AUTH-02: Đăng nhập hệ thống, cấp phát phiên làm việc qua HttpOnly, Secure, SameSite Cookie hoặc Access Token + Refresh Token.")
    doc.add_paragraph("• FR-AUTH-03: Đăng xuất, vô hiệu hóa phiên làm việc trên trình duyệt và cập nhật token revocation list.")
    doc.add_paragraph("• FR-AUTH-04: Đổi mật khẩu và cập nhật thông tin hồ sơ cơ bản.")
    
    add_heading_1(doc, "2. Phân Hệ Danh Mục & Phát Nhạc (Audio Catalog & Player)")
    doc.add_paragraph("• FR-AUD-01: Hiển thị danh sách audio mới phát hành, phổ biến, theo thể loại (Genre), nghệ sĩ (Artist) và album.")
    doc.add_paragraph("• FR-AUD-02: Xem chi tiết bài hát (Title, Artist, Album, Duration, Bitrate, Lyrics/Description, Artwork Thumbnail).")
    doc.add_paragraph("• FR-AUD-03: Tìm kiếm audio đa tiêu chí (keyword matching trên tên bài, nghệ sĩ, album và tags).")
    doc.add_paragraph("• FR-AUD-04: Phát trực tuyến audio với hỗ trợ Seek (tua nhanh/lùi), Pause, Play, Điều chỉnh âm lượng, Lặp lại (Repeat), Xáo trộn (Shuffle).")
    doc.add_paragraph("• FR-AUD-05: Ghi nhận tiến trình nghe (Listening History) khi người dùng nghe trên 30 giây hoặc 50% thời lượng.")

    add_heading_1(doc, "3. Phân Hệ Cá Nhân Hóa (Playlist & Favorites)")
    doc.add_paragraph("• FR-PL-01: Tạo, đổi tên, cập nhật mô tả và xóa playlist cá nhân.")
    doc.add_paragraph("• FR-PL-02: Thêm bài hát vào playlist, sắp xếp lại thứ tự bài hát (reorder) và xóa bài hát khỏi playlist.")
    doc.add_paragraph("• FR-FAV-01: Đánh dấu bài hát yêu thích (Toggle Favorite) và xem danh sách yêu thích cá nhân.")

    add_heading_1(doc, "4. Phân Hệ Quản Trị & Xử Lý Media (Admin & Media Ingestion)")
    doc.add_paragraph("• FR-ADM-01: Tải lên tệp âm thanh gốc (WAV, FLAC, AAC, MP3) với giới hạn kích thước tối đa 50MB.")
    doc.add_paragraph("• FR-ADM-02: Tự động trích xuất metadata (ID3 tags: Title, Artist, Album, Duration, Bitrate) qua FFprobe.")
    doc.add_paragraph("• FR-ADM-03: Đưa tệp vào hàng đợi chuyển mã (Transcoding Queue) chuyển đổi sang MP3 CBR 192kbps / VBR V2 chuẩn hóa.")
    doc.add_paragraph("• FR-ADM-04: Duyệt, chỉnh sửa metadata và chuyển trạng thái từ DRAFT sang PUBLISHED.")
    doc.add_paragraph("• FR-ADM-05: Quản lý danh mục phân loại (Thêm/Sửa/Xóa Genres, Artists, Albums).")
    
    doc.save("docs/03_Functional_Requirements.docx")
    print("Saved docs/03_Functional_Requirements.docx")

def build_04():
    doc = create_document_base("04_Non_Functional_Requirements")
    add_title(doc, "04. NON-FUNCTIONAL REQUIREMENTS", "Yêu Cầu Phi Chức Năng, Ràng Buộc Kỹ Thuật & SLA")
    
    add_heading_1(doc, "1. Hiệu Năng & Độ Trễ (Performance & Latency)")
    add_callout(doc,
        "Các chỉ số hiệu năng được đặt ra dựa trên kịch bản tải tối đa của server đơn nhân 1 vCPU, 1-2GB RAM không có GPU.",
        "[FACT]"
    )
    headers = ["Tiêu chí kỹ thuật", "Chỉ số mục tiêu (Target SLA)", "Điều kiện kiểm thử", "Phân loại"]
    data = [
        ["API Response Time (Catalog)", "< 50ms (p95)", "100 concurrent users duyệt danh sách", "[ESTIMATE]"],
        ["Search Latency", "< 150ms (p95)", "MySQL FULLTEXT query trên 50,000 bản ghi", "[ESTIMATE]"],
        ["Audio Stream Start Latency", "< 800ms", "Từ lúc bấm Play tới byte âm thanh đầu tiên", "[ESTIMATE]"],
        ["Memory Usage (Go Backend)", "< 60 MB RSS", "Khi đang phục vụ 200 req/sec", "[ESTIMATE]"],
        ["Memory Usage (MySQL)", "< 350 MB RSS", "Buffer pool cấu hình 256MB", "[ESTIMATE]"],
        ["CPU Idle Target", "> 40% CPU nhàn rỗi", "Bình thường không có tác vụ FFmpeg", "[ESTIMATE]"]
    ]
    add_table_data(doc, headers, data, [1.8, 1.6, 1.8, 1.3])
    
    add_heading_1(doc, "2. Độ Sẵn Sàng & Khả Năng Mở Rộng (Reliability & Scalability)")
    doc.add_paragraph("• Tính sẵn sàng (Availability): Đạt 99.5% uptime trong điều kiện vận hành đơn máy chủ (Single VPS).")
    doc.add_paragraph("• Tự phục hồi (Resilience): Cơ chế systemd tự động khởi động lại Go backend trong vòng < 3 giây nếu xảy ra lỗi panic ngoài dự kiến.")
    doc.add_paragraph("• Giới hạn tài nguyên bảo vệ (OOM Prevention): Thiết lập MemoryMax trong systemd để ngăn chặn Go process làm sập toàn bộ hệ điều hành.")

    add_heading_1(doc, "3. Yêu Cầu Bảo Mật (Security Requirements)")
    doc.add_paragraph("• Mã hóa đường truyền: 100% lưu lượng HTTP chuyển hướng sang HTTPS chuẩn TLS 1.3 qua chứng chỉ Let's Encrypt.")
    doc.add_paragraph("• Cô lập dữ liệu và chống tràn quyền: Kiểm tra chặt chẽ quyền sở hữu (IDOR) trong mọi thao tác cập nhật Playlist/Favorites.")
    doc.add_paragraph("• Chống Brute Force: Nginx rate limit 5 req/phút đối với endpoint /api/v1/auth/login.")
    doc.add_paragraph("• Khử nhiễm đường dẫn (Path Traversal Protection): Đường dẫn lưu trữ media sử dụng định danh UUID ngẫu nhiên, không sử dụng tên tệp gốc từ người dùng.")

    doc.save("docs/04_Non_Functional_Requirements.docx")
    print("Saved docs/04_Non_Functional_Requirements.docx")

def build_05():
    doc = create_document_base("05_System_Architecture")
    add_title(doc, "05. SYSTEM ARCHITECTURE & INTEGRATION", "Kiến Trúc Tổng Thể & Cơ Chế Phối Hợp Các Thành Phần")
    
    add_heading_1(doc, "1. Mô Hình Kiến Trúc Phân Tách Toàn Cục (Global System Topology)")
    doc.add_paragraph(
        "Hệ thống tuân thủ mô hình phân tách vật lý hoàn toàn giữa Frontend (phân phối tĩnh qua mạng CDN) "
        "và Backend (máy chủ đơn nhiệm tự quản lý), kết nối duy nhất qua giao thức HTTPS RESTful API."
    )
    
    add_code_block(doc, 
"""[ USER BROWSER ]
       │
       ├─────────────────────────────────┐
       │ (1) Tải HTML/CSS/JS             │ (2) Gọi HTTPS API / Streaming
       ▼                                 ▼
┌───────────────────────────┐     ┌───────────────────────────────────────────────┐
│ GIT-BASED STATIC HOSTING  │     │ BACKEND SERVER (Self-Hosted Linux VPS)        │
│ (Cloudflare Pages/GitHub) │     │                                               │
│                           │     │  ┌─────────────────────────────────────────┐  │
│ - index.html              │     │  │ NGINX (Reverse Proxy & Edge Shield)     │  │
│ - css/style.css           │     │  │ - SSL Termination (Let's Encrypt)       │  │
│ - js/app.js               │     │  │ - Rate Limiting & Gzip/Brotli           │  │
│ - Static Assets           │     │  │ - Direct MP3 Static Stream (Port 443)   │  │
└───────────────────────────┘     │  └───────────────┬─────────────────────────┘  │
                                  │                  │ (Proxy pass unix socket)   │
                                  │                  ▼                            │
                                  │  ┌─────────────────────────────────────────┐  │
                                  │  │ GOLANG BACKEND (Modular Monolith)       │  │
                                  │  │ - REST API Engine (Chi Router)          │  │
                                  │  │ - Auth / RBAC / Catalog / Playlist      │  │
                                  │  │ - Job Manager (Worker Pool = 1)         │  │
                                  │  └───────┬─────────────────────────┬───────┘  │
                                  │          │                         │          │
                                  │          ▼                         ▼          │
                                  │  ┌──────────────┐          ┌───────────────┐  │
                                  │  │ MySQL 8.x    │          │ Local Storage │  │
                                  │  │ (InnoDB DB)  │          │ /data/audio/  │  │
                                  │  └──────────────┘          └───────────────┘  │
                                  └───────────────────────────────────────────────┘"""
    )
    
    add_heading_1(doc, "2. Phân Tích Dòng Chảy Dữ Liệu (End-to-End Data Flow)")
    doc.add_paragraph("1. Giai đoạn tải trang: Người dùng truy cập domain chính https://audioapp.com -> DNS định tuyến tới Cloudflare Pages Edge -> Trình duyệt nạp bộ nhớ đệm HTML, CSS, JS tĩnh mà không chạm tới Backend Server.")
    doc.add_paragraph("2. Giai đoạn khởi tạo ứng dụng: JS trên trình duyệt kiểm tra phiên làm việc qua lệnh gọi GET https://api.audioapp.com/api/v1/auth/me.")
    doc.add_paragraph("3. Giai đoạn duyệt danh mục: JS gọi GET /api/v1/audios -> Nginx chuyển tiếp tới Go Backend qua Unix Domain Socket -> Go truy vấn MySQL -> Trả về JSON mảng audio.")
    doc.add_paragraph("4. Giai đoạn phát nhạc (Streaming): JS thiết lập src của thẻ HTML5 <audio> tới https://api.audioapp.com/api/v1/audios/{id}/stream -> Nginx chặn và phục vụ trực tiếp tệp MP3 từ đĩa cứng (hoặc qua X-Accel-Redirect) với HTTP 206 Partial Content, hoàn toàn giải phóng Go process khỏi việc giữ kết nối streaming.")

    add_heading_1(doc, "3. Cơ Chế Định Danh & Tên Miền (DNS & Domain Structure)")
    headers = ["Thành phần", "FQDN Tên miền", "Điểm đích hạ tầng", "Chứng chỉ SSL"]
    data = [
        ["Frontend UI", "audioapp.example.com", "Cloudflare Pages / GitHub Pages CNAME", "Cloudflare Managed Universal SSL"],
        ["Backend API & Stream", "api.example.com", "A Record -> Địa chỉ IP Public của VPS Linux", "Let's Encrypt Certbot tự động gia hạn"]
    ]
    add_table_data(doc, headers, data, [1.5, 1.8, 1.8, 1.4])
    
    doc.save("docs/05_System_Architecture.docx")
    print("Saved docs/05_System_Architecture.docx")

if __name__ == "__main__":
    build_01()
    build_02()
    build_03()
    build_04()
    build_05()
