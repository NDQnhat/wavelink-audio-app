package user

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
	// Protected routes for current user
	r.With(middleware.RequireAuth).Get("/users/me", h.GetMe)
	r.With(middleware.RequireAuth).Put("/users/me", h.UpdateProfile)
	r.With(middleware.RequireAuth).Put("/users/me/password", h.UpdatePassword)

	// Admin routes
	r.With(middleware.RequireAdmin).Get("/users", h.GetAll)
	r.With(middleware.RequireAdmin).Put("/users/{id}", h.UpdateRoleMembership)
	r.With(middleware.RequireAdmin).Delete("/users/{id}", h.Delete)
}

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	u, err := h.service.GetMe(r.Context(), userID)
	if err != nil {
		response.InternalServerError(w, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, u, nil)
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_BODY", "Invalid JSON body", nil)
		return
	}

	userID := middleware.GetUserID(r.Context())
	if err := h.service.UpdateProfile(r.Context(), userID, req); err != nil {
		response.BadRequest(w, "UPDATE_FAILED", err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, map[string]bool{"success": true}, nil)
}

func (h *Handler) UpdatePassword(w http.ResponseWriter, r *http.Request) {
	var req UpdatePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_BODY", "Invalid JSON body", nil)
		return
	}

	userID := middleware.GetUserID(r.Context())
	if err := h.service.UpdatePassword(r.Context(), userID, req); err != nil {
		response.BadRequest(w, "UPDATE_FAILED", err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, map[string]bool{"success": true}, nil)
}

func (h *Handler) GetAll(w http.ResponseWriter, r *http.Request) {
	users, err := h.service.GetAll(r.Context())
	if err != nil {
		response.InternalServerError(w, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, users, nil)
}

func (h *Handler) UpdateRoleMembership(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID không hợp lệ", nil)
		return
	}

	var req AdminUpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_BODY", "Invalid JSON body", nil)
		return
	}

	if err := h.service.UpdateRoleMembership(r.Context(), id, req); err != nil {
		response.InternalServerError(w, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]bool{"success": true}, nil)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.BadRequest(w, "INVALID_ID", "ID không hợp lệ", nil)
		return
	}

	if err := h.service.Delete(r.Context(), id); err != nil {
		response.InternalServerError(w, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]bool{"success": true}, nil)
}
