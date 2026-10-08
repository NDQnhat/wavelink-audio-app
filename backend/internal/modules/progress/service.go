package progress

import (
	"context"
	"errors"

	"audio-app-backend/internal/modules/episode"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) UpdateProgress(ctx context.Context, userID int64, req UpdateProgressRequest) error {
	if req.AudioID <= 0 || req.EpisodeID <= 0 {
		return errors.New("audioId và episodeId là bắt buộc")
	}
	if req.ProgressPercent < 0 {
		req.ProgressPercent = 0
	}
	if req.ProgressPercent > 100 {
		req.ProgressPercent = 100
	}
	if req.ProgressPercent >= 99 {
		req.Completed = true
	}
	return s.repo.Upsert(ctx, userID, req)
}

func (s *Service) GetAudioProgress(ctx context.Context, userID int64, audioID int64) (*ProgressResponse, error) {
	record, err := s.repo.GetLatestProgress(ctx, userID, audioID)
	if err != nil {
		return nil, err
	}
	if record == nil {
		return &ProgressResponse{
			AudioID:           audioID,
			EpisodeID:         0,
			PositionSeconds:   0,
			FormattedPosition: "00:00:00",
			ProgressPercent:   0,
			Completed:         false,
		}, nil
	}

	return &ProgressResponse{
		AudioID:           record.AudioID,
		EpisodeID:         record.EpisodeID,
		PositionSeconds:   record.PositionSeconds,
		FormattedPosition: episode.FormatTime(record.PositionSeconds),
		ProgressPercent:   record.ProgressPercent,
		Completed:         record.Completed,
	}, nil
}

func (s *Service) GetUserInProgress(ctx context.Context, userID int64) ([]ProgressRecord, error) {
	return s.repo.GetUserInProgress(ctx, userID)
}
