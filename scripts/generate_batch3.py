import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.docx_builder import (
    create_document_base, add_title, add_heading_1, add_heading_2, 
    add_heading_3, add_callout, add_code_block, add_table_data
)

def build_11():
    doc = create_document_base("11_REST_API_Specification")
    add_title(doc, "11. REST API SPECIFICATION", "Quy Chuẩn Giao Tiếp API RESTful v1, Schema & Error Contracts")
    
    add_heading_1(doc, "1. Tiêu Chuẩn Thiết Kế & Định Dạng Chung (API Standards)")
    doc.add_paragraph("• Base URL: https://api.example.com/api/v1")
    doc.add_paragraph("• Định dạng trao đổi: 100% JSON UTF-8 (Header Content-Type: application/json; charset=utf-8).")
    doc.add_paragraph("• Cấu trúc phản hồi chuẩn hóa (Envelope Pattern):")
    add_code_block(doc,
"""// Thành công:
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 142 } // (Nếu có phân trang)
}

// Thất bại:
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email hoặc mật khẩu không chính xác",
    "details": null
  }
}"""
    )

    add_heading_1(doc, "2. Bảng Danh Mục Endpoints Chi Tiết")
    headers = ["Phương thức", "Đường dẫn (Endpoint)", "Quyền truy cập", "Chức năng nghiệp vụ"]
    data = [
        ["POST", "/api/v1/auth/register", "Public", "Đăng ký tài khoản người dùng mới"],
        ["POST", "/api/v1/auth/login", "Public", "Đăng nhập và thiết lập HttpOnly Cookie / Token"],
        ["POST", "/api/v1/auth/refresh", "Public (Refresh Cookie)", "Cấp mới Access Token"],
        ["POST", "/api/v1/auth/logout", "Authenticated", "Đăng xuất và hủy phiên làm việc"],
        ["GET", "/api/v1/auth/me", "Authenticated", "Lấy thông tin tài khoản đang đăng nhập"],
        ["GET", "/api/v1/audios", "Public", "Lấy danh sách audio (Phân trang LIMIT/OFFSET)"],
        ["GET", "/api/v1/audios/{id}", "Public", "Lấy chi tiết metadata bài hát"],
        ["GET", "/api/v1/audios/{id}/stream", "Public/Auth", "Streaming âm thanh (HTTP 206 Partial Content)"],
        ["GET", "/api/v1/search?q={keyword}", "Public", "Tìm kiếm bài hát theo từ khóa FULLTEXT"],
        ["GET", "/api/v1/artists", "Public", "Danh sách nghệ sĩ"],
        ["GET", "/api/v1/genres", "Public", "Danh sách thể loại nhạc (In-memory cached)"],
        ["GET", "/api/v1/playlists", "Authenticated", "Lấy danh sách playlist của user"],
        ["POST", "/api/v1/playlists", "Authenticated", "Tạo playlist mới"],
        ["GET", "/api/v1/playlists/{id}", "Authenticated", "Lấy chi tiết bài hát trong playlist"],
        ["POST", "/api/v1/playlists/{id}/items", "Owner Only", "Thêm bài hát vào playlist"],
        ["DELETE", "/api/v1/playlists/{id}/items/{audioId}", "Owner Only", "Xóa bài hát khỏi playlist"],
        ["POST", "/api/v1/favorites/{audioId}", "Authenticated", "Thêm bài hát vào danh sách yêu thích"],
        ["DELETE", "/api/v1/favorites/{audioId}", "Authenticated", "Xóa bài hát khỏi danh sách yêu thích"],
        ["POST", "/api/v1/history", "Authenticated", "Ghi nhận tiến trình lịch sử nghe"],
        ["GET", "/api/v1/history", "Authenticated", "Lấy lịch sử nghe gần nhất của user"],
        ["POST", "/api/v1/admin/audios/upload", "Admin Only", "Upload tệp âm thanh nguồn lên server"],
        ["POST", "/api/v1/admin/media/jobs", "Admin Only", "Kích hoạt job chuyển mã sang MP3"],
        ["GET", "/api/v1/admin/media/jobs/{id}", "Admin Only", "Kiểm tra tiến độ job xử lý"],
        ["GET", "/health", "Public", "Liveness check cho Nginx & giám sát hạ tầng"]
    ]
    add_table_data(doc, headers, data, [1.0, 2.2, 1.5, 2.2])

    doc.save("docs/11_REST_API_Specification.docx")
    print("Saved docs/11_REST_API_Specification.docx")

def build_12():
    doc = create_document_base("12_Authentication_Authorization")
    add_title(doc, "12. AUTHENTICATION & AUTHORIZATION", "Cơ Chế Xác Thực, Phân Quyền & Quản Lý Phiên Làm Việc")
    
    add_heading_1(doc, "1. So Sánh Mô Hình: JWT vs HttpOnly Cookie Session")
    headers = ["Tiêu chí so sánh", "Mô hình Token trong LocalStorage", "Mô hình HttpOnly Cookie (KHUYẾN NGHỊ)", "Mô hình State Session DB"]
    data = [
        ["Nguy cơ XSS", "Rất cao: Script độc hại đọc được Token", "Rất an toàn: JavaScript không thể truy cập", "Rất an toàn: Cookie HttpOnly"],
        ["Nguy cơ CSRF", "Không bị ảnh hưởng trực tiếp", "Cần phòng ngừa qua SameSite=Lax/Strict", "Cần phòng ngừa SameSite=Strict"],
        ["Tiêu tốn RAM VPS", "0 byte RAM (Stateless verify chữ ký)", "0 byte RAM (JWT trong cookie)", "Tốn RAM query bảng sessions hoặc Redis"],
        ["Độ phù hợp VPS yếu", "Trung bình (Rủi ro bảo mật)", "Tối ưu nhất: Bảo mật cao + 0% tải RAM", "Kém: Tăng tải truy vấn MySQL"]
    ]
    add_table_data(doc, headers, data, [1.5, 1.8, 2.0, 1.6])
    
    add_callout(doc,
        "KHUYẾN NGHỊ CUỐI CÙNG: Áp dụng cơ chế lai (Hybrid Token via Cookie): "
        "Access Token (thời hạn 15 phút) và Refresh Token (thời hạn 7 ngày) được lưu trong HttpOnly, Secure, SameSite=Lax Cookie. "
        "Frontend không cần lưu trữ token trong LocalStorage, loại trừ 100% rủi ro đánh cắp token qua XSS.",
        "[RECOMMENDATION]"
    )

    add_heading_1(doc, "2. Thiết Lập CORS Chuẩn Cho Môi Trường Phân Tách Domain")
    doc.add_paragraph("Do Frontend (https://example.com) và Backend API (https://api.example.com) khác origin, Nginx và Go backend phải cấu hình CORS nghiêm ngặt:")
    add_code_block(doc,
"""Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Range, X-Requested-With
Access-Control-Max-Age: 86400"""
    )
    add_callout(doc, 
        "TUYỆT ĐỐI KHÔNG SỬ DỤNG Access-Control-Allow-Origin: * khi Access-Control-Allow-Credentials: true. "
        "Đây là lỗi cấu hình bảo mật nghiêm trọng và bị trình duyệt chặn hoàn toàn theo chuẩn W3C/MDN.",
        "[WARNING]"
    )

    doc.save("docs/12_Authentication_Authorization.docx")
    print("Saved docs/12_Authentication_Authorization.docx")

def build_13():
    doc = create_document_base("13_Security_Threat_Model")
    add_title(doc, "13. SECURITY & THREAT MODEL SPECIFICATION", "Mô Hình Đe Dọa An Ninh, Phòng Chống Lỗ Hổng Theo OWASP Top 10")
    
    add_heading_1(doc, "1. Ma Trận Đe Dọa An Ninh (Threat Matrix)")
    headers = ["Mối đe dọa (Threat)", "Mức độ rủi ro", "Kịch bản tấn công", "Giải pháp ngăn chặn triệt để"]
    data = [
        ["Command Injection (FFmpeg)", "CRITICAL", "Attacker chèn tên file chứa dấu ; rm -rf / vào CLI", "Không dùng sh -c / exec. Dùng exec.CommandContext() với mảng arg tách biệt"],
        ["Server-Side Request Forgery (SSRF)", "HIGH", "Tải file media từ URL nội bộ 127.0.0.1/metadata", "Chỉ cho phép upload file cục bộ qua multipart form, cấm fetch URL ngoài ở MVP"],
        ["Path Traversal", "HIGH", "Gửi tên file ../../etc/passwd để đọc trộm dữ liệu", "Lưu file bằng UUID v4 hoàn toàn ngẫu nhiên trên đĩa, không dùng user filename"],
        ["FFmpeg Zero-day / Malicious Media", "CRITICAL", "Khai thác lỗi tràn bộ đệm của libavformat bằng crafted file", "Chạy worker dưới user unprivileged, FFmpeg timeout 120s, limit RAM, update FFmpeg"],
        ["SQL Injection", "CRITICAL", "Chèn payload SQL qua ô tìm kiếm hoặc login", "100% Prepared Statements qua database/sql của Golang, không nối chuỗi"],
        ["Resource Exhaustion (DoS / OOM)", "HIGH", "Upload liên tục file FLAC 500MB hoặc flood request stream", "Nginx client_max_body_size 50M; Rate limiting 10 req/s; Worker concurrency = 1"]
    ]
    add_table_data(doc, headers, data, [1.6, 1.0, 2.1, 2.2])

    add_heading_1(doc, "2. Bảo Mật Thực Thi FFmpeg Trong Go")
    doc.add_paragraph("Mã nguồn thực thi an toàn loại trừ hoàn toàn shell injection:")
    add_code_block(doc,
"""// AN TOÀN TUYỆT ĐỐI: Không bao giờ chạy qua shell
cmd := exec.CommandContext(ctx, "ffmpeg",
    "-y",
    "-hide_banner",
    "-loglevel", "error",
    "-threads", "1",
    "-i", sanitizedInputPath, // Đường dẫn tuyệt đối an toàn
    "-vn",
    "-c:a", "libmp3lame",
    "-b:a", "192k",
    sanitizedOutputPath,
)
// Không truyền chuỗi vào exec.Command("sh", "-c", "ffmpeg ...")"""
    )

    doc.save("docs/13_Security_Threat_Model.docx")
    print("Saved docs/13_Security_Threat_Model.docx")

def build_14():
    doc = create_document_base("14_YouTube_API_and_Policy_Research")
    add_title(doc, "14. YOUTUBE API & POLICY RESEARCH", "Nghiên Cứu Điều Khoản Dịch Vụ, Hạn Ngạch API & Giới Hạn Pháp Lý")
    
    add_heading_1(doc, "1. Điều Khoản Dịch Vụ Của YouTube (YouTube Terms of Service)")
    add_callout(doc,
        "ĐIỀU KHOẢN CỐT LÕI (YouTube ToS Mục II.1 và Developer Policies Mục III.E):\n"
        "1. Nghiêm cấm tải xuống, tách âm thanh (stream-ripping), chuyển đổi định dạng (convert MP3) hoặc lưu trữ nội dung nghe nhìn từ YouTube trừ khi có sự đồng ý trước bằng văn bản của YouTube hoặc chủ sở hữu bản quyền hợp pháp.\n"
        "2. Nghiêm cấm tách riêng phần âm thanh khỏi phần hình ảnh để phát lại độc lập.\n"
        "3. Nghiêm cấm can thiệp, vô hiệu hóa hoặc bypass bất kỳ cơ chế quản lý bản quyền kỹ thuật số (DRM), access control hay chữ ký số bảo vệ nào.",
        "[LEGAL WARNING]"
    )

    add_heading_1(doc, "2. Phân Tích YouTube Data API v3 & Quota")
    doc.add_paragraph("• Hạn mức mặc định: 10,000 units/ngày cho một dự án Google Cloud Platform miễn phí.")
    doc.add_paragraph("• Tiêu thụ hạn ngạch: Một truy vấn tìm kiếm (Search: list) tiêu tốn 100 units -> Giới hạn tối đa 100 lượt tìm kiếm/ngày.")
    doc.add_paragraph("• Trả lời API: YouTube Data API chỉ trả về METADATA (Tiêu đề, Mô tả, Kênh, Thumbnail) và KHÔNG BAO GIỜ cung cấp direct download URL cho file MP3/Video.")

    add_heading_1(doc, "3. Kết Luận Kiến Trúc Cho Dự Án")
    add_callout(doc,
        "Hệ thống TUYỆT ĐỐI KHÔNG TÍCH HỢP tính năng tải lậu âm thanh từ YouTube! "
        "Nếu người dùng muốn phát nội dung liên quan đến YouTube, giải pháp hợp pháp duy nhất là sử dụng YouTube IFrame Player API chính thức để nhúng trình phát nguyên bản có hình ảnh và quảng cáo của tác giả.",
        "[RECOMMENDATION]"
    )

    doc.save("docs/14_YouTube_API_and_Policy_Research.docx")
    print("Saved docs/14_YouTube_API_and_Policy_Research.docx")

def build_15():
    doc = create_document_base("15_Copyright_and_Licensing")
    add_title(doc, "15. COPYRIGHT & LICENSING COMPLIANCE", "Quy Trình Quản Lý Bản Quyền Nội Dung & Giấy Phép Sử Dụng Hợp Pháp")
    
    add_heading_1(doc, "1. Các Nguồn Âm Thanh Hợp Pháp Cho Hệ Thống")
    doc.add_paragraph("Nhằm đảm bảo dự án vận hành an toàn và hợp pháp, hệ thống chỉ hỗ trợ 4 nhóm nguồn âm thanh sau:")
    doc.add_paragraph("1. Tác phẩm do Quản trị viên/Người dùng tự sáng tác (User-owned Content): Người đăng tải giữ toàn quyền sở hữu trí tuệ.")
    doc.add_paragraph("2. Tác phẩm thuộc Phạm vi Công cộng (Public Domain): Các bản ghi đã hết hạn bảo hộ bản quyền hoặc được tác giả hiến tặng tự do.")
    doc.add_paragraph("3. Giấy phép Creative Commons Hợp lệ (CC BY, CC BY-SA): Cho phép phát trực tuyến miễn phí có kèm theo ghi công tác giả.")
    doc.add_paragraph("4. Âm thanh có hợp đồng cấp phép thương mại hoặc cấp phép sử dụng dịch vụ (Commercial License).")

    add_heading_1(doc, "2. Quy Trình DMCA & Tiếp Nhận Khiếu Nại Bản Quyền (Notice & Takedown)")
    doc.add_paragraph("Hệ thống tích hợp quy trình xử lý khiếu nại bản quyền 3 bước chuẩn quốc tế:")
    doc.add_paragraph("• Bước 1: Tiếp nhận thông báo vi phạm bản quyền từ chủ sở hữu quyền qua email legal/biểu mẫu.")
    doc.add_paragraph("• Bước 2: Quản trị viên thực hiện chuyển trạng thái bản ghi audio sang UNPUBLISHED ngay lập tức trong bảng audios.")
    doc.add_paragraph("• Bước 3: Lưu vết toàn bộ lịch sử xử lý vào bảng audit_logs để phục vụ báo cáo và đối soát pháp lý.")

    doc.save("docs/15_Copyright_and_Licensing.docx")
    print("Saved docs/15_Copyright_and_Licensing.docx")

if __name__ == "__main__":
    build_11()
    build_12()
    build_13()
    build_14()
    build_15()
