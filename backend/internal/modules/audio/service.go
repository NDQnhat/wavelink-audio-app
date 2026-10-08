package audio

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"audio-app-backend/internal/modules/episode"
)

type Service struct {
	repo        *Repository
	episodeRepo *episode.Repository
	blockSec    int
}

func NewService(repo *Repository, episodeRepo *episode.Repository, blockSec int) *Service {
	if blockSec <= 0 {
		blockSec = episode.DefaultEpisodeDuration
	}
	return &Service{
		repo:        repo,
		episodeRepo: episodeRepo,
		blockSec:    blockSec,
	}
}

func (s *Service) ImportYouTube(ctx context.Context, req ImportYouTubeRequest, userID int64) (*ImportYouTubeResponse, error) {
	videoID, err := ParseYouTubeURL(req.URL)
	if err != nil {
		return nil, err
	}

	// 1. Kiểm tra trùng lặp
	existing, err := s.repo.GetByVideoID(ctx, videoID, userID)
	if err == nil && existing != nil {
		return &ImportYouTubeResponse{
			Duplicate: true,
			Audio:     existing,
		}, nil
	}

	// 2. Trích xuất Metadata YouTube oEmbed
	meta, err := FetchYouTubeMetadata(videoID)
	if err != nil {
		return nil, fmt.Errorf("không thể lấy thông tin video: %w", err)
	}

	// 3. Chuẩn bị thời lượng video (mặc định 4 khối 4h = 57600s nếu không truyền)
	totalDuration := req.DurationSeconds
	if totalDuration <= 0 {
		totalDuration = 57600 // 16 giờ demo
	}

	title := strings.TrimSpace(meta.Title)
	if title == "" {
		title = "Audio YouTube - " + videoID
	}
	author := strings.TrimSpace(meta.AuthorName)
	if author == "" {
		author = "YouTube Creator"
	}

	newAudio := &Audio{
		YoutubeVideoID:       videoID,
		YoutubeURL:           fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID),
		Title:                title,
		Description:          fmt.Sprintf("Nguồn YouTube: %s", meta.AuthorURL),
		Author:               author,
		Channel:              author,
		CategoryID:           req.CategoryID,
		ThumbnailURL:         meta.ThumbnailURL,
		TotalDurationSeconds: totalDuration,
		Status:               "PLAYING",
	}

	// 4. Lưu Audio vào DB
	audioID, err := s.repo.Create(ctx, newAudio, req.Tags)
	if err != nil {
		return nil, fmt.Errorf("lỗi tạo bản ghi audio: %w", err)
	}

	// 5. Tự động sinh tập logic 4h (start_seconds, end_seconds)
	episodes := episode.GenerateLogicalEpisodes(audioID, totalDuration, s.blockSec)
	if err := s.episodeRepo.ReplaceEpisodes(ctx, audioID, episodes); err != nil {
		return nil, fmt.Errorf("lỗi khởi tạo danh sách tập: %w", err)
	}

	// 6. Trả về chi tiết đầy đủ
	savedAudio, err := s.repo.GetByID(ctx, audioID, userID)
	if err != nil {
		return nil, err
	}

	return &ImportYouTubeResponse{
		Duplicate: false,
		Audio:     savedAudio,
	}, nil
}

func (s *Service) GetByID(ctx context.Context, id int64, userID int64) (*Audio, error) {
	return s.repo.GetByID(ctx, id, userID)
}

func (s *Service) List(ctx context.Context, filter FilterParams, userID int64) ([]Audio, int, error) {
	return s.repo.List(ctx, filter, userID)
}

func (s *Service) Update(ctx context.Context, id int64, req UpdateAudioRequest) error {
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		return errors.New("tiêu đề không được để trống")
	}
	return s.repo.Update(ctx, id, req)
}

func (s *Service) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) Refresh(ctx context.Context, id int64, userID int64) (*Audio, error) {
	current, err := s.repo.GetByID(ctx, id, userID)
	if err != nil || current == nil {
		return nil, errors.New("không tìm thấy audio")
	}

	meta, err := FetchYouTubeMetadata(current.YoutubeVideoID)
	if err != nil {
		return nil, err
	}

	if err := s.repo.UpdateMetadata(ctx, id, meta.Title, meta.AuthorName, meta.ThumbnailURL); err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, id, userID)
}
