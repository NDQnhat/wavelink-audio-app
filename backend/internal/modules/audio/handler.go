package audio

import (
	"encoding/json"
	"math"
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
	r.Post("/audios/import-youtube", h.ImportYouTube)
	r.Get("/audios", h.List)
	r.Get("/audios/{id}", h.GetByID)
	
	// Admin routes
	r.With(middleware.RequireAdmin).Put("/audios/{id}", h.Update)
	r.With(middleware.RequireAdmin).Delete("/audios/{id}", h.Delete)
	r.With(middleware.RequireAdmin).Post("/audios/{id}/refresh", h.Refresh)
}

func (h *Handler) ImportYouTube(w http.ResponseWriter, r *http.Request) {
	var req ImportYouTubeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_BODY", "Dữ liệu JSON không hợp lệ", nil)
		return
	}

	userID := middleware.GetUserID(r.Context())
	res, err := h.service.ImportYouTube(r.Context(), req, userID)
	if err != nil {
		response.BadRequest(w, "IMPORT_FAILED", err.Error(), nil)
		return
	}

	status := http.StatusCreated
	if res.Duplicate {
		status = http.StatusOK
	}
	response.JSON(w, status, res, nil)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	search := q.Get("search")
	status := q.Get("status")
	tag := q.Get("tag")
	catID, _ := strconv.ParseInt(q.Get("categoryId"), 10, 64)

	page, _ := strconv.Atoi(q.Get("page"))
	if page <= 0 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(q.Get("pageSize"))
	if pageSize <= 0 {
		pageSize = 20
	}

	filter := FilterParams{
		Search:     search,
		CategoryID: catID,
		Tag:        tag,
		Status:     status,
		Page:       page,
		PageSize:   pageSize,
	}

	userID := middleware.GetUserID(r.Context())
	list, totalItems, err := h.service.List(r.Context(), filter, userID)
	if err != nil {
		response.InternalServerError(w, err.Error())
		return
	}

	totalPages := int(math.Ceil(float64(totalItems) / float64(pageSize)))
	meta := response.MetaPagination{
		Page:       page,
		PageSize:   pageSize,
		TotalItems: totalItems,
		TotalPages: totalPages,
	}

	response.JSON(w, http.StatusOK, list, meta)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID audio không hợp lệ", nil)
		return
	}

	userID := middleware.GetUserID(r.Context())
	a, err := h.service.GetByID(r.Context(), id, userID)
	if err != nil {
		response.InternalServerError(w, err.Error())
		return
	}
	if a == nil {
		response.NotFound(w, "AUDIO_NOT_FOUND", "Không tìm thấy audio")
		return
	}

	response.JSON(w, http.StatusOK, a, nil)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID audio không hợp lệ", nil)
		return
	}

	var req UpdateAudioRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_BODY", "Dữ liệu JSON không hợp lệ", nil)
		return
	}

	if err := h.service.Update(r.Context(), id, req); err != nil {
		response.BadRequest(w, "UPDATE_FAILED", err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, map[string]bool{"updated": true}, nil)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID audio không hợp lệ", nil)
		return
	}

	if err := h.service.Delete(r.Context(), id); err != nil {
		response.InternalServerError(w, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]bool{"deleted": true}, nil)
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID audio không hợp lệ", nil)
		return
	}

	userID := middleware.GetUserID(r.Context())
	a, err := h.service.Refresh(r.Context(), id, userID)
	if err != nil {
		response.BadRequest(w, "REFRESH_FAILED", err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, a, nil)
}
