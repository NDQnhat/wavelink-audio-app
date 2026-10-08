package response

import (
	"encoding/json"
	"net/http"
)

type Envelope struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Meta    interface{} `json:"meta,omitempty"`
	Error   *ErrorBody  `json:"error,omitempty"`
}

type ErrorBody struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

type MetaPagination struct {
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
	TotalItems int `json:"totalItems"`
	TotalPages int `json:"totalPages"`
}

func JSON(w http.ResponseWriter, status int, data interface{}, meta interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Envelope{
		Success: true,
		Data:    data,
		Meta:    meta,
	})
}

func Error(w http.ResponseWriter, status int, code, message string, details interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Envelope{
		Success: false,
		Error: &ErrorBody{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

func BadRequest(w http.ResponseWriter, code, message string, details interface{}) {
	Error(w, http.StatusBadRequest, code, message, details)
}

func NotFound(w http.ResponseWriter, code, message string) {
	Error(w, http.StatusNotFound, code, message, nil)
}

func InternalServerError(w http.ResponseWriter, message string) {
	Error(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", message, nil)
}

func Unauthorized(w http.ResponseWriter, message string) {
	Error(w, http.StatusUnauthorized, "UNAUTHORIZED", message, nil)
}

func Conflict(w http.ResponseWriter, code, message string, details interface{}) {
	Error(w, http.StatusConflict, code, message, details)
}
