import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.docx_builder import (
    create_document_base, add_title, add_heading_1, add_heading_2, 
    add_heading_3, add_callout, add_code_block, add_table_data
)

def build_00_master():
    doc = create_document_base("00_Master_System_Specification")
    add_title(doc, "00. MASTER SYSTEM SPECIFICATION", "Văn Kiện Đặc Tả Hệ Thống & Hướng Dẫn Kỹ Thuật Tổng Hợp")
    
    add_heading_1(doc, "1. Giới Thiệu Bản Thiết Kế Tổng Thể (Master Blueprint)")
    doc.add_paragraph(
        "Tài liệu Master System Specification là bản thiết kế trung tâm tổng hợp toàn bộ các quyết định kiến trúc, "
        "đặc tả kỹ thuật, ràng buộc phần cứng và lộ trình xây dựng của hệ thống Web Application Nghe Audio Trực Tuyến. "
        "Bản thiết kế này phục vụ làm kim chỉ nam xuyên suốt cho toàn bộ đội ngũ kỹ sư triển khai và quản trị hệ thống."
    )
    
    add_heading_1(doc, "2. Bản Đồ Danh Mục Tài Liệu Kỹ Thuật (Documentation Index)")
    headers = ["STT / Mã số", "Tên tài liệu văn kiện (.docx)", "Phạm vi & Nội dung trọng tâm", "Trạng thái phê duyệt"]
    data = [
        ["Doc 00", "00_Master_System_Specification.docx", "Tổng quan toàn bộ hệ thống & Danh mục hồ sơ", "PHÊ DUYỆT [FACT]"],
        ["Doc 01", "01_Project_Overview.docx", "Bối cảnh dự án, triết lý thiết kế & nguyên tắc cốt lõi", "PHÊ DUYỆT [FACT]"],
        ["Doc 02", "02_Business_Requirements.docx", "Yêu cầu nghiệp vụ, đối tượng người dùng & chỉ tiêu TCO", "PHÊ DUYỆT [FACT]"],
        ["Doc 03", "03_Functional_Requirements.docx", "Đặc tả chi tiết các phân hệ chức năng (Auth, Catalog, Player, Admin)", "PHÊ DUYỆT [FACT]"],
        ["Doc 04", "04_Non_Functional_Requirements.docx", "Chỉ số SLA, p95 latency, độ ổn định & ràng buộc tài nguyên", "PHÊ DUYỆT [FACT]"],
        ["Doc 05", "05_System_Architecture.docx", "Kiến trúc tổng thể, sơ đồ topo mạng & phân tách FE/BE", "PHÊ DUYỆT [FACT]"],
        ["Doc 06", "06_Golang_Backend_Architecture.docx", "Thiết kế Modular Monolith Go, Chi router & Graceful shutdown", "PHÊ DUYỆT [FACT]"],
        ["Doc 07", "07_Vanilla_JS_Frontend_Architecture.docx", "Kiến trúc web tĩnh không framework, Web Audio & Media Session", "PHÊ DUYỆT [FACT]"],
        ["Doc 08", "08_MySQL_Database_Design.docx", "Thiết kế Schema InnoDB utf8mb4, Indexing & tối ưu my.cnf", "PHÊ DUYỆT [FACT]"],
        ["Doc 09", "09_Audio_Media_Pipeline.docx", "Quy trình tiếp nhận, FFprobe xác thực & FFmpeg 1 worker an toàn", "PHÊ DUYỆT [FACT]"],
        ["Doc 10", "10_Audio_Streaming_Architecture.docx", "Kiến trúc HTTP 206 Partial Content & Nginx X-Accel-Redirect", "PHÊ DUYỆT [FACT]"],
        ["Doc 11", "11_REST_API_Specification.docx", "Đặc tả chi tiết 24 endpoints RESTful v1 & Error JSON envelope", "PHÊ DUYỆT [FACT]"],
        ["Doc 12", "12_Authentication_Authorization.docx", "Mô hình xác thực HttpOnly JWT Cookie, SameSite & CORS chuẩn", "PHÊ DUYỆT [FACT]"],
        ["Doc 13", "13_Security_Threat_Model.docx", "Ma trận đe dọa OWASP Top 10, chống Command Injection & OOM DoS", "PHÊ DUYỆT [FACT]"],
        ["Doc 14", "14_YouTube_API_and_Policy_Research.docx", "Nghiên cứu YouTube ToS, chính sách bản quyền & loại trừ download lậu", "PHÊ DUYỆT [FACT]"],
        ["Doc 15", "15_Copyright_and_Licensing.docx", "Nguồn nhạc hợp pháp (CC, Public Domain) & Quy trình DMCA", "PHÊ DUYỆT [FACT]"],
        ["Doc 16", "16_Nginx_Architecture.docx", "Cấu hình Nginx reverse proxy, Rate limiting, SSL & Cache", "PHÊ DUYỆT [FACT]"],
        ["Doc 17", "17_Server_Deployment.docx", "Triển khai Native Go binary + systemd service, so sánh với Docker", "PHÊ DUYỆT [FACT]"],
        ["Doc 18", "18_Low_Resource_Server_Optimization.docx", "Bảng phân bổ ngân sách RAM VPS 1GB, tinh chỉnh Linux Kernel & Swap", "PHÊ DUYỆT [FACT]"],
        ["Doc 19", "19_Backup_and_Recovery.docx", "Chiến lược sao lưu quy tắc 3-2-1, cron dump MySQL & rclone R2", "PHÊ DUYỆT [FACT]"],
        ["Doc 20", "20_Performance_and_Scaling.docx", "Ước tính dung lượng từ 10 đến 1,000 người nghe đồng thời & roadmap mở rộng", "PHÊ DUYỆT [FACT]"],
        ["Doc 21", "21_Testing_Strategy.docx", "Chiến lược kiểm thử Unit, Integration, Media an toàn & k6 Load Test", "PHÊ DUYỆT [FACT]"],
        ["Doc 22", "22_MVP_Roadmap.docx", "Kế hoạch 14 giai đoạn triển khai chi tiết từng ngày", "PHÊ DUYỆT [FACT]"],
        ["Doc 23", "23_Data_Model_and_ERD.docx", "Mô hình ERD và mã nguồn DDL tạo 16 bảng MySQL", "PHÊ DUYỆT [FACT]"],
        ["Doc 24", "24_User_Flows.docx", "Đặc tả luồng người dùng Guest/User/Admin & State Machine Audio", "PHÊ DUYỆT [FACT]"],
        ["Doc 25", "25_Technical_Decision_Record.docx", "Biên bản ghi nhận 8 quyết định kỹ thuật cốt lõi (TDR/ADR)", "PHÊ DUYỆT [FACT]"],
        ["Doc Summary", "PROJECT_RESEARCH_SUMMARY.docx", "Bản tóm tắt báo cáo nghiên cứu khả thi toàn diện dự án", "PHÊ DUYỆT [FACT]"]
    ]
    add_table_data(doc, headers, data, [1.0, 2.5, 2.7, 1.0])

    add_heading_1(doc, "3. Tóm Lược Ràng Buộc Công Nghệ (Technology Guardrails)")
    doc.add_paragraph("• Frontend: HTML5 ngữ nghĩa + CSS3 Grid/Flexbox + Vanilla JS (ES6+ Modules) tuyệt đối không dùng framework nặng.")
    doc.add_paragraph("• Backend: Golang net/http + Chi v5 (Đóng gói 1 file binary duy nhất dưới 20MB).")
    doc.add_paragraph("• Database: MySQL 8.x InnoDB (utf8mb4, connection pool = 25, buffer pool = 256MB).")
    doc.add_paragraph("• Reverse Proxy & Streaming: Nginx với SSL Let's Encrypt và HTTP 206 qua X-Accel-Redirect / Static alias.")
    doc.add_paragraph("• Media Processing: FFmpeg (1 background worker, nice 19, -threads 1, giới hạn timeout 120s).")

    doc.save("docs/00_Master_System_Specification.docx")
    print("Saved docs/00_Master_System_Specification.docx")

def build_summary():
    doc = create_document_base("PROJECT_RESEARCH_SUMMARY")
    add_title(doc, "PROJECT RESEARCH & FEASIBILITY SUMMARY", "Báo Cáo Tóm Tắt Kết Quả Nghiên Cứu Khả Thi Dự Án Web Audio")
    
    add_heading_1(doc, "1. Đánh Giá Khả Thi Toàn Diện (Feasibility Assessment)")
    add_callout(doc,
        "KẾT LUẬN NGHIÊN CỨU: Dự án hoàn toàn khả thi về mặt kỹ thuật, kinh tế và pháp lý trên hạ tầng máy chủ chi phí thấp (VPS 1 vCPU, 1GB RAM) "
        "khi và chỉ khi áp dụng triệt để kiến trúc phân tách tĩnh Frontend lên Edge CDN và tận dụng zero-copy offloading của Nginx cho backend.",
        "[FACT]"
    )

    add_heading_1(doc, "2. Đánh Giá Rủi Ro Trọng Yếu & Biện Pháp Khống Chế")
    headers = ["Khu vực rủi ro", "Mô tả nguy cơ", "Hậu quả nếu xảy ra", "Biện pháp phòng ngừa chuẩn"]
    data = [
        ["Tài nguyên VPS cạn kiệt", "FFmpeg hoặc MySQL ngốn 100% RAM", "OOM Killer tiêu diệt tiến trình Go/MySQL", "Giới hạn worker = 1, thiết lập systemd MemoryMax, kích hoạt Swap"],
        ["Pháp lý YouTube", "Tải lậu nội dung YouTube vi phạm bản quyền", "Khiếu nại bản quyền, bị đình chỉ dịch vụ", "Tuyệt đối không trích xuất lậu; chỉ dùng nguồn nhạc tự do và hợp pháp"],
        ["Bảo mật phiên đăng nhập", "Lộ Access Token qua XSS ở Frontend", "Chiếm quyền điều khiển tài khoản", "Lưu trữ Access & Refresh Token trong HttpOnly Secure SameSite Cookie"],
        ["Tấn công DoS Stream", "Client request hàng ngàn stream bytes", "Cạn kiệt băng thông máy chủ", "Nginx limit_conn 20, limit_req_zone 20r/s, bật mp4_buffer_size"]
    ]
    add_table_data(doc, headers, data, [1.6, 1.8, 1.8, 2.0])

    add_heading_1(doc, "3. Khuyến Nghị Giai Đoạn Triển Khai (Implementation Guidance)")
    doc.add_paragraph("Đội ngũ kỹ thuật được yêu cầu nghiêm ngặt tuân thủ 14 giai đoạn triển khai trong tài liệu 22_MVP_Roadmap.docx. Tuyệt đối không nhảy cóc các giai đoạn migrate database và kiểm thử an ninh để đảm bảo độ tin cậy và an toàn vận hành cao nhất.")

    doc.save("docs/PROJECT_RESEARCH_SUMMARY.docx")
    print("Saved docs/PROJECT_RESEARCH_SUMMARY.docx")

if __name__ == "__main__":
    build_00_master()
    build_summary()
