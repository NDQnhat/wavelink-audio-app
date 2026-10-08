package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo      *Repository
	jwtSecret string
}

func NewService(repo *Repository, jwtSecret string) *Service {
	return &Service{
		repo:      repo,
		jwtSecret: jwtSecret,
	}
}

func (s *Service) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	if req.Username == "" || req.Password == "" {
		return nil, errors.New("tên tài khoản và mật khẩu không được để trống")
	}

	existing, _ := s.repo.GetByUsername(ctx, req.Username)
	if existing != nil {
		return nil, errors.New("tên tài khoản đã tồn tại")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("không thể mã hóa mật khẩu: %w", err)
	}

	user, err := s.repo.CreateUser(ctx, req.Username, req.Email, string(hash), false)
	if err != nil {
		return nil, err
	}

	token, err := s.generateToken(user.ID, user.Username, false, user.Role, user.Membership)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: token, User: user}, nil
}

func (s *Service) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	user, err := s.repo.GetByUsername(ctx, req.Username)
	if err != nil || user == nil || user.PasswordHash == nil {
		return nil, errors.New("tên đăng nhập hoặc mật khẩu không chính xác")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("tên đăng nhập hoặc mật khẩu không chính xác")
	}

	token, err := s.generateToken(user.ID, user.Username, user.IsGuest, user.Role, user.Membership)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: token, User: user}, nil
}

func (s *Service) GuestLogin(ctx context.Context) (*AuthResponse, error) {
	guestName := "guest_" + uuid.New().String()[:8]
	user, err := s.repo.CreateUser(ctx, guestName, "", "", true)
	if err != nil {
		return nil, err
	}

	token, err := s.generateToken(user.ID, user.Username, true, user.Role, user.Membership)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: token, User: user}, nil
}

func (s *Service) GetMe(ctx context.Context, userID int64) (*User, error) {
	return s.repo.GetByID(ctx, userID)
}

func (s *Service) generateToken(userID int64, username string, isGuest bool, role string, membership string) (string, error) {
	claims := jwt.MapClaims{
		"sub":        userID,
		"username":   username,
		"isGuest":    isGuest,
		"role":       role,
		"membership": membership,
		"exp":        time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":        time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}
