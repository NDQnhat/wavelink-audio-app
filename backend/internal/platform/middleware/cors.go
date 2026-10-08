package middleware

import (
	"net/http"

	"github.com/go-chi/cors"
)

func NewCORS(allowedOrigins []string) func(http.Handler) http.Handler {
	if len(allowedOrigins) == 1 && allowedOrigins[0] == "*" {
		return cors.Handler(cors.Options{
			AllowedOrigins:   []string{"*"},
			AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
			AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Guest-ID", "Range"},
			ExposedHeaders:   []string{"Link", "Content-Range", "X-Guest-ID"},
			AllowCredentials: false,
			MaxAge:           86400,
		})
	}

	return cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Guest-ID", "Range"},
		ExposedHeaders:   []string{"Link", "Content-Range", "X-Guest-ID"},
		AllowCredentials: true,
		MaxAge:           86400,
	})
}
