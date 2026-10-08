package category

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
	r.Get("/categories", h.GetAll)
	r.Get("/categories/{id}", h.GetByID)
	
	// Admin routes
	r.With(middleware.RequireAdmin).Post("/categories", h.Create)
	r.With(middleware.RequireAdmin).Put("/categories/{id}", h.Update)
	r.With(middleware.RequireAdmin).Delete("/categories/{id}", h.Delete)
}

func (h *Handler) GetAll(w http.ResponseWriter, r *http.Request) {
	list, err := h.service.GetAll(r.Context())
	if err != nil {
		response.InternalServerError(w, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, list, nil)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID thể loại không hợp lệ", nil)
		return
	}

	cat, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		response.InternalServerError(w, err.Error())
		return
	}
	if cat == nil {
		response.NotFound(w, "CATEGORY_NOT_FOUND", "Không tìm thấy thể loại")
		return
	}
	response.JSON(w, http.StatusOK, cat, nil)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_BODY", "Dữ liệu JSON không hợp lệ", nil)
		return
	}

	cat, err := h.service.Create(r.Context(), req)
	if err != nil {
		response.BadRequest(w, "CREATE_FAILED", err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusCreated, cat, nil)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID thể loại không hợp lệ", nil)
		return
	}

	var req UpdateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_BODY", "Dữ liệu JSON không hợp lệ", nil)
		return
	}

	cat, err := h.service.Update(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, "UPDATE_FAILED", err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, cat, nil)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID thể loại không hợp lệ", nil)
		return
	}

	if err := h.service.Delete(r.Context(), id); err != nil {
		response.InternalServerError(w, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]bool{"deleted": true}, nil)
}
