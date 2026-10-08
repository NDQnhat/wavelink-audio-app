package progress

import (
	"encoding/json"
	"net/http"
	"strconv"

	"audio-app-backend/internal/platform/middleware"
	"audio-app-backend/internal/platform/response"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Put("/progress", h.UpdateProgress)
	r.Get("/audios/{id}/progress", h.GetAudioProgress)
	r.Get("/users/me/progress", h.GetUserProgress)
}

func (h *Handler) UpdateProgress(w http.ResponseWriter, r *http.Request) {
	var req UpdateProgressRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_BODY", "Dữ liệu JSON không hợp lệ", nil)
		return
	}

	userID := middleware.GetUserID(r.Context())
	if err := h.service.UpdateProgress(r.Context(), userID, req); err != nil {
		response.InternalServerError(w, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]bool{"synced": true}, nil)
}

func (h *Handler) GetAudioProgress(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	audioID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID audio không hợp lệ", nil)
		return
	}

	userID := middleware.GetUserID(r.Context())
	res, err := h.service.GetAudioProgress(r.Context(), userID, audioID)
	if err != nil {
		response.InternalServerError(w, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, res, nil)
}

func (h *Handler) GetUserProgress(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	list, err := h.service.GetUserInProgress(r.Context(), userID)
	if err != nil {
		response.InternalServerError(w, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, list, nil)
}
