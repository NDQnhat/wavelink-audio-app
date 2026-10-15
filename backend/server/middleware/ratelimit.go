package middleware

import (
	"net/http"
	"sync"
	"time"

	"audio-app-backend/server/response"

	"github.com/gin-gonic/gin"
)

type clientBucket struct {
	tokens     float64
	lastRefill time.Time
}

type RateLimiter struct {
	mu       sync.Mutex
	clients  map[string]*clientBucket
	capacity float64
	rate     float64 // tokens per second
}

// NewRateLimiter tạo bộ giới hạn tần suất theo địa chỉ IP trong bộ nhớ (In-memory Token Bucket)
func NewRateLimiter(maxPerMinute int) *RateLimiter {
	limiter := &RateLimiter{
		clients:  make(map[string]*clientBucket),
		capacity: float64(maxPerMinute),
		rate:     float64(maxPerMinute) / 60.0,
	}

	// Tự động dọn dẹp các IP không hoạt động sau 10 phút để tránh rò rỉ bộ nhớ
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			limiter.mu.Lock()
			cutoff := time.Now().Add(-10 * time.Minute)
			for ip, bucket := range limiter.clients {
				if bucket.lastRefill.Before(cutoff) {
					delete(limiter.clients, ip)
				}
			}
			limiter.mu.Unlock()
		}
	}()

	return limiter
}

func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()

		rl.mu.Lock()
		b, exists := rl.clients[ip]
		if !exists {
			b = &clientBucket{
				tokens:     rl.capacity - 1,
				lastRefill: now,
			}
			rl.clients[ip] = b
			rl.mu.Unlock()
			c.Next()
			return
		}

		// Nạp token dựa trên thời gian đã trôi qua
		elapsed := now.Sub(b.lastRefill).Seconds()
		b.tokens += elapsed * rl.rate
		if b.tokens > rl.capacity {
			b.tokens = rl.capacity
		}
		b.lastRefill = now

		if b.tokens < 1.0 {
			rl.mu.Unlock()
			response.Error(c, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau giây lát.")
			c.Abort()
			return
		}

		b.tokens -= 1.0
		rl.mu.Unlock()

		c.Next()
	}
}
