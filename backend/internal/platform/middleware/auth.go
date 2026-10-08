package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type contextKey string

const (
	UserIDKey      contextKey = "user_id"
	GuestIDKey     contextKey = "guest_id"
	IsGuestKey     contextKey = "is_guest"
	RoleKey        contextKey = "role"
	MembershipKey  contextKey = "membership"
)

func SessionMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			var userID int64 = 0
			isGuest := true
			guestID := ""
			role := "USER"
			membership := "FREE"

			// 1. Kiểm tra JWT Token trong Authorization Header: Bearer <token>
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
				token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
					return []byte(jwtSecret), nil
				})
				if err == nil && token.Valid {
					if claims, ok := token.Claims.(jwt.MapClaims); ok {
						if sub, ok := claims["sub"].(float64); ok {
							userID = int64(sub)
							isGuest = false
						}
						if r, ok := claims["role"].(string); ok {
							role = r
						}
						if m, ok := claims["membership"].(string); ok {
							membership = m
						}
					}
				}
			}

			// 2. Nếu là Guest, kiểm tra X-Guest-ID hoặc cookie
			if isGuest {
				guestID = r.Header.Get("X-Guest-ID")
				if guestID == "" {
					if cookie, err := r.Cookie("guest_id"); err == nil && cookie.Value != "" {
						guestID = cookie.Value
					}
				}
				if guestID == "" {
					guestID = "guest_" + uuid.New().String()[:8]
				}
				// Gắn lại header phản hồi để client lưu
				w.Header().Set("X-Guest-ID", guestID)
			}

			ctx = context.WithValue(ctx, UserIDKey, userID)
			ctx = context.WithValue(ctx, GuestIDKey, guestID)
			ctx = context.WithValue(ctx, IsGuestKey, isGuest)
			ctx = context.WithValue(ctx, RoleKey, role)
			ctx = context.WithValue(ctx, MembershipKey, membership)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserID(ctx context.Context) int64 {
	if val, ok := ctx.Value(UserIDKey).(int64); ok {
		return val
	}
	return 0
}

func GetGuestID(ctx context.Context) string {
	if val, ok := ctx.Value(GuestIDKey).(string); ok {
		return val
	}
	return ""
}

func IsGuest(ctx context.Context) bool {
	if val, ok := ctx.Value(IsGuestKey).(bool); ok {
		return val
	}
	return true
}

func GetRole(ctx context.Context) string {
	if val, ok := ctx.Value(RoleKey).(string); ok {
		return val
	}
	return "USER"
}

func GetMembership(ctx context.Context) string {
	if val, ok := ctx.Value(MembershipKey).(string); ok {
		return val
	}
	return "FREE"
}

func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role := GetRole(r.Context())
		if role != "ADMIN" {
			http.Error(w, `{"success": false, "error": {"code": 403, "message": "Yêu cầu quyền Admin"}}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if IsGuest(r.Context()) || GetUserID(r.Context()) == 0 {
			http.Error(w, `{"success": false, "error": {"code": 401, "message": "Yêu cầu đăng nhập"}}`, http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}
