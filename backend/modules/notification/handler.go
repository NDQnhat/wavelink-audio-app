package notification

import (
	"strconv"
	"time"

	"audio-app-backend/core/domain"
	"audio-app-backend/server/middleware"
	"audio-app-backend/server/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

type UpdatePreferencesRequest struct {
	SystemAlerts    *bool `json:"systemAlerts"`
	NovelUpdates    *bool `json:"novelUpdates"`
	PromotionAlerts *bool `json:"promotionAlerts"`
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	notifs := rg.Group("/notifications")
	notifs.Use(middleware.RequireAuth())
	{
		notifs.GET("", h.GetNotifications)
		notifs.GET("/unread-count", h.GetUnreadCount)
		notifs.PUT("/:id/read", h.MarkAsRead)
		notifs.PUT("/read-all", h.MarkAllAsRead)
		notifs.GET("/preferences", h.GetPreferences)
		notifs.PUT("/preferences", h.UpdatePreferences)
	}
}

func (h *Handler) GetNotifications(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)

	var list []domain.Notification
	h.db.Where("user_id = ?", userID).Order("created_at DESC").Limit(50).Find(&list)

	// Nếu user chưa có thông báo nào, tạo thông báo chào mừng & hướng dẫn
	if len(list) == 0 {
		welcomeNotifs := []domain.Notification{
			{
				UserID:    userID,
				Title:     "Chào mừng đến với WaveLink! 🎧",
				Message:   "Trải nghiệm nghe truyện Manga & Audiobook YouTube đỉnh cao với Virtual Audio Engine 0% quảng cáo gián đoạn trên WaveLink.",
				Type:      "SYSTEM",
				Link:      "#/home",
				IsRead:    false,
				CreatedAt: time.Now().UTC().Add(-2 * time.Hour),
			},
			{
				UserID:    userID,
				Title:     "Tính năng chia tập 4 giờ tự động ⚡",
				Message:   "Nhập video dài hơn 20 tiếng, hệ thống sẽ tự động bóc tách thành các tập 4 giờ liên tục không ngắt quãng.",
				Type:      "SYSTEM",
				Link:      "#/upload",
				IsRead:    false,
				CreatedAt: time.Now().UTC().Add(-1 * time.Hour),
			},
			{
				UserID:    userID,
				Title:     "Mở khóa VIP Member không giới hạn 👑",
				Message:   "Trở thành Hội viên VIP để nghe trọn bộ truyện độc quyền và cày truyện không giới hạn lượt import.",
				Type:      "VIP",
				Link:      "#/membership",
				IsRead:    false,
				CreatedAt: time.Now().UTC(),
			},
		}
		for _, n := range welcomeNotifs {
			h.db.Create(&n)
		}
		list = welcomeNotifs
	}

	response.OK(c, list, nil)
}

func (h *Handler) GetUnreadCount(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var count int64
	h.db.Model(&domain.Notification{}).Where("user_id = ? AND is_read = 0", userID).Count(&count)
	response.OK(c, gin.H{"unreadCount": count}, nil)
}

func (h *Handler) MarkAsRead(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "ID thông báo không hợp lệ")
		return
	}

	h.db.Model(&domain.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_read", true)

	response.OK(c, gin.H{"message": "Đã đánh dấu đã đọc"}, nil)
}

func (h *Handler) MarkAllAsRead(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	h.db.Model(&domain.Notification{}).
		Where("user_id = ?", userID).
		Update("is_read", true)

	response.OK(c, gin.H{"message": "Đã đánh dấu tất cả đã đọc"}, nil)
}

func (h *Handler) GetPreferences(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)

	var pref domain.NotificationPreference
	if err := h.db.First(&pref, "user_id = ?", userID).Error; err != nil {
		pref = domain.NotificationPreference{
			UserID:          userID,
			SystemAlerts:    true,
			NovelUpdates:    true,
			PromotionAlerts: true,
			UpdatedAt:       time.Now().UTC(),
		}
		h.db.Create(&pref)
	}

	response.OK(c, pref, nil)
}

func (h *Handler) UpdatePreferences(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)

	var req UpdatePreferencesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu cài đặt không hợp lệ")
		return
	}

	var pref domain.NotificationPreference
	if err := h.db.First(&pref, "user_id = ?", userID).Error; err != nil {
		pref = domain.NotificationPreference{
			UserID:          userID,
			SystemAlerts:    true,
			NovelUpdates:    true,
			PromotionAlerts: true,
			UpdatedAt:       time.Now().UTC(),
		}
		h.db.Create(&pref)
	}

	updates := map[string]interface{}{
		"updated_at": time.Now().UTC(),
	}
	if req.SystemAlerts != nil {
		updates["system_alerts"] = *req.SystemAlerts
	}
	if req.NovelUpdates != nil {
		updates["novel_updates"] = *req.NovelUpdates
	}
	if req.PromotionAlerts != nil {
		updates["promotion_alerts"] = *req.PromotionAlerts
	}

	h.db.Model(&pref).Updates(updates)
	h.db.First(&pref, "user_id = ?", userID)

	response.OK(c, pref, nil)
}
