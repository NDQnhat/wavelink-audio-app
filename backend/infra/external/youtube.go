package external

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
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

type innertubeClientPayload struct {
	VideoID string `json:"videoId"`
	Context struct {
		Client struct {
			ClientName        string `json:"clientName"`
			ClientVersion     string `json:"clientVersion"`
			AndroidSdkVersion int    `json:"androidSdkVersion,omitempty"`
			Hl                string `json:"hl"`
			Gl                string `json:"gl"`
		} `json:"client"`
	} `json:"context"`
}

type innertubePlayerResponse struct {
	PlayabilityStatus struct {
		Status string `json:"status"`
		Reason string `json:"reason"`
	} `json:"playabilityStatus"`
	VideoDetails struct {
		VideoID       string `json:"videoId"`
		Title         string `json:"title"`
		LengthSeconds string `json:"lengthSeconds"`
		Author        string `json:"author"`
		Thumbnail     struct {
			Thumbnails []struct {
				URL string `json:"url"`
			} `json:"thumbnails"`
		} `json:"thumbnail"`
	} `json:"videoDetails"`
}

// FetchYouTubeMetadata lấy metadata và thời lượng video chính xác 100% bằng đa chiến lược (Multi-strategy)
func FetchYouTubeMetadata(videoID string) (*YouTubeMetadata, error) {
	trimmedID := strings.TrimSpace(videoID)
	if trimmedID == "" {
		return defaultMetadata(videoID), fmt.Errorf("video ID rỗng")
	}

	var title, author, thumb string
	var duration int

	// Chiến lược 1: Thử gọi YouTube Data API v3 nếu có YOUTUBE_API_KEY
	if apiKey := os.Getenv("YOUTUBE_API_KEY"); apiKey != "" {
		if meta, err := fetchYouTubeDataAPI(trimmedID, apiKey); err == nil && meta != nil {
			if meta.DurationSeconds > 0 {
				return meta, nil
			}
			title = meta.Title
			author = meta.Author
			thumb = meta.ThumbnailURL
		}
	}

	// Chiến lược 2: Gọi YouTube Innertube API v1 (0% quota, không bị chặn bởi Cloudflare/Datacenter trên Render)
	if meta := fetchInnertubeProfiles(trimmedID); meta != nil {
		if title == "" && meta.Title != "" {
			title = meta.Title
		}
		if author == "" && meta.Author != "" {
			author = meta.Author
		}
		if thumb == "" && meta.ThumbnailURL != "" {
			thumb = meta.ThumbnailURL
		}
		if meta.DurationSeconds > 0 {
			duration = meta.DurationSeconds
		}
	}

	// Chiến lược 3: Nếu title/author/thumb chưa có, dùng oEmbed (noembed + direct)
	if title == "" || author == "" || thumb == "" {
		oembedMeta := fetchOEmbedMetadata(trimmedID)
		if oembedMeta != nil {
			if title == "" && oembedMeta.Title != "" {
				title = oembedMeta.Title
			}
			if author == "" && oembedMeta.Author != "" {
				author = oembedMeta.Author
			}
			if thumb == "" && oembedMeta.ThumbnailURL != "" {
				thumb = oembedMeta.ThumbnailURL
			}
		}
	}

	// Chiến lược 4: Nếu duration vẫn chưa có, thử cào Watch HTML page
	if duration <= 0 {
		duration = fetchWatchPageDuration(trimmedID)
	}

	// Chiến lược 5: Thử bóc tách thời lượng ghi trong tiêu đề (ví dụ: "10 Tiếng", "2 Giờ")
	if duration <= 0 && title != "" {
		duration = logic.InferDuration(title, 0)
	}

	// Hoàn thiện dữ liệu mặc định an toàn
	if title == "" {
		title = fmt.Sprintf("Audio YouTube - %s", trimmedID)
	}
	if author == "" {
		author = "YouTube Creator"
	}
	if thumb == "" {
		thumb = fmt.Sprintf("https://img.youtube.com/vi/%s/hqdefault.jpg", trimmedID)
	}

	formattedDur := ""
	if duration > 0 {
		formattedDur = logic.FormatDuration(duration)
	}

	return &YouTubeMetadata{
		VideoID:           trimmedID,
		Title:             title,
		Author:            author,
		ThumbnailURL:      thumb,
		DurationSeconds:   duration,
		FormattedDuration: formattedDur,
	}, nil
}

// fetchInnertubeProfiles thử lần lượt các client profile của Innertube để vượt qua mọi rào cản IP/bot-check
func fetchInnertubeProfiles(videoID string) *YouTubeMetadata {
	client := &http.Client{Timeout: 6 * time.Second}

	profiles := []struct {
		clientName    string
		clientVersion string
		androidSDKVer int
		userAgent     string
	}{
		{
			clientName:    "WEB",
			clientVersion: "2.20240101.01.00",
			userAgent:     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		},
		{
			clientName:    "ANDROID",
			clientVersion: "19.09.37",
			androidSDKVer: 30,
			userAgent:     "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
		},
		{
			clientName:    "IOS",
			clientVersion: "19.09.1",
			userAgent:     "com.google.ios.youtube/19.09.1 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
		},
	}

	for _, p := range profiles {
		payload := innertubeClientPayload{
			VideoID: videoID,
		}
		payload.Context.Client.ClientName = p.clientName
		payload.Context.Client.ClientVersion = p.clientVersion
		payload.Context.Client.AndroidSdkVersion = p.androidSDKVer
		payload.Context.Client.Hl = "vi"
		payload.Context.Client.Gl = "VN"

		bodyBytes, err := json.Marshal(payload)
		if err != nil {
			continue
		}

		req, err := http.NewRequest(http.MethodPost, "https://www.youtube.com/youtubei/v1/player", bytes.NewReader(bodyBytes))
		if err != nil {
			continue
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("User-Agent", p.userAgent)

		resp, err := client.Do(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			if resp != nil {
				_ = resp.Body.Close()
			}
			continue
		}

		var innertubeResp innertubePlayerResponse
		err = json.NewDecoder(resp.Body).Decode(&innertubeResp)
		_ = resp.Body.Close()
		if err != nil {
			continue
		}

		lengthSec, _ := strconv.Atoi(innertubeResp.VideoDetails.LengthSeconds)
		title := strings.TrimSpace(innertubeResp.VideoDetails.Title)
		author := strings.TrimSpace(innertubeResp.VideoDetails.Author)
		thumb := ""
		if len(innertubeResp.VideoDetails.Thumbnail.Thumbnails) > 0 {
			// Lấy thumbnail chất lượng cao nhất ở cuối mảng
			thumb = innertubeResp.VideoDetails.Thumbnail.Thumbnails[len(innertubeResp.VideoDetails.Thumbnail.Thumbnails)-1].URL
		}

		// Nếu lấy được lengthSec hoặc title hợp lệ
		if lengthSec > 0 || title != "" {
			return &YouTubeMetadata{
				VideoID:           videoID,
				Title:             title,
				Author:            author,
				ThumbnailURL:      thumb,
				DurationSeconds:   lengthSec,
				FormattedDuration: logic.FormatDuration(lengthSec),
			}
		}
	}

	return nil
}

// fetchYouTubeDataAPI gọi Google YouTube Data API v3 nếu có API key
func fetchYouTubeDataAPI(videoID, apiKey string) (*YouTubeMetadata, error) {
	client := &http.Client{Timeout: 5 * time.Second}
	apiURL := fmt.Sprintf("https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=%s&key=%s", videoID, apiKey)

	resp, err := client.Get(apiURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			_ = resp.Body.Close()
		}
		return nil, fmt.Errorf("YouTube API error")
	}
	defer resp.Body.Close()

	var data struct {
		Items []struct {
			Snippet struct {
				Title        string `json:"title"`
				ChannelTitle string `json:"channelTitle"`
				Thumbnails   struct {
					High struct {
						URL string `json:"url"`
					} `json:"high"`
				} `json:"thumbnails"`
			} `json:"snippet"`
			ContentDetails struct {
				Duration string `json:"duration"`
			} `json:"contentDetails"`
		} `json:"items"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil || len(data.Items) == 0 {
		return nil, fmt.Errorf("no item found in YouTube Data API")
	}

	item := data.Items[0]
	duration := logic.ParseISO8601Duration(item.ContentDetails.Duration)
	thumb := item.Snippet.Thumbnails.High.URL
	if thumb == "" {
		thumb = fmt.Sprintf("https://img.youtube.com/vi/%s/hqdefault.jpg", videoID)
	}

	return &YouTubeMetadata{
		VideoID:           videoID,
		Title:             item.Snippet.Title,
		Author:            item.Snippet.ChannelTitle,
		ThumbnailURL:      thumb,
		DurationSeconds:   duration,
		FormattedDuration: logic.FormatDuration(duration),
	}, nil
}

// fetchOEmbedMetadata lấy metadata tiêu đề/tác giả từ noembed và direct oEmbed
func fetchOEmbedMetadata(videoID string) *YouTubeMetadata {
	client := &http.Client{Timeout: 4 * time.Second}

	// 1. noembed
	targetURL := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)
	apiURL := fmt.Sprintf("https://noembed.com/embed?url=%s", targetURL)
	req, err := http.NewRequest(http.MethodGet, apiURL, nil)
	if err == nil {
		req.Header.Set("User-Agent", "WaveLinkAudio/2.0")
		resp, err := client.Do(req)
		if err == nil && resp.StatusCode == http.StatusOK {
			defer resp.Body.Close()
			var data oEmbedResponse
			if err := json.NewDecoder(resp.Body).Decode(&data); err == nil && data.Title != "" {
				return &YouTubeMetadata{
					VideoID:      videoID,
					Title:        data.Title,
					Author:       data.AuthorName,
					ThumbnailURL: data.ThumbnailURL,
				}
			}
		}
	}

	// 2. Direct oEmbed
	directURL := fmt.Sprintf("https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=%s&format=json", videoID)
	resp, err := client.Get(directURL)
	if err == nil && resp.StatusCode == http.StatusOK {
		defer resp.Body.Close()
		var data oEmbedResponse
		if err := json.NewDecoder(resp.Body).Decode(&data); err == nil && data.Title != "" {
			return &YouTubeMetadata{
				VideoID:      videoID,
				Title:        data.Title,
				Author:       data.AuthorName,
				ThumbnailURL: fmt.Sprintf("https://img.youtube.com/vi/%s/hqdefault.jpg", videoID),
			}
		}
	}

	return nil
}

func fetchWatchPageDuration(videoID string) int {
	client := &http.Client{Timeout: 5 * time.Second}
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
		DurationSeconds:   0,
		FormattedDuration: "",
	}
}

// InferDurationFromMetadata suy luận thời lượng chuẩn xác, tôn trọng thời lượng thực tế từ YouTube
func InferDurationFromMetadata(meta *YouTubeMetadata, customDuration int) int {
	// 1. Nếu YouTube trả về thời lượng thực tế > 0
	if meta != nil && meta.DurationSeconds > 0 {
		// Nếu client gửi số quá nhỏ (< 5s) hoặc client gửi đúng fallback 57600 cũ: ưu tiên thời lượng thực tế từ YouTube
		if customDuration < 5 || customDuration == 57600 {
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

	// 2. Nếu YouTube không trả về thời lượng, nhưng client gửi customDuration hợp lệ (> 0 và khác 57600)
	if customDuration > 0 && customDuration != 57600 {
		return customDuration
	}

	// 3. Thử suy luận từ tiêu đề video
	if meta != nil {
		if inferred := logic.InferDuration(meta.Title, 0); inferred > 0 {
			return inferred
		}
	}

	// 4. Nếu client gửi customDuration bất kỳ > 0
	if customDuration > 0 {
		return customDuration
	}

	return 0
}
