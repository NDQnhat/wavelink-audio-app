package tag

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
	r.Get("/tags", h.GetAll)
	
	// Admin routes
	r.With(middleware.RequireAdmin).Post("/tags", h.Create)
	r.With(middleware.RequireAdmin).Delete("/tags/{id}", h.Delete)
}

func (h *Handler) GetAll(w http.ResponseWriter, r *http.Request) {
	list, err := h.service.GetAll(r.Context())
	if err != nil {
		response.InternalServerError(w, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, list, nil)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateTagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_BODY", "Dữ liệu JSON không hợp lệ", nil)
		return
	}

	t, err := h.service.Create(r.Context(), req)
	if err != nil {
		response.BadRequest(w, "CREATE_FAILED", err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusCreated, t, nil)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID thẻ không hợp lệ", nil)
		return
	}

	if err := h.service.Delete(r.Context(), id); err != nil {
		response.InternalServerError(w, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]bool{"deleted": true}, nil)
}
