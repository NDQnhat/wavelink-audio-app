package audio

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"
)

var ytRegex = regexp.MustCompile(`^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})`)

type YouTubeMetadata struct {
	Title        string `json:"title"`
	AuthorName   string `json:"author_name"`
	AuthorURL    string `json:"author_url"`
	ThumbnailURL string `json:"thumbnail_url"`
}

func ParseYouTubeURL(rawURL string) (string, error) {
	cleanURL := strings.TrimSpace(rawURL)
	if len(cleanURL) > 500 {
		return "", errors.New("URL vượt quá độ dài tối đa cho phép")
	}
	matches := ytRegex.FindStringSubmatch(cleanURL)
	if len(matches) < 2 {
		return "", errors.New("URL không hợp lệ hoặc không thuộc hệ thống YouTube")
	}
	return matches[1], nil
}

func FetchYouTubeMetadata(videoID string) (*YouTubeMetadata, error) {
	client := &http.Client{Timeout: 5 * time.Second}
	apiURL := fmt.Sprintf("https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=%s&format=json", videoID)

	resp, err := client.Get(apiURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		// Fallback cơ chế nếu offline hoặc oEmbed bị chặn mạng
		return &YouTubeMetadata{
			Title:        "YouTube Audio - " + videoID,
			AuthorName:   "YouTube Creator",
			AuthorURL:    "https://www.youtube.com",
			ThumbnailURL: fmt.Sprintf("https://img.youtube.com/vi/%s/hqdefault.jpg", videoID),
		}, nil
	}
	defer resp.Body.Close()

	var meta YouTubeMetadata
	if err := json.NewDecoder(resp.Body).Decode(&meta); err != nil {
		return &YouTubeMetadata{
			Title:        "YouTube Audio - " + videoID,
			AuthorName:   "YouTube Creator",
			ThumbnailURL: fmt.Sprintf("https://img.youtube.com/vi/%s/hqdefault.jpg", videoID),
		}, nil
	}

	if meta.ThumbnailURL == "" {
		meta.ThumbnailURL = fmt.Sprintf("https://img.youtube.com/vi/%s/hqdefault.jpg", videoID)
	}

	return &meta, nil
}
