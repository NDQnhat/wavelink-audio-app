package favorite

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

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	favs := rg.Group("/favorites")
	favs.Use(middleware.RequireAuth())
	{
		favs.POST("/:audioId", h.AddFavorite)
		favs.DELETE("/:audioId", h.RemoveFavorite)
		favs.POST("/:audioId/toggle", h.ToggleFavorite)
		favs.PUT("/:audioId/toggle", h.ToggleFavorite)
	}
}

func (h *Handler) AddFavorite(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	audioIDStr := c.Param("audioId")
	audioID, err := strconv.ParseUint(audioIDStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "Audio ID không hợp lệ")
		return
	}

	fav := domain.Favorite{
		UserID:    userID,
		AudioID:   uint(audioID),
		CreatedAt: time.Now().UTC(),
	}

	h.db.FirstOrCreate(&fav, domain.Favorite{UserID: userID, AudioID: uint(audioID)})
	response.OK(c, gin.H{"isFavorite": true, "audioId": audioID}, nil)
}

func (h *Handler) RemoveFavorite(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	audioIDStr := c.Param("audioId")
	audioID, err := strconv.ParseUint(audioIDStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "Audio ID không hợp lệ")
		return
	}

	h.db.Where("user_id = ? AND audio_id = ?", userID, audioID).Delete(&domain.Favorite{})
	response.OK(c, gin.H{"isFavorite": false, "audioId": audioID}, nil)
}

func (h *Handler) ToggleFavorite(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	audioIDStr := c.Param("audioId")
	audioID, err := strconv.ParseUint(audioIDStr, 10, 32)
	if err != nil {
		response.BadRequest(c, "Audio ID không hợp lệ")
		return
	}

	var fav domain.Favorite
	if err := h.db.Where("user_id = ? AND audio_id = ?", userID, audioID).First(&fav).Error; err == nil {
		// Đã tồn tại -> Bỏ yêu thích
		h.db.Where("user_id = ? AND audio_id = ?", userID, audioID).Delete(&domain.Favorite{})
		response.OK(c, gin.H{"isFavorite": false, "audioId": audioID}, nil)
		return
	}

	// Chưa tồn tại -> Thêm vào yêu thích
	newFav := domain.Favorite{
		UserID:    userID,
		AudioID:   uint(audioID),
		CreatedAt: time.Now().UTC(),
	}
	h.db.Create(&newFav)
	response.OK(c, gin.H{"isFavorite": true, "audioId": audioID}, nil)
}
