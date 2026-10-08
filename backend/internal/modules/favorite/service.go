package favorite

import "context"

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Add(ctx context.Context, userID int64, audioID int64) error {
	return s.repo.Add(ctx, userID, audioID)
}

func (s *Service) Remove(ctx context.Context, userID int64, audioID int64) error {
	return s.repo.Remove(ctx, userID, audioID)
}

func (s *Service) IsFavorite(ctx context.Context, userID int64, audioID int64) (bool, error) {
	return s.repo.IsFavorite(ctx, userID, audioID)
}
