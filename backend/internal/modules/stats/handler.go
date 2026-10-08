package stats

import (
	"net/http"

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
	r.Get("/stats", h.GetStats)
}

func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	st, err := h.service.GetStats(r.Context())
	if err != nil {
		response.InternalServerError(w, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, st, nil)
}
