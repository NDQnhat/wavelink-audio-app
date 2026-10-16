package external_test

import (
	"testing"

	"audio-app-backend/infra/external"
)

func TestFetchYouTubeMetadata_RealVideo(t *testing.T) {
	// Video Rick Astley: 212 hoặc 213 giây (~3m33s)
	meta, err := external.FetchYouTubeMetadata("dQw4w9WgXcQ")
	if err != nil {
		t.Fatalf("FetchYouTubeMetadata failed: %v", err)
	}

	t.Logf("VideoID: %s, Title: %s, Author: %s, Duration: %d (%s), Thumb: %s",
		meta.VideoID, meta.Title, meta.Author, meta.DurationSeconds, meta.FormattedDuration, meta.ThumbnailURL)

	if meta.DurationSeconds == 57600 {
		t.Errorf("DurationSeconds should NOT be 57600 (16h)! It should be actual video duration (~213s)")
	}
	if meta.DurationSeconds < 200 || meta.DurationSeconds > 220 {
		t.Errorf("Expected duration ~213s, got %d", meta.DurationSeconds)
	}
}

func TestInferDurationFromMetadata(t *testing.T) {
	meta := &external.YouTubeMetadata{
		VideoID:         "dQw4w9WgXcQ",
		DurationSeconds: 213,
		Title:           "Rick Astley",
	}

	// 1. Nếu client gửi 57600 (fallback cũ), hệ thống PHẢI ưu tiên thời lượng thực tế từ YouTube
	dur := external.InferDurationFromMetadata(meta, 57600)
	if dur != 213 {
		t.Errorf("Expected duration 213, got %d", dur)
	}

	// 2. Nếu client gửi 0, hệ thống dùng thời lượng từ YouTube
	dur = external.InferDurationFromMetadata(meta, 0)
	if dur != 213 {
		t.Errorf("Expected duration 213, got %d", dur)
	}

	// 3. Nếu YouTube không lấy được thời lượng (meta.DurationSeconds = 0), nhưng client gửi thời lượng tùy chỉnh (ví dụ 7200s)
	metaNoDur := &external.YouTubeMetadata{
		VideoID:         "someId",
		DurationSeconds: 0,
		Title:           "Truyện không rõ thời lượng",
	}
	dur = external.InferDurationFromMetadata(metaNoDur, 7200)
	if dur != 7200 {
		t.Errorf("Expected custom duration 7200, got %d", dur)
	}

	// 4. Nếu YouTube không có và client không gửi, nhưng title có ghi "3 Giờ"
	metaWithTitle := &external.YouTubeMetadata{
		VideoID:         "someId",
		DurationSeconds: 0,
		Title:           "Truyện Ma 3 Giờ Trọn Bộ",
	}
	dur = external.InferDurationFromMetadata(metaWithTitle, 0)
	if dur != 10800 {
		t.Errorf("Expected inferred 10800 (3h), got %d", dur)
	}
}
