package history

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
	r.Post("/history", h.Record)
	r.Get("/history", h.GetRecent)
}

func (h *Handler) Record(w http.ResponseWriter, r *http.Request) {
	var req RecordHistoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_BODY", "Dữ liệu JSON không hợp lệ", nil)
		return
	}

	userID := middleware.GetUserID(r.Context())
	if err := h.service.Record(r.Context(), userID, req); err != nil {
		response.InternalServerError(w, err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, map[string]bool{"recorded": true}, nil)
}

func (h *Handler) GetRecent(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 10
	}

	userID := middleware.GetUserID(r.Context())
	list, err := h.service.GetRecent(r.Context(), userID, limit)
	if err != nil {
		response.InternalServerError(w, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, list, nil)
}
