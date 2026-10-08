package favorite

import (
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
	r.Post("/favorites/{audioId}", h.Add)
	r.Delete("/favorites/{audioId}", h.Remove)
}

func (h *Handler) Add(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "audioId")
	audioID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID audio không hợp lệ", nil)
		return
	}

	userID := middleware.GetUserID(r.Context())
	if err := h.service.Add(r.Context(), userID, audioID); err != nil {
		response.InternalServerError(w, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]bool{"isFavorite": true}, nil)
}

func (h *Handler) Remove(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "audioId")
	audioID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID audio không hợp lệ", nil)
		return
	}

	userID := middleware.GetUserID(r.Context())
	if err := h.service.Remove(r.Context(), userID, audioID); err != nil {
		response.InternalServerError(w, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]bool{"isFavorite": false}, nil)
}
