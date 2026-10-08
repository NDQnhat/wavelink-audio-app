import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.docx_builder import (
    create_document_base, add_title, add_heading_1, add_heading_2, 
    add_heading_3, add_callout, add_code_block, add_table_data
)

def build_05():
    doc = create_document_base("05_API_SPECIFICATION")
    add_title(doc, "05. REST API SPECIFICATION", "Quy Chuẩn RESTful API Cho YouTube Audio Library & Episodes")
    
    add_heading_1(doc, "1. Tiêu Chuẩn Giao Tiếp & Envelope Chuẩn")
    doc.add_paragraph("• Base URL: https://api.example.com/api/v1")
    doc.add_paragraph("• Content-Type: application/json; charset=utf-8")
    doc.add_paragraph("• Format Envelope:")
    add_code_block(doc,
"""// Thành công:
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "pageSize": 20, "total": 45 }
}

// Thất bại:
{
  "success": false,
  "error": {
    "code": "DUPLICATE_VIDEO",
    "message": "Video này đã tồn tại trong thư viện",
    "details": { "existingAudioId": 12 }
  }
}"""
    )

    add_heading_1(doc, "2. Bảng Danh Mục Endpoints Chi Tiết")
    headers = ["Phương thức", "Endpoint", "Xác thực", "Mô tả nghiệp vụ"]
    data = [
        ["POST", "/api/v1/audios/import-youtube", "User/Admin", "Nhập link YouTube, validate, kiểm tra trùng lặp, lưu metadata & sinh Episode"],
        ["GET", "/api/v1/audios", "Public", "Lấy danh sách Audio Library (Phân trang, Lọc Category/Author, Sort)"],
        ["GET", "/api/v1/audios/{id}", "Public", "Chi tiết Audio (kèm thông tin Category, Tags, Tổng thời lượng)"],
        ["PUT", "/api/v1/audios/{id}", "Owner/Admin", "Cập nhật Category, Tags hoặc mô tả của Audio"],
        ["POST", "/api/v1/audios/{id}/refresh", "Owner/Admin", "Đồng bộ lại Metadata mới nhất từ YouTube"],
        ["GET", "/api/v1/audios/{id}/episodes", "Public", "Danh sách các Episode logic kèm mốc start/end của Audio"],
        ["POST", "/api/v1/audios/{id}/episodes/generate", "Owner/Admin", "Tạo lại danh sách Episode theo cấu hình block size mới"],
        ["GET", "/api/v1/categories", "Public", "Danh sách toàn bộ Category nội bộ (Cache in-memory)"],
        ["GET", "/api/v1/tags", "Public", "Danh sách các Tags phổ biến trong thư viện"],
        ["GET", "/api/v1/users/me/progress", "Auth/Guest", "Lấy toàn bộ danh sách audio đang nghe dở của người dùng"],
        ["GET", "/api/v1/audios/{id}/progress", "Auth/Guest", "Lấy vị trí nghe gần nhất của Audio/Episode để Resume"],
        ["PUT", "/api/v1/progress", "Auth/Guest", "Cập nhật tiến trình nghe (định kỳ 60s, khi pause/seek/hide)"],
        ["POST", "/api/v1/history", "Auth/Guest", "Ghi nhận một lượt nghe vào bảng listening_history"]
    ]
    add_table_data(doc, headers, data, [1.0, 2.4, 1.3, 2.3])

    doc.save("docs/05_API_SPECIFICATION.docx")
    print("Saved docs/05_API_SPECIFICATION.docx")

def build_06():
    doc = create_document_base("06_AUDIO_PLAYBACK_ARCHITECTURE")
    add_title(doc, "06. AUDIO PLAYBACK ARCHITECTURE", "Kiến Trúc Phát Âm Thanh, IFrame Player API & Giới Hạn Transcoding")
    
    add_heading_1(doc, "1. Phân Tích Kỹ Thuật 14 Câu Hỏi Phát Âm Thanh")
    doc.add_paragraph("1. YouTube API có cho phép lấy raw audio stream không? [FACT] KHÔNG. YouTube Data API v3 và các API chính thức của Google không cung cấp direct URL cho audio stream độc lập.")
    doc.add_paragraph("2. Có được cache/lưu audio không? [POLICY LIMITATION] KHÔNG. Điều khoản cấm lưu trữ, tải xuống nội dung nghe nhìn từ YouTube.")
    doc.add_paragraph("3. IFrame Player API đáp ứng audio UI ở mức nào? [FACT] Rất tốt. Cung cấp đầy đủ các hàm playVideo(), pauseVideo(), seekTo(seconds), getCurrentTime(), getDuration(), onStateChange.")
    doc.add_paragraph("4. Có thể ẩn video UI nhưng vẫn tuân thủ policy không? [ANALYSIS] IFrame Player API cho phép đặt kích thước nhỏ gọn (ví dụ 200x200 hoặc đặt ẩn thị giác phía sau bìa Album Artwork). Để tuân thủ Developer Policies, không được can thiệp xóa logo YouTube hoặc chặn quảng cáo của tác giả.")
    doc.add_paragraph("5. Nếu cần MP3 thực sự thì nguồn nào hợp lệ? [FACT] Chỉ dành riêng cho nội dung người dùng tự tải lên (User-owned content), nhạc Public Domain hoặc Creative Commons có cấp phép.")
    doc.add_paragraph("6. Video 24h xử lý ra sao? [RECOMMENDATION] Áp dụng 100% Logical Episodes. Không tạo 7 bản sao MP3 vật lý chỉ để phục vụ việc chia tập!")

    add_heading_1(doc, "2. Bảng So Sánh Quyết Định Kiến Trúc Playback")
    headers = ["Tiêu chí kỹ thuật", "Option A: YouTube -> MP3 Vật lý", "Option B: Logical Episodes + IFrame API (CHỌN)", "Option C: Pipe FFmpeg Transcoding"]
    data = [
        ["CPU Server VPS 1 core", "Spike 100% CPU hàng giờ", "0% CPU (Tải thuộc về Google CDN)", "Cao: 40% - 70% CPU cho mỗi listener"],
        ["Bộ nhớ RAM", "Dễ gây tràn RAM / OOM", "Dưới 50MB RAM ổn định", "Tốn buffer RAM cho pipe"],
        ["Dung lượng đĩa (Disk)", "Tốn 500MB - 2GB / video 24h", "0 Byte ổ đĩa (Chỉ lưu mốc giây trong DB)", "Tốn bộ đệm đĩa tạm thời"],
        ["Băng thông máy chủ", "Hàng chục Mbps egress", "0 Mbps băng thông VPS", "Băng thông streaming cao"],
        ["Độ trễ phát nhạc", "Chờ 10 - 30 phút convert", "Tức thì < 500ms", "Chờ buffer 3 - 5 giây"],
        ["Tuân thủ bản quyền", "Vi phạm nghiêm trọng ToS", "100% Tuân thủ điều khoản YouTube", "Chỉ hợp pháp với file tự sở hữu"]
    ]
    add_table_data(doc, headers, data, [1.6, 1.8, 2.0, 1.6])

    doc.save("docs/06_AUDIO_PLAYBACK_ARCHITECTURE.docx")
    print("Saved docs/06_AUDIO_PLAYBACK_ARCHITECTURE.docx")

def build_07():
    doc = create_document_base("07_EPISODE_SEGMENT_DESIGN")
    add_title(doc, "07. EPISODE & SEGMENT SYSTEM DESIGN", "Thiết Kế Hệ Thống Phân Đoạn Tập Logic Cho Video Siêu Dài (>24 Giờ)")
    
    add_heading_1(doc, "1. Bài Toán Kỹ Thuật Với Video Siêu Dài")
    doc.add_paragraph(
        "Nhiều nội dung audiobook, truyện tiên hiệp, podcast tổng hợp trên YouTube có thời lượng từ 10 giờ đến hơn 24 giờ (thậm chí 30 giờ). "
        "Việc để một thanh seek bar duy nhất kéo dài 30 giờ khiến trải nghiệm người dùng rất tồi tệ (chạm nhẹ ngón tay có thể nhảy lệch 30 phút), "
        "dễ mất dấu vị trí nghe và khó định vị phân đoạn."
    )
    add_callout(doc,
        "GIẢI PHÁP LOGICAL SEGMENTS:\n"
        "Hệ thống tự động chia video thành các Episode logic dựa trên mốc thời gian bắt đầu (start_seconds) và kết thúc (end_seconds).\n"
        "Mỗi Episode hoạt động như một track độc lập trên giao diện người dùng, nhưng cùng trỏ về một youtube_video_id duy nhất.",
        "[FACT]"
    )

    add_heading_1(doc, "2. Thuật Toán Sinh Episode Tự Động Trong Golang")
    add_code_block(doc,
"""// Cấu hình kích thước block mặc định (4 giờ = 14400 giây)
const DefaultEpisodeDuration = 14400 // 4 * 3600

type Episode struct {
    EpisodeNumber int    `json:"episodeNumber"`
    Title         string `json:"title"`
    StartSeconds  int    `json:"startSeconds"`
    EndSeconds    int    `json:"endSeconds"`
    Duration      int    `json:"duration"`
}

func GenerateLogicalEpisodes(totalDuration int, blockSize int) []Episode {
    if blockSize <= 0 {
        blockSize = DefaultEpisodeDuration
    }
    // Nếu video ngắn hơn hoặc bằng blockSize, chỉ có 1 tập
    if totalDuration <= blockSize {
        return []Episode{{
            EpisodeNumber: 1,
            Title:         "Tập 1",
            StartSeconds:  0,
            EndSeconds:    totalDuration,
            Duration:      totalDuration,
        }}
    }

    var episodes []Episode
    numEpisodes := (totalDuration + blockSize - 1) / blockSize // Phép chia làm tròn lên (ceil)

    for i := 0; i < numEpisodes; i++ {
        start := i * blockSize
        end := (i + 1) * blockSize
        if end > totalDuration {
            end = totalDuration
        }
        episodes = append(episodes, Episode{
            EpisodeNumber: i + 1,
            Title:         fmt.Sprintf("Tập %d (%s - %s)", i+1, formatTime(start), formatTime(end)),
            StartSeconds:  start,
            EndSeconds:    end,
            Duration:      end - start,
        })
    }
    return episodes
}"""
    )

    add_heading_1(doc, "3. Cơ Chế Auto-Next Episode & Bound Checking")
    doc.add_paragraph("Khi người dùng nghe trong Episode N:")
    doc.add_paragraph("• Giới hạn Seek: Thanh trượt của Episode N chỉ hiển thị trong phạm vi thời lượng của tập đó (0 -> episode.duration). Khi tua đến giây X trong tập, vị trí thực trên YouTube là: actualTime = episode.start_seconds + X.")
    doc.add_paragraph("• Sự kiện hoàn thành (Episode Finished): Khi player.getCurrentTime() >= episode.end_seconds, player tự động đánh dấu completed = true cho Episode N, cập nhật Episode N+1, seekTo(episode_next.start_seconds) và tiếp tục phát.")

    doc.save("docs/07_EPISODE_SEGMENT_DESIGN.docx")
    print("Saved docs/07_EPISODE_SEGMENT_DESIGN.docx")

def build_08():
    doc = create_document_base("08_SEARCH_FILTER_DESIGN")
    add_title(doc, "08. SEARCH & FILTER ARCHITECTURE", "Thiết Kế Tìm Kiếm Toàn Văn, Đa Tiêu Chí & Phân Trang Hiệu Suất Cao")
    
    add_heading_1(doc, "1. Chiến Lược Tìm Kiếm Server-Side (Không Load Toàn Bộ Dữ Liệu Về Client)")
    doc.add_paragraph(
        "Để đảm bảo máy chủ yếu không bị quá tải bộ nhớ và điện thoại người dùng không bị đơ giật khi thư viện có hàng nghìn bài, "
        "tất cả thao tác Tìm kiếm và Lọc bắt buộc phải thực thi tại Backend thông qua MySQL và phân trang cứng (Pagination)."
    )

    add_heading_1(doc, "2. Câu Lệnh Truy Vấn MySQL Tối Ưu Cho Tìm Kiếm & Lọc")
    add_code_block(doc,
"""SELECT 
    v.id, v.youtube_video_id, v.title, v.author_name, v.thumbnail_url, 
    v.duration_seconds, c.name AS category_name,
    COUNT(e.id) AS total_episodes,
    lp.position_seconds AS last_position,
    lp.episode_id AS last_episode_id,
    lp.progress_percent
FROM youtube_videos v
LEFT JOIN categories c ON v.category_id = c.id
LEFT JOIN episodes e ON v.id = e.audio_id
LEFT JOIN listening_progress lp ON v.id = lp.audio_id AND lp.user_id = ?
WHERE v.status = 'ACTIVE'
  -- Điều kiện lọc Category (nếu có)
  AND (? IS NULL OR v.category_id = ?)
  -- Điều kiện lọc Tìm kiếm FULLTEXT (nếu có)
  AND (? IS NULL OR MATCH(v.title, v.author_name) AGAINST(? IN NATURAL LANGUAGE MODE))
GROUP BY v.id, lp.id
ORDER BY v.created_at DESC
LIMIT 20 OFFSET 0;"""
    )

    doc.save("docs/08_SEARCH_FILTER_DESIGN.docx")
    print("Saved docs/08_SEARCH_FILTER_DESIGN.docx")

if __name__ == "__main__":
    build_05()
    build_06()
    build_07()
    build_08()
