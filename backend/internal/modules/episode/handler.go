package episode

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
	r.Get("/audios/{id}/episodes", h.GetEpisodes)
	
	// Admin routes
	r.With(middleware.RequireAdmin).Post("/audios/{id}/episodes/generate", h.GenerateEpisodes)
	r.With(middleware.RequireAdmin).Post("/episodes", h.CreateEpisode)
	r.With(middleware.RequireAdmin).Put("/episodes/{id}", h.UpdateEpisode)
	r.With(middleware.RequireAdmin).Delete("/episodes/{id}", h.DeleteEpisode)
}

func (h *Handler) GetEpisodes(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	audioID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID audio không hợp lệ", nil)
		return
	}

	userID := middleware.GetUserID(r.Context())
	list, err := h.service.GetByAudioID(r.Context(), audioID, userID)
	if err != nil {
		response.InternalServerError(w, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, list, nil)
}

func (h *Handler) GenerateEpisodes(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	audioID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID audio không hợp lệ", nil)
		return
	}

	var req GenerateEpisodesRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	blockSize := req.BlockSizeSeconds
	if blockSize <= 0 {
		blockSize = DefaultEpisodeDuration
	}

	episodes, err := h.service.Regenerate(r.Context(), audioID, req.DurationSeconds, blockSize)
	if err != nil {
		response.BadRequest(w, "GENERATE_FAILED", err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, episodes, nil)
}

func (h *Handler) UpdateEpisode(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID tập không hợp lệ", nil)
		return
	}

	var req UpdateEpisodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_BODY", "Dữ liệu JSON không hợp lệ", nil)
		return
	}

	if err := h.service.UpdateEpisode(r.Context(), id, req.Title, req.StartSeconds, req.EndSeconds); err != nil {
		response.BadRequest(w, "UPDATE_FAILED", err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"status": "updated"}, nil)
}

func (h *Handler) DeleteEpisode(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID tập không hợp lệ", nil)
		return
	}

	if err := h.service.DeleteEpisode(r.Context(), id); err != nil {
		response.InternalServerError(w, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"status": "deleted"}, nil)
}

func (h *Handler) CreateEpisode(w http.ResponseWriter, r *http.Request) {
	var req CreateEpisodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_BODY", "Dữ liệu JSON không hợp lệ", nil)
		return
	}

	id, err := h.service.CreateEpisode(r.Context(), req)
	if err != nil {
		response.BadRequest(w, "CREATE_FAILED", err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusCreated, map[string]interface{}{"id": id, "status": "created"}, nil)
}
