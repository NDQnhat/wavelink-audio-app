package history

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

func (s *Service) Record(ctx context.Context, userID int64, req RecordHistoryRequest) error {
	if req.AudioID <= 0 {
		return errors.New("audioId là bắt buộc")
	}
	return s.repo.Record(ctx, userID, req)
}

func (s *Service) GetRecent(ctx context.Context, userID int64, limit int) ([]HistoryItem, error) {
	return s.repo.GetRecent(ctx, userID, limit)
}
