package auth

import (
	"encoding/json"
	"net/http"

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
	r.Post("/auth/register", h.Register)
	r.Post("/auth/login", h.Login)
	r.Post("/auth/guest", h.Guest)
	r.Get("/auth/me", h.Me)
	r.Post("/auth/logout", h.Logout)
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_BODY", "Dữ liệu JSON không hợp lệ", nil)
		return
	}

	res, err := h.service.Register(r.Context(), req)
	if err != nil {
		response.BadRequest(w, "REGISTER_FAILED", err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusCreated, res, nil)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "INVALID_BODY", "Dữ liệu JSON không hợp lệ", nil)
		return
	}

	res, err := h.service.Login(r.Context(), req)
	if err != nil {
		response.BadRequest(w, "LOGIN_FAILED", err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, res, nil)
}

func (h *Handler) Guest(w http.ResponseWriter, r *http.Request) {
	res, err := h.service.GuestLogin(r.Context())
	if err != nil {
		response.InternalServerError(w, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, res, nil)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	user, err := h.service.GetMe(r.Context(), userID)
	if err != nil || user == nil {
		response.JSON(w, http.StatusOK, map[string]interface{}{
			"id":       userID,
			"username": middleware.GetGuestID(r.Context()),
			"isGuest":  middleware.IsGuest(r.Context()),
		}, nil)
		return
	}
	response.JSON(w, http.StatusOK, user, nil)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, map[string]bool{"loggedOut": true}, nil)
}
