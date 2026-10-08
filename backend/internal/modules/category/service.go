package category

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

func (s *Service) GetAll(ctx context.Context) ([]Category, error) {
	return s.repo.GetAll(ctx)
}

func (s *Service) GetByID(ctx context.Context, id int64) (*Category, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Create(ctx context.Context, req CreateCategoryRequest) (*Category, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return nil, errors.New("tên thể loại không được để trống")
	}
	if req.Slug == "" {
		req.Slug = strings.ToLower(strings.ReplaceAll(req.Name, " ", "-"))
	}
	return s.repo.Create(ctx, req)
}

func (s *Service) Update(ctx context.Context, id int64, req UpdateCategoryRequest) (*Category, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return nil, errors.New("tên thể loại không được để trống")
	}
	if req.Slug == "" {
		req.Slug = strings.ToLower(strings.ReplaceAll(req.Name, " ", "-"))
	}
	return s.repo.Update(ctx, id, req)
}

func (s *Service) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
