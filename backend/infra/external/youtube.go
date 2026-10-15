package external

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"audio-app-backend/core/logic"
)

type YouTubeMetadata struct {
	VideoID           string `json:"videoId"`
	Title             string `json:"title"`
	Author            string `json:"author"`
	ThumbnailURL      string `json:"thumbnailUrl"`
	DurationSeconds   int    `json:"durationSeconds"`
	FormattedDuration string `json:"formattedDuration"`
}

type oEmbedResponse struct {
	Title        string `json:"title"`
	AuthorName   string `json:"author_name"`
	ThumbnailURL string `json:"thumbnail_url"`
}

// FetchYouTubeMetadata lấy metadata và thời lượng video (0% quota API)
func FetchYouTubeMetadata(videoID string) (*YouTubeMetadata, error) {
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	targetURL := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)
	apiURL := fmt.Sprintf("https://noembed.com/embed?url=%s", targetURL)

	var title, author, thumb string

	req, err := http.NewRequest(http.MethodGet, apiURL, nil)
	if err == nil {
		req.Header.Set("User-Agent", "YouTubeAudioApp/2.0")
		resp, err := client.Do(req)
		if err == nil && resp.StatusCode == http.StatusOK {
			defer resp.Body.Close()
			var data oEmbedResponse
			if err := json.NewDecoder(resp.Body).Decode(&data); err == nil && data.Title != "" {
				title = data.Title
				author = data.AuthorName
				thumb = data.ThumbnailURL
			}
		}
	}

	// Fallback direct oEmbed nếu noembed chưa có dữ liệu
	if title == "" {
		directMeta, _ := fetchDirectOEmbed(videoID)
		if directMeta != nil {
			title = directMeta.Title
			author = directMeta.Author
			thumb = directMeta.ThumbnailURL
		}
	}

	if title == "" {
		title = fmt.Sprintf("Audio YouTube - %s", videoID)
	}
	if author == "" {
		author = "YouTube Creator"
	}
	if thumb == "" {
		thumb = fmt.Sprintf("https://img.youtube.com/vi/%s/hqdefault.jpg", videoID)
	}

	// Lấy thời lượng thực tế từ trang watch HTML
	duration := fetchWatchPageDuration(videoID)
	if duration <= 0 {
		duration = logic.InferDuration(title, 0)
	}
	if duration <= 0 {
		duration = 57600 // 16h mặc định
	}

	return &YouTubeMetadata{
		VideoID:           videoID,
		Title:             title,
		Author:            author,
		ThumbnailURL:      thumb,
		DurationSeconds:   duration,
		FormattedDuration: logic.FormatDuration(duration),
	}, nil
}

func fetchDirectOEmbed(videoID string) (*YouTubeMetadata, error) {
	client := &http.Client{Timeout: 5 * time.Second}
	apiURL := fmt.Sprintf("https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=%s&format=json", videoID)
	resp, err := client.Get(apiURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		return defaultMetadata(videoID), nil
	}
	defer resp.Body.Close()

	var data oEmbedResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil || data.Title == "" {
		return defaultMetadata(videoID), nil
	}

	return &YouTubeMetadata{
		VideoID:      videoID,
		Title:        data.Title,
		Author:       data.AuthorName,
		ThumbnailURL: fmt.Sprintf("https://img.youtube.com/vi/%s/hqdefault.jpg", videoID),
	}, nil
}

func fetchWatchPageDuration(videoID string) int {
	client := &http.Client{Timeout: 6 * time.Second}
	url := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return 0
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept-Language", "vi,en;q=0.9")

	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return 0
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024))
	if err != nil {
		return 0
	}
	return logic.ExtractDurationFromHTML(string(bodyBytes))
}

func defaultMetadata(videoID string) *YouTubeMetadata {
	return &YouTubeMetadata{
		VideoID:           videoID,
		Title:             fmt.Sprintf("Audio YouTube - %s", videoID),
		Author:            "YouTube Creator",
		ThumbnailURL:      fmt.Sprintf("https://img.youtube.com/vi/%s/hqdefault.jpg", videoID),
		DurationSeconds:   57600,
		FormattedDuration: "16h 00m",
	}
}

// InferDurationFromMetadata tích hợp suy luận thời lượng từ Title và metadata
func InferDurationFromMetadata(meta *YouTubeMetadata, customDuration int) int {
	if meta != nil && meta.DurationSeconds > 0 {
		// Nếu client gửi số quá nhỏ bất thường (< 60s) hoặc 36000 trong khi video thực tế dài, ưu tiên thời lượng thực tế
		if customDuration < 60 || customDuration == 36000 {
			return meta.DurationSeconds
		}
		// Nếu client gửi thời lượng xấp xỉ thời lượng thực tế (chênh lệch dưới 60s do làm tròn phút khi parse), ưu tiên số giây chính xác của video
		diff := customDuration - meta.DurationSeconds
		if diff < 0 {
			diff = -diff
		}
		if diff < 60 {
			return meta.DurationSeconds
		}
		return customDuration
	}
	if customDuration > 0 {
		return customDuration
	}
	if meta != nil {
		return logic.InferDuration(meta.Title, 57600)
	}
	return 57600
}
