package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORS cấu hình chuẩn W3C và an toàn, tuân thủ danh sách whitelist allowedOrigins
func CORS(allowedOrigins string) gin.HandlerFunc {
	origins := strings.Split(allowedOrigins, ",")
	whitelist := make(map[string]bool)
	allowAll := false

	for _, o := range origins {
		trimmed := strings.TrimSpace(o)
		if trimmed == "*" {
			allowAll = true
		} else if trimmed != "" {
			whitelist[trimmed] = true
		}
	}

	return func(c *gin.Context) {
		reqOrigin := c.Request.Header.Get("Origin")

		if allowAll {
			// Chuẩn W3C: Khi Allow-Origin là "*", tuyệt đối không gửi Allow-Credentials = true
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		} else if reqOrigin != "" && whitelist[reqOrigin] {
			// Khớp với whitelist cụ thể: Cho phép Credentials an toàn
			c.Writer.Header().Set("Access-Control-Allow-Origin", reqOrigin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Vary", "Origin")
		}

		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
