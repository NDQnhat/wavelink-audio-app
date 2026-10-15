package user

import (
	"time"

	"audio-app-backend/core/domain"
	"audio-app-backend/server/middleware"
	"audio-app-backend/server/response"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

type UpdateProfileRequest struct {
	Username  string `json:"username"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatarUrl"`
	CoverURL  string `json:"coverUrl"`
}

type LinkGoogleRequest struct {
	GoogleID  string `json:"googleId"`
	AvatarURL string `json:"avatarUrl"`
	Email     string `json:"email"`
}

type UpdatePasswordRequest struct {
	OldPassword string `json:"oldPassword" binding:"required"`
	NewPassword string `json:"newPassword" binding:"required,min=6"`
}

type UpdateRoleRequest struct {
	Role       string `json:"role"`
	Membership string `json:"membership"`
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	users := rg.Group("/users")
	users.Use(middleware.RequireAuth())
	{
		users.GET("", middleware.RequireAdmin(), h.GetUsers)
		users.PUT("/me", h.UpdateProfile)
		users.PUT("/me/password", h.UpdatePassword)
		users.POST("/me/link-google", h.LinkGoogle)
		users.PUT("/:id", middleware.RequireAdmin(), h.UpdateUserRole)
		users.DELETE("/:id", middleware.RequireAdmin(), h.DeleteUser)
	}
}

func (h *Handler) GetUsers(c *gin.Context) {
	var users []domain.User
	if err := h.db.Order("created_at DESC").Find(&users).Error; err != nil {
		response.Internal(c, "Lỗi lấy danh sách người dùng")
		return
	}
	response.OK(c, users, nil)
}

func (h *Handler) UpdateProfile(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu không hợp lệ")
		return
	}

	updates := map[string]interface{}{}
	if req.Username != "" {
		updates["username"] = req.Username
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.AvatarURL != "" {
		updates["avatar_url"] = req.AvatarURL
	}
	if req.CoverURL != "" {
		updates["cover_url"] = req.CoverURL
	}

	if len(updates) > 0 {
		if err := h.db.Model(&domain.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
			response.Internal(c, "Không thể cập nhật hồ sơ: "+err.Error())
			return
		}
	}

	var updatedUser domain.User
	h.db.First(&updatedUser, userID)

	response.OK(c, gin.H{"message": "Cập nhật thành công", "user": updatedUser}, nil)
}

func (h *Handler) LinkGoogle(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var req LinkGoogleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu không hợp lệ")
		return
	}

	updates := map[string]interface{}{}
	if req.GoogleID != "" {
		updates["google_id"] = req.GoogleID
	}
	if req.AvatarURL != "" {
		updates["avatar_url"] = req.AvatarURL
	}

	if len(updates) > 0 {
		if err := h.db.Model(&domain.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
			response.Internal(c, "Không thể liên kết tài khoản Google: "+err.Error())
			return
		}
	}

	var updatedUser domain.User
	h.db.First(&updatedUser, userID)

	response.OK(c, gin.H{"message": "Liên kết Google thành công", "user": updatedUser}, nil)
}

func (h *Handler) UpdatePassword(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var req UpdatePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Mật khẩu mới phải có ít nhất 6 ký tự")
		return
	}

	var u domain.User
	if err := h.db.First(&u, userID).Error; err != nil {
		response.NotFound(c, "Người dùng không tồn tại")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.OldPassword)); err != nil {
		response.BadRequest(c, "Mật khẩu hiện tại không chính xác")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		response.Internal(c, "Lỗi mã hóa mật khẩu")
		return
	}

	if err := h.db.Model(&u).Update("password_hash", string(newHash)).Error; err != nil {
		response.Internal(c, "Không thể lưu mật khẩu mới")
		return
	}

	response.OK(c, gin.H{"message": "Đổi mật khẩu thành công"}, nil)
}

func (h *Handler) UpdateUserRole(c *gin.Context) {
	id := c.Param("id")
	var req UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu phân hạng không hợp lệ")
		return
	}

	updates := map[string]interface{}{}
	if req.Role != "" {
		updates["role"] = req.Role
		// Đồng bộ nghiêm ngặt: Đổi Role thì Membership và thời hạn tự động đổi theo
		if req.Role == domain.RoleVIP {
			updates["membership"] = domain.MembershipVIP
			expiry := time.Now().Add(30 * 24 * time.Hour)
			updates["vip_expires_at"] = &expiry
		} else if req.Role == domain.RoleAdmin {
			updates["membership"] = domain.MembershipVIP
			expiry := time.Now().Add(365 * 24 * time.Hour)
			updates["vip_expires_at"] = &expiry
		} else {
			updates["role"] = domain.RoleUser
			updates["membership"] = domain.MembershipFree
			updates["vip_expires_at"] = nil
		}
	} else if req.Membership != "" {
		// Fallback nếu client cũ gửi membership
		if req.Membership == domain.MembershipVIP {
			updates["role"] = domain.RoleVIP
			updates["membership"] = domain.MembershipVIP
			expiry := time.Now().Add(30 * 24 * time.Hour)
			updates["vip_expires_at"] = &expiry
		} else {
			updates["role"] = domain.RoleUser
			updates["membership"] = domain.MembershipFree
			updates["vip_expires_at"] = nil
		}
	}

	if err := h.db.Model(&domain.User{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		response.Internal(c, "Không thể cập nhật quyền người dùng")
		return
	}

	response.OK(c, gin.H{"message": "Cập nhật vai trò và đồng bộ hội viên thành công"}, nil)
}

func (h *Handler) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Delete(&domain.User{}, id).Error; err != nil {
		response.Internal(c, "Không thể xóa người dùng")
		return
	}
	response.OK(c, gin.H{"message": "Xóa thành công"}, nil)
}
