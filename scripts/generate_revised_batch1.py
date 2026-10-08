import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.docx_builder import (
    create_document_base, add_title, add_heading_1, add_heading_2, 
    add_heading_3, add_callout, add_code_block, add_table_data
)

def build_01():
    doc = create_document_base("01_SYSTEM_OVERVIEW")
    add_title(doc, "01. SYSTEM OVERVIEW & ARCHITECTURAL EVOLUTION", "Tổng Quan Hệ Thống YouTube Audio Library & Mở Rộng Kiến Trúc")
    
    add_heading_1(doc, "1. Tiến Hóa Mục Tiêu & Phạm Vi Sản Phẩm (Product Evolution)")
    doc.add_paragraph(
        "Hệ thống đã nâng cấp từ mô hình nghe nhạc tạm thời theo phiên (URL -> Session -> Temporary Audio) "
        "thành một nền tảng THƯ VIỆN ÂM THANH YOUTUBE HOÀN CHỈNH (YouTube Audio Library Platform). "
        "Người dùng có thể nhập URL YouTube, hệ thống trích xuất metadata, phân loại Category/Genre, gán Tags, "
        "quản lý danh mục trong Audio Library, tự động chia nhỏ các video siêu dài (> 24 giờ) thành các Episode/Segment logic, "
        "tìm kiếm/lọc đa tiêu chí, đồng bộ tiến trình nghe và lưu trữ lịch sử nghe cá nhân."
    )
    add_callout(doc,
        "ĐỊNH NGHĨA CỐT LÕI (MANDATORY DEFINITION):\n"
        "1. KHÔNG PHẢI NỀN TẢNG HOSTING TỆP MP3: Hệ thống không tải về, không lưu trữ vĩnh viễn tệp âm thanh MP3 từ YouTube.\n"
        "2. PHÂN BIỆT METADATA VÀ NỘI DUNG: Database chỉ lưu trữ Metadata, Danh mục, Tags, Phân đoạn tập (Logical Episodes), Tiến trình (Progress) và Lịch sử (History).\n"
        "3. LOGICAL SEGMENTATION: Video 24h - 30h được chia thành các tập logic (mặc định 4 giờ/tập) dựa trên mốc thời gian (start_seconds, end_seconds). Không nhân bản tệp âm thanh vật lý.",
        "[FACT]"
    )

    add_heading_1(doc, "2. Hành Trình Người Dùng Toàn Diện (End-to-End User Journey)")
    doc.add_paragraph("• Bước 1 - Nhập & Nhận dạng: Người dùng dán URL YouTube tại trang Library -> Go Backend xác thực URL, tách Video ID (11 ký tự), kiểm tra trùng lặp (Duplicate Detection).")
    doc.add_paragraph("• Bước 2 - Phân loại & Khởi tạo: Người dùng chọn Thể loại (Category) từ backend, nhập Tags bổ sung -> Hệ thống lấy metadata (Title, Author, Duration, Thumbnail) và lưu vào MySQL.")
    doc.add_paragraph("• Bước 3 - Phân đoạn tự động: Nếu video dài > 24 giờ (hoặc theo cấu hình), hệ thống tự động sinh các Episode logic (4 giờ/tập) tương ứng.")
    doc.add_paragraph("• Bước 4 - Duyệt & Tìm kiếm: Audio hiển thị trên thư viện với Card trực quan (Tiến trình %, Tập đang nghe dở, Thời lượng, Category). Hỗ trợ tìm kiếm FULLTEXT và lọc.")
    doc.add_paragraph("• Bước 5 - Phát & Đồng bộ: Player phát nội dung thông qua YouTube IFrame Player API. Tiến trình tự động lưu mỗi 60 giây và khi đổi trạng thái.")
    doc.add_paragraph("• Bước 6 - Lịch sử nghe: Ghi nhận nhật ký nghe vào listening_history phục vụ thống kê cá nhân.")

    add_heading_1(doc, "3. Bảng Phân Tích Hiện Trạng & Đề Xuất Thay Đổi")
    headers = ["Thành phần", "Kiến trúc cũ (Session-based)", "Kiến trúc mới (Library-based)", "Lý do kỹ thuật & Ràng buộc"]
    data = [
        ["Mô hình dữ liệu", "Chỉ có 4 bảng tạm: session, progress", "9 bảng chuẩn hóa: audios, categories, tags, episodes, progress, history", "Quản lý thư viện bền vững, phân loại sâu"],
        ["Xử lý video dài", "Phát nguyên khối 1 video", "Logical Episodes (mặc định block 4h)", "Video > 24h không bị tràn seek bar, dễ quản lý"],
        ["Tìm kiếm & Lọc", "Chỉ tìm kiếm đơn giản", "Server-side Search & Multi-filter", "Phân trang LIMIT/OFFSET, lọc Category/Author"],
        ["Tiến trình & Lịch sử", "Chỉ lưu progress vị trí cuối", "Tách biệt Progress (đang nghe) & History (đã nghe)", "Phục vụ tính năng Resume tập và xem lại lịch sử"],
        ["Tài nguyên VPS", "1 vCPU, 1GB RAM", "Duy trì 1 vCPU, 1GB RAM", "Logical Segments 0MB đĩa, 0% CPU chuyển mã"]
    ]
    add_table_data(doc, headers, data, [1.5, 1.8, 2.0, 1.9])

    doc.save("docs/01_SYSTEM_OVERVIEW.docx")
    print("Saved docs/01_SYSTEM_OVERVIEW.docx")

def build_02():
    doc = create_document_base("02_BUSINESS_REQUIREMENTS")
    add_title(doc, "02. BUSINESS REQUIREMENTS SPECIFICATION", "Yêu Cầu Nghiệp Vụ, Quản Lý Thư Viện Âm Thanh & Phân Đoạn Video Dài")
    
    add_heading_1(doc, "1. Mục Tiêu Nghiệp Vụ Trọng Tâm (Business Objectives)")
    doc.add_paragraph("1. Cho phép người dùng chuyển đổi bất kỳ nội dung YouTube nào (Audiobook, Truyện tiên hiệp, Podcast, Nhạc thiền) thành giao diện Audio Book / Podcast chuyên nghiệp.")
    doc.add_paragraph("2. Giải quyết triệt để bài toán nghe video dài (10 giờ - 30 giờ) mà YouTube không tối ưu: Chia nhỏ thành các tập 4 giờ, nhớ chính xác vị trí nghe của từng tập.")
    doc.add_paragraph("3. Tổ chức kho nội dung khoa học qua hệ thống Thể loại (Category) chuẩn và Thẻ gắn (Tags) linh hoạt, hỗ trợ tìm kiếm tức thì.")
    doc.add_paragraph("4. Tối ưu chi phí vận hành máy chủ xuống mức gần 0đ: Không tốn chi phí lưu trữ tệp âm thanh (GB/TB storage) hay băng thông phát trực tuyến (Egress bandwidth).")

    add_heading_1(doc, "2. Đặc Tả Danh Mục Thể Loại Nghiệp Vụ (Business Categories)")
    doc.add_paragraph("Hệ thống cung cấp danh mục thể loại chuẩn hóa lấy trực tiếp từ Backend:")
    doc.add_paragraph("• Thể loại văn học mạng / Truyện audio: Tiên hiệp, Huyền huyễn, Đô thị, Khoa huyễn, Lịch sử, Quân sự, Ngôn tình, Trinh thám, Kinh dị.")
    doc.add_paragraph("• Thể loại tổng hợp: Podcast, Truyện ngắn, Kiến thức, Review sách, Âm nhạc, Game, Khác.")
    add_callout(doc,
        "YÊU CẦU BẮT BUỘC: Frontend tuyệt đối không hard-code danh mục thể loại. "
        "Mọi lựa chọn Category phải được nạp động từ GET /api/v1/categories để đảm bảo khả năng mở rộng từ phía quản trị viên.",
        "[RECOMMENDATION]"
    )

    add_heading_1(doc, "3. Nguyên Lý Phân Đoạn Tập 4 Giờ Cho Video Dài (Episode Splitting Business Rules)")
    doc.add_paragraph("Khi video có thời lượng lớn (đặc biệt duration > 24 giờ):")
    doc.add_paragraph("• Khối thời gian mặc định: 14,400 giây (4 giờ).")
    doc.add_paragraph("• Tự động tính toán số tập: Total Episodes = ceil(Total Duration / Block Size).")
    doc.add_paragraph("• Tập cuối cùng: Nhận khoảng thời gian còn lại (start = (N-1)*Block Size, end = Total Duration).")
    doc.add_paragraph("• Tự động chuyển tập (Auto-next): Khi người nghe hoàn thành 100% thời lượng của Tập N, hệ thống tự động chuyển sang Tập N+1 và phát từ 00:00:00.")

    doc.save("docs/02_BUSINESS_REQUIREMENTS.docx")
    print("Saved docs/02_BUSINESS_REQUIREMENTS.docx")

def build_03():
    doc = create_document_base("03_FUNCTIONAL_REQUIREMENTS")
    add_title(doc, "03. FUNCTIONAL REQUIREMENTS SPECIFICATION", "Chi Tiết Yêu Cầu Chức Năng Thư Viện, Phân Đoạn & Lịch Sử")
    
    add_heading_1(doc, "1. Phân Hệ Quản Lý Thư Viện (Audio Library Module)")
    doc.add_paragraph("• FR-LIB-01: Nhận URL YouTube, kiểm tra tính hợp lệ và trích xuất Video ID 11 ký tự.")
    doc.add_paragraph("• FR-LIB-02: Kiểm tra trùng lặp (Duplicate Check) qua Video ID. Nếu đã tồn tại, hiển thị thông báo và điều hướng đến Audio hiện có.")
    doc.add_paragraph("• FR-LIB-03: Trích xuất metadata tự động (Title, Author/Channel, Channel ID, Duration, Thumbnail).")
    doc.add_paragraph("• FR-LIB-04: Cho phép gán Category và nhiều Tags khi nhập hoặc chỉnh sửa sau này.")
    doc.add_paragraph("• FR-LIB-05: Cung cấp tính năng Refresh Metadata thủ công khi có thay đổi từ phía YouTube.")

    add_heading_1(doc, "2. Phân Hệ Phân Đoạn Tập (Episode & Segment Module)")
    doc.add_paragraph("• FR-EP-01: Tự động phát hiện video có thời lượng > 24 giờ và hiển thị cảnh báo, đề xuất chia tập.")
    doc.add_paragraph("• FR-EP-02: Cho phép người dùng tùy chọn quy tắc chia: Không chia, 1h, 2h, 4h (mặc định), 6h, 8h hoặc tùy chỉnh.")
    doc.add_paragraph("• FR-EP-03: Tạo danh sách các Logical Episodes trong cơ sở dữ liệu với start_seconds, end_seconds chuẩn xác.")
    doc.add_paragraph("• FR-EP-04: Hiển thị danh sách tập tại trang chi tiết Audio, đánh dấu nổi bật tập đang nghe dở.")

    add_heading_1(doc, "3. Phân Hệ Trình Phát & Tiến Trình (Player & Progress Module)")
    doc.add_paragraph("• FR-PLY-01: Phát âm thanh qua YouTube IFrame Player API với giao diện Audio Card trực quan.")
    doc.add_paragraph("• FR-PLY-02: Giới hạn phạm vi phát của Episode trong khoảng [start_seconds, end_seconds]. Khi tua vượt mốc, tự động điều chỉnh hoặc chuyển tập.")
    doc.add_paragraph("• FR-PLY-03: Đồng bộ vị trí nghe (listening_progress) lên server mỗi 60 giây khi đang PLAYING, khi PAUSE, SEEK, hoặc chuyển tab.")
    doc.add_paragraph("• FR-PLY-04: Tính năng Resume thông minh: Mở đúng tập và đúng số giây nghe dở gần nhất.")
    doc.add_paragraph("• FR-PLY-05: Tự động ghi nhận lịch sử nghe (listening_history) khi nghe trên 30 giây.")

    add_heading_1(doc, "4. Phân Hệ Tìm Kiếm & Lọc (Search & Filter Module)")
    doc.add_paragraph("• FR-SRC-01: Tìm kiếm toàn văn (FULLTEXT) trên Tiêu đề, Tác giả, Mô tả và Thẻ (Tags).")
    doc.add_paragraph("• FR-SRC-02: Lọc đa tiêu chí: Thể loại (Category), Tác giả (Author), Thẻ (Tag), Khoảng thời lượng, Trạng thái nghe (Chưa nghe, Đang nghe, Hoàn thành).")
    doc.add_paragraph("• FR-SRC-03: Phân trang bắt buộc (Pagination) với limit mặc định 20 bản ghi/trang.")

    doc.save("docs/03_FUNCTIONAL_REQUIREMENTS.docx")
    print("Saved docs/03_FUNCTIONAL_REQUIREMENTS.docx")

def build_04():
    doc = create_document_base("04_DATABASE_DESIGN")
    add_title(doc, "04. MYSQL DATABASE DESIGN & SCHEMA SPECIFICATION", "Đặc Tả Cơ Sở Dữ Liệu MySQL 8.x Cho Audio Library, Episodes & History")
    
    add_heading_1(doc, "1. Nguyên Lý Thiết Kế Schema Đạt Chuẩn 3NF")
    doc.add_paragraph(
        "Schema được thiết kế tối ưu trên MySQL 8.x InnoDB, UTF-8 (utf8mb4_0900_ai_ci). "
        "Quan hệ giữa Audio và Tags là quan hệ Many-to-Many thông qua bảng trung gian audio_tags. "
        "Quan hệ giữa Audio và Episodes là One-to-Many với ràng buộc UNIQUE KEY (audio_id, episode_number)."
    )
    
    add_heading_1(doc, "2. Mã Nguồn DDL Toàn Bộ 8 Bảng Thực Thể Chuẩn")
    add_code_block(doc,
"""-- 1. Bảng Người dùng
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    is_guest BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Bảng Thể loại (Categories)
CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Bảng Thẻ (Tags)
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

-- 7. Bảng Tiến trình nghe (Listening Progress)
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

-- 8. Bảng Lịch sử nghe (Listening History)
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

    doc.save("docs/04_DATABASE_DESIGN.docx")
    print("Saved docs/04_DATABASE_DESIGN.docx")

if __name__ == "__main__":
    build_01()
    build_02()
    build_03()
    build_04()
