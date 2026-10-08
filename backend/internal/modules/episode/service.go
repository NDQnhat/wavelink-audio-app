package episode

import (
	"context"
	"errors"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetByAudioID(ctx context.Context, audioID int64, userID int64) ([]Episode, error) {
	return s.repo.GetByAudioID(ctx, audioID, userID)
}

func (s *Service) Regenerate(ctx context.Context, audioID int64, totalDuration int, blockSize int) ([]Episode, error) {
	if totalDuration <= 0 {
		d, err := s.repo.GetAudioDuration(ctx, audioID)
		if err == nil && d > 0 {
			totalDuration = d
		} else {
			totalDuration = 57600 // fallback 16h
		}
	}
	if blockSize <= 0 {
		blockSize = DefaultEpisodeDuration
	}

	episodes := GenerateLogicalEpisodes(audioID, totalDuration, blockSize)
	if err := s.repo.ReplaceEpisodes(ctx, audioID, episodes); err != nil {
		return nil, err
	}

	return s.repo.GetByAudioID(ctx, audioID, 1)
}

func (s *Service) UpdateEpisode(ctx context.Context, id int64, title string, startSec, endSec int) error {
	if title == "" {
		return errors.New("tiêu đề tập không được để trống")
	}
	if endSec <= startSec {
		return errors.New("thời gian kết thúc phải lớn hơn thời gian bắt đầu")
	}
	return s.repo.UpdateEpisode(ctx, id, title, startSec, endSec)
}

func (s *Service) DeleteEpisode(ctx context.Context, id int64) error {
	return s.repo.DeleteEpisode(ctx, id)
}

func (s *Service) CreateEpisode(ctx context.Context, req CreateEpisodeRequest) (int64, error) {
	if req.Title == "" {
		return 0, errors.New("tiêu đề tập không được để trống")
	}
	if req.EndSeconds <= req.StartSeconds {
		return 0, errors.New("thời gian kết thúc phải lớn hơn thời gian bắt đầu")
	}
	ep := Episode{
		AudioID:       req.AudioID,
		EpisodeNumber: req.EpisodeNumber,
		Title:         req.Title,
		StartSeconds:  req.StartSeconds,
		EndSeconds:    req.EndSeconds,
	}
	return s.repo.CreateEpisode(ctx, ep)
}
