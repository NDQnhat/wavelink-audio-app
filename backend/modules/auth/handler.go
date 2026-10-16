package auth

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"audio-app-backend/core/domain"
	"audio-app-backend/server/middleware"
	"audio-app-backend/server/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Handler struct {
	db        *gorm.DB
	jwtSecret string
}

func NewHandler(db *gorm.DB, jwtSecret string) *Handler {
	return &Handler{db: db, jwtSecret: jwtSecret}
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type GoogleLoginRequest struct {
	Credential  string `json:"credential"`
	AccessToken string `json:"accessToken"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	Picture     string `json:"picture"`
	GoogleID    string `json:"googleId"`
}

type GoogleTokenInfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	{
		auth.POST("/guest", h.GuestLogin)
		auth.POST("/register", h.Register)
		auth.POST("/login", h.Login)
		auth.POST("/google", h.GoogleLogin)
		auth.GET("/me", middleware.RequireAuth(), h.GetMe)
		auth.POST("/logout", h.Logout)
	}
}

func (h *Handler) GuestLogin(c *gin.Context) {
	// Khách vãng lai (GUEST) không còn lưu tài khoản vào cơ sở dữ liệu nữa
	// để tối ưu dung lượng DB, tránh phình to bảng users không cần thiết.
	guest := domain.User{
		ID:         0,
		Username:   "Khách vãng lai",
		Email:      "",
		IsGuest:    true,
		Role:       domain.RoleGuest,
		Membership: domain.MembershipFree,
	}

	response.OK(c, gin.H{
		"token": "",
		"user":  guest,
	}, nil)
}

func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu đăng ký không hợp lệ: "+err.Error())
		return
	}

	var exists domain.User
	if err := h.db.Where("username = ?", req.Username).First(&exists).Error; err == nil {
		response.BadRequest(c, "Tên tài khoản đã tồn tại")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		response.Internal(c, "Lỗi mã hóa mật khẩu")
		return
	}

	email := req.Email
	if email == "" {
		email = fmt.Sprintf("%s_%s@user.local", req.Username, uuid.New().String()[:6])
	}

	newUser := domain.User{
		Username:     req.Username,
		Email:        email,
		PasswordHash: string(hash),
		Role:         domain.RoleUser,
		Membership:   domain.MembershipFree,
		IsGuest:      false,
	}

	if err := h.db.Create(&newUser).Error; err != nil {
		response.Internal(c, "Không thể tạo tài khoản: "+err.Error())
		return
	}

	token, err := middleware.GenerateToken(newUser, h.jwtSecret)
	if err != nil {
		response.Internal(c, "Lỗi cấp token")
		return
	}

	response.Created(c, gin.H{
		"token": token,
		"user":  newUser,
	})
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Vui lòng nhập tên tài khoản và mật khẩu")
		return
	}

	var user domain.User
	if err := h.db.Where("username = ? OR email = ?", req.Username, req.Username).First(&user).Error; err != nil {
		response.Error(c, http.StatusUnauthorized, "AUTH_FAILED", "Tên tài khoản hoặc mật khẩu không đúng")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		response.Error(c, http.StatusUnauthorized, "AUTH_FAILED", "Tên tài khoản hoặc mật khẩu không đúng")
		return
	}

	token, err := middleware.GenerateToken(user, h.jwtSecret)
	if err != nil {
		response.Internal(c, "Lỗi cấp token đăng nhập")
		return
	}

	response.OK(c, gin.H{
		"token": token,
		"user":  user,
	}, nil)
}

func (h *Handler) GetMe(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var user domain.User
	if err := h.db.First(&user, userID).Error; err != nil {
		response.NotFound(c, "Không tìm thấy thông tin người dùng")
		return
	}

	// Kiểm tra nếu hạn VIP đã hết
	if user.Role == domain.RoleVIP && user.VipExpiresAt != nil && user.VipExpiresAt.Before(time.Now()) {
		user.Role = domain.RoleUser
		user.Membership = domain.MembershipFree
		user.VipExpiresAt = nil
		h.db.Model(&user).Updates(map[string]interface{}{
			"role":           domain.RoleUser,
			"membership":     domain.MembershipFree,
			"vip_expires_at": nil,
		})
	}

	response.OK(c, user, nil)
}

func (h *Handler) Logout(c *gin.Context) {
	response.OK(c, gin.H{"message": "Đăng xuất thành công"}, nil)
}

func parseJWTClaims(tokenString string) (map[string]interface{}, error) {
	parts := strings.Split(tokenString, ".")
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid jwt format")
	}
	payloadSegment := parts[1]
	if l := len(payloadSegment) % 4; l > 0 {
		payloadSegment += strings.Repeat("=", 4-l)
	}
	decoded, err := base64.URLEncoding.DecodeString(payloadSegment)
	if err != nil {
		decoded, err = base64.StdEncoding.DecodeString(payloadSegment)
		if err != nil {
			return nil, err
		}
	}
	var claims map[string]interface{}
	if err := json.Unmarshal(decoded, &claims); err != nil {
		return nil, err
	}
	return claims, nil
}

func (h *Handler) GoogleLogin(c *gin.Context) {
	var req GoogleLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu đăng nhập Google không hợp lệ")
		return
	}

	var email, name, picture, googleID string
	email = strings.TrimSpace(req.Email)
	name = strings.TrimSpace(req.Name)
	picture = strings.TrimSpace(req.Picture)
	googleID = strings.TrimSpace(req.GoogleID)

	// 1. Nếu có Credential (ID Token của Google), phân tích và xác thực
	if req.Credential != "" {
		// Thử gọi TokenInfo API chính thức của Google
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Get("https://oauth2.googleapis.com/tokeninfo?id_token=" + req.Credential)
		if err == nil && resp.StatusCode == http.StatusOK {
			defer resp.Body.Close()
			var info GoogleTokenInfo
			if err := json.NewDecoder(resp.Body).Decode(&info); err == nil {
				if info.Email != "" {
					email = info.Email
				}
				if info.Name != "" {
					name = info.Name
				}
				if info.Picture != "" {
					picture = info.Picture
				}
				if info.Sub != "" {
					googleID = info.Sub
				}
			}
		} else {
			// Fallback decode an toàn claims từ JWT nếu không thể kết nối tới Google
			if claims, err := parseJWTClaims(req.Credential); err == nil {
				if em, ok := claims["email"].(string); ok && em != "" {
					email = em
				}
				if nm, ok := claims["name"].(string); ok && nm != "" {
					name = nm
				}
				if pic, ok := claims["picture"].(string); ok && pic != "" {
					picture = pic
				}
				if sub, ok := claims["sub"].(string); ok && sub != "" {
					googleID = sub
				}
			}
		}
	}

	// 2. Nếu có AccessToken và chưa đủ thông tin, thử lấy từ Google UserInfo
	if (email == "" || name == "" || picture == "") && req.AccessToken != "" {
		client := &http.Client{Timeout: 5 * time.Second}
		uReq, _ := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v3/userinfo", nil)
		uReq.Header.Set("Authorization", "Bearer "+req.AccessToken)
		if resp, err := client.Do(uReq); err == nil && resp.StatusCode == http.StatusOK {
			defer resp.Body.Close()
			var info GoogleTokenInfo
			if err := json.NewDecoder(resp.Body).Decode(&info); err == nil {
				if email == "" {
					email = info.Email
				}
				if name == "" {
					name = info.Name
				}
				if picture == "" {
					picture = info.Picture
				}
				if googleID == "" {
					googleID = info.Sub
				}
			}
		}
	}

	if email == "" && googleID == "" {
		response.BadRequest(c, "Không tìm thấy thông tin tài khoản Google hợp lệ")
		return
	}

	if name == "" {
		if email != "" {
			parts := strings.Split(email, "@")
			name = parts[0]
		} else {
			name = "Google User"
		}
	}

	// 3. Tìm hoặc Tạo User trong Database
	var user domain.User
	found := false

	if googleID != "" {
		if err := h.db.Where("google_id = ?", googleID).First(&user).Error; err == nil {
			found = true
		}
	}

	if !found && email != "" {
		if err := h.db.Where("email = ?", email).First(&user).Error; err == nil {
			found = true
		}
	}

	if found {
		// Cập nhật thông tin mới nhất từ Google
		updates := map[string]interface{}{
			"is_guest": false,
		}
		if picture != "" {
			updates["avatar_url"] = picture
			user.AvatarURL = picture
		}
		if googleID != "" && user.GoogleID == "" {
			updates["google_id"] = googleID
			user.GoogleID = googleID
		}
		if email != "" && user.Email == "" {
			updates["email"] = email
			user.Email = email
		}
		if user.Role == domain.RoleGuest {
			updates["role"] = domain.RoleUser
			user.Role = domain.RoleUser
		}
		h.db.Model(&user).Updates(updates)
	} else {
		// Tạo tài khoản người dùng WaveLink mới từ Google
		candidateUsername := name
		var exists domain.User
		if err := h.db.Where("username = ?", candidateUsername).First(&exists).Error; err == nil {
			candidateUsername = fmt.Sprintf("%s_%s", candidateUsername, uuid.New().String()[:4])
		}

		user = domain.User{
			Username:   candidateUsername,
			Email:      email,
			AvatarURL:  picture,
			GoogleID:   googleID,
			Role:       domain.RoleUser,
			Membership: domain.MembershipFree,
			IsGuest:    false,
		}

		if err := h.db.Create(&user).Error; err != nil {
			response.Internal(c, "Không thể tạo tài khoản từ Google: "+err.Error())
			return
		}
	}

	// 4. Sinh JWT Token WaveLink
	token, err := middleware.GenerateToken(user, h.jwtSecret)
	if err != nil {
		response.Internal(c, "Lỗi cấp token xác thực")
		return
	}

	response.OK(c, gin.H{
		"token": token,
		"user":  user,
	}, nil)
}
