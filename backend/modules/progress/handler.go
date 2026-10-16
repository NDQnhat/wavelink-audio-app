package progress

import (
	"time"

	"audio-app-backend/core/domain"
	"audio-app-backend/core/logic"
	"audio-app-backend/server/middleware"
	"audio-app-backend/server/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

type UpdateProgressRequest struct {
	AudioID         uint    `json:"audioId" binding:"required"`
	EpisodeID       uint    `json:"episodeId" binding:"required"`
	PositionSeconds int     `json:"positionSeconds"`
	ProgressPercent float64 `json:"progressPercent"`
	Completed       bool    `json:"completed"`
}

type BatchProgressRequest struct {
	Items []UpdateProgressRequest `json:"items" binding:"required"`
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.PUT("/progress", middleware.RequireAuth(), h.UpdateProgress)
	rg.PUT("/progress/batch", middleware.RequireAuth(), h.BatchUpdateProgress)
	rg.GET("/progress/:audioId", middleware.RequireAuth(), h.GetLatestProgress)
}

func (h *Handler) UpdateProgress(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var req UpdateProgressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu tiến trình không hợp lệ: "+err.Error())
		return
	}

	// Lấy thông tin thời lượng tập để tính toán chuẩn
	var ep domain.Episode
	dur := 14400
	if err := h.db.First(&ep, req.EpisodeID).Error; err == nil && ep.DurationSeconds > 0 {
		dur = ep.DurationSeconds
	}

	// Kiểm tra quyền hạn nghe tập VIP (tập 1 miễn phí, tập 2+ yêu cầu VIP)
	var audio domain.Audio
	if err := h.db.First(&audio, req.AudioID).Error; err == nil && (audio.IsVIPOnly || ep.IsVIP) {
		var currentUser domain.User
		h.db.First(&currentUser, userID)
		if can, msg := logic.CanAccessEpisode(currentUser, audio, ep); !can {
			response.Forbidden(c, msg)
			return
		}
	}

	// Tính toán qua Pure Function bảo đảm giới hạn và % chuẩn
	calc := logic.CalculateProgress(req.PositionSeconds, dur)

	prog := domain.ListeningProgress{
		UserID:          userID,
		AudioID:         req.AudioID,
		EpisodeID:       req.EpisodeID,
		PositionSeconds: calc.PositionSeconds,
		DurationSeconds: calc.DurationSeconds,
		ProgressPercent: calc.ProgressPercent,
		Completed:       calc.Completed || req.Completed,
		UpdatedAt:       time.Now().UTC(),
	}

	// UPSERT an toàn trong suốt qua GORM (hỗ trợ cả SQLite lẫn MySQL)
	err := h.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "user_id"}, {Name: "episode_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"audio_id",
			"position_seconds",
			"duration_seconds",
			"progress_percent",
			"completed",
			"updated_at",
		}),
	}).Create(&prog).Error

	if err != nil {
		response.Internal(c, "Lỗi cập nhật tiến trình: "+err.Error())
		return
	}

	response.OK(c, prog, nil)
}

func (h *Handler) BatchUpdateProgress(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var req BatchProgressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Dữ liệu tiến trình không hợp lệ: "+err.Error())
		return
	}

	if len(req.Items) == 0 {
		response.OK(c, gin.H{"count": 0}, nil)
		return
	}

	now := time.Now().UTC()
	var progs []domain.ListeningProgress
	for _, item := range req.Items {
		var ep domain.Episode
		dur := 14400
		if err := h.db.First(&ep, item.EpisodeID).Error; err == nil && ep.DurationSeconds > 0 {
			dur = ep.DurationSeconds
		}

		calc := logic.CalculateProgress(item.PositionSeconds, dur)
		progs = append(progs, domain.ListeningProgress{
			UserID:          userID,
			AudioID:         item.AudioID,
			EpisodeID:       item.EpisodeID,
			PositionSeconds: calc.PositionSeconds,
			DurationSeconds: calc.DurationSeconds,
			ProgressPercent: calc.ProgressPercent,
			Completed:       calc.Completed || item.Completed,
			UpdatedAt:       now,
		})
	}

	err := h.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "user_id"}, {Name: "episode_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"audio_id",
			"position_seconds",
			"duration_seconds",
			"progress_percent",
			"completed",
			"updated_at",
		}),
	}).Create(&progs).Error

	if err != nil {
		response.Internal(c, "Lỗi đồng bộ tiến trình hàng loạt: "+err.Error())
		return
	}

	response.OK(c, gin.H{"count": len(progs)}, nil)
}

func (h *Handler) GetLatestProgress(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	audioID := c.Param("audioId")

	var prog domain.ListeningProgress
	if err := h.db.Where("user_id = ? AND audio_id = ?", userID, audioID).
		Order("updated_at DESC").First(&prog).Error; err != nil {
		response.NotFound(c, "Chưa có tiến trình nghe")
		return
	}

	response.OK(c, prog, nil)
}
