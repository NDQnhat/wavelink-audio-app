package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"audio-app-backend/internal/platform/response"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)
		slog.Info("HTTP Request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", wrapped.statusCode,
			"duration", duration.String(),
			"remote_ip", r.RemoteAddr,
		)
	})
}

func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("Panic recovered",
					"error", rec,
					"stack", string(debug.Stack()),
				)
				response.InternalServerError(w, "Máy chủ đã gặp lỗi không mong muốn")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
