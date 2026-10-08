package user

import (
	"context"
	"errors"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetMe(ctx context.Context, userID int64) (*User, error) {
	u, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, errors.New("user not found")
	}
	return u, nil
}

func (s *Service) UpdateProfile(ctx context.Context, userID int64, req UpdateProfileRequest) error {
	if req.Username == "" {
		return errors.New("username cannot be empty")
	}
	return s.repo.UpdateProfile(ctx, userID, req.Username, req.Email)
}

func (s *Service) UpdatePassword(ctx context.Context, userID int64, req UpdatePasswordRequest) error {
	u, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if u == nil || u.PasswordHash == nil {
		return errors.New("cannot update password for this user")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*u.PasswordHash), []byte(req.OldPassword)); err != nil {
		return errors.New("mật khẩu cũ không chính xác")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return s.repo.UpdatePassword(ctx, userID, string(hash))
}

func (s *Service) GetAll(ctx context.Context) ([]User, error) {
	return s.repo.GetAll(ctx)
}

func (s *Service) UpdateRoleMembership(ctx context.Context, id int64, req AdminUpdateUserRequest) error {
	if req.Role != "USER" && req.Role != "ADMIN" {
		return errors.New("invalid role")
	}
	if req.Membership != "FREE" && req.Membership != "VIP" {
		return errors.New("invalid membership")
	}
	return s.repo.UpdateRoleMembership(ctx, id, req.Role, req.Membership)
}

func (s *Service) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
