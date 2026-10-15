# 03. ĐẶC TẢ REST API & TÍCH HỢP YOUTUBE
### Chi Tiết REST Endpoints, Khử Độc URL & Cơ Chế IFrame Player API

---

## 1. Quy Chuẩn Giao Tiếp & Envelope Chuẩn Hóa

* **Base URL:** `/api/v1`
* **Headers bắt buộc:** `Content-Type: application/json; charset=utf-8`

### Envelope chuẩn hóa:

```json
// Phản hồi thành công:
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "pageSize": 20, "total": 45 }
}

// Phản hồi thất bại:
{
  "success": false,
  "error": {
    "code": "DUPLICATE_VIDEO",
    "message": "Video này đã tồn tại trong thư viện",
    "details": { "existingAudioId": 12 }
  }
}
```

---

## 2. Bảng Danh Mục 13 Endpoints Cốt Lõi

| Method | Endpoint Path | Xác thực | Mô tả chức năng nghiệp vụ |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/audios/import-youtube` | User/Admin | Validate link YouTube, kiểm tra trùng lặp, lưu metadata & sinh Episode |
| `GET` | `/api/v1/audios` | Public | Danh sách Audio Library (Phân trang 20/trang, Lọc Category/Author/Tag) |
| `GET` | `/api/v1/audios/{id}` | Public | Chi tiết Audio (Metadata, Category, Tags, Tổng thời lượng) |
| `PUT` | `/api/v1/audios/{id}` | Owner/Admin | Cập nhật Category, Tags hoặc mô tả của Audio |
| `POST` | `/api/v1/audios/{id}/refresh` | Owner/Admin | Đồng bộ lại Metadata mới nhất từ YouTube oEmbed |
| `GET` | `/api/v1/audios/{id}/episodes` | Public | Danh sách các Episode logic (kèm mốc `start_seconds`, `end_seconds`) |
| `POST` | `/api/v1/audios/{id}/episodes/generate` | Owner/Admin | Tạo lại danh sách Episode theo block size mới (ví dụ 2h, 4h, 6h) |
| `GET` | `/api/v1/categories` | Public | Danh sách toàn bộ Category nội bộ (Cache in-memory) |
| `GET` | `/api/v1/tags` | Public | Danh sách các Tags phổ biến trong thư viện |
| `GET` | `/api/v1/users/me/progress` | Auth/Guest | Lấy toàn bộ danh sách audio đang nghe dở của người dùng |
| `GET` | `/api/v1/audios/{id}/progress` | Auth/Guest | Lấy vị trí nghe gần nhất của Audio/Episode để Resume |
| `PUT` | `/api/v1/progress` | Auth/Guest | Cập nhật vị trí nghe (định kỳ 60s, khi pause/seek/hide) |
| `POST` | `/api/v1/history` | Auth/Guest | Ghi nhận một lượt nghe hoàn thành vào bảng `listening_history` |

---

## 3. Khử Độc URL YouTube & Chống SSRF Bằng Regex

```go
// Regex cô lập chính xác 11 ký tự Base64 của YouTube Video ID
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
}
```
