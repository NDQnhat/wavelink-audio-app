package tag

import (
	"context"
	"errors"
	"strings"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetAll(ctx context.Context) ([]Tag, error) {
	return s.repo.GetAll(ctx)
}

func (s *Service) GetByID(ctx context.Context, id int64) (*Tag, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Create(ctx context.Context, req CreateTagRequest) (*Tag, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return nil, errors.New("tên thẻ không được để trống")
	}
	if req.Slug == "" {
		req.Slug = strings.ToLower(strings.ReplaceAll(req.Name, " ", "-"))
	}
	return s.repo.Create(ctx, req)
}

func (s *Service) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
