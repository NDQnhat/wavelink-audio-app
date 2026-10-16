package community

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"audio-app-backend/core/domain"
	"audio-app-backend/server/middleware"
	"audio-app-backend/server/response"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Không thể khởi tạo sqlite memory db: %v", err)
	}

	err = db.AutoMigrate(
		&domain.User{},
		&domain.Audio{},
		&domain.Episode{},
		&domain.ListeningHistory{},
		&domain.CommunityMessage{},
	)
	if err != nil {
		t.Fatalf("Lỗi migrate: %v", err)
	}

	return db
}

func TestCommunityEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)

	// Tạo dữ liệu mẫu
	vipExp := time.Now().Add(90 * 24 * time.Hour)
	userVip := domain.User{
		Username:     "vip_tester",
		Email:        "vip@test.com",
		Role:         domain.RoleVIP,
		Membership:   domain.MembershipVIP,
		VipExpiresAt: &vipExp,
	}
	db.Create(&userVip)

	userNormal := domain.User{
		Username:   "normal_tester",
		Email:      "normal@test.com",
		Role:       domain.RoleUser,
		Membership: domain.MembershipFree,
	}
	db.Create(&userNormal)

	audio := domain.Audio{
		Title:                "Truyện Kiếm Hiệp Tuyệt Phẩm",
		YoutubeVideoID:       "vid123",
		YoutubeURL:           "https://youtube.com/watch?v=vid123",
		TotalDurationSeconds: 14400,
	}
	db.Create(&audio)

	db.Create(&domain.ListeningHistory{
		UserID:           userVip.ID,
		AudioID:          audio.ID,
		DurationListened: 7200,
		CreatedAt:        time.Now(),
	})

	jwtSecret := "test_secret_key_123"
	token, _ := middleware.GenerateToken(userVip, jwtSecret)

	r := gin.New()
	r.Use(middleware.SessionMiddleware(jwtSecret))

	handler := NewHandler(db)
	v1 := r.Group("/api/v1")
	handler.RegisterRoutes(v1)

	// 1. Test Get Top Listeners
	t.Run("GET /api/v1/community/leaderboard/top-listeners", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/community/leaderboard/top-listeners", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var res response.Envelope
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		items, ok := res.Data.([]interface{})
		if !ok || len(items) == 0 {
			t.Fatalf("Expected non-empty top listeners, got: %v", res.Data)
		}
	})

	// 2. Test Get VIP Leaderboard
	t.Run("GET /api/v1/community/leaderboard/vip", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/community/leaderboard/vip", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var res response.Envelope
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		items, ok := res.Data.([]interface{})
		if !ok || len(items) == 0 {
			t.Fatalf("Expected non-empty VIP members, got: %v", res.Data)
		}
	})

	// 3. Test Send Message with shared story
	t.Run("POST /api/v1/community/messages", func(t *testing.T) {
		body := map[string]interface{}{
			"message":       "Cùng nghe truyện này nhé!",
			"sharedAudioId": audio.ID,
		}
		jsonBytes, _ := json.Marshal(body)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/community/messages", bytes.NewReader(jsonBytes))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var res response.Envelope
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		dataMap, ok := res.Data.(map[string]interface{})
		if !ok {
			t.Fatalf("Expected object data, got: %v", res.Data)
		}
		if dataMap["username"] != "vip_tester" {
			t.Fatalf("Expected username vip_tester, got %v", dataMap["username"])
		}
		if dataMap["sharedAudioId"] == nil {
			t.Fatalf("Expected sharedAudioId to be present")
		}
	})

	// 4. Test Get Messages
	t.Run("GET /api/v1/community/messages", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/community/messages", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var res response.Envelope
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		items, ok := res.Data.([]interface{})
		if !ok || len(items) == 0 {
			t.Fatalf("Expected at least 1 message, got: %v", res.Data)
		}
	})

	// 5. Test Guest Send Message: Must display as Guest, never any other user
	t.Run("POST /api/v1/community/messages as Guest", func(t *testing.T) {
		body := map[string]interface{}{
			"message": "Tôi là độc giả vãng lai vào nghe thử",
		}
		jsonBytes, _ := json.Marshal(body)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/community/messages", bytes.NewReader(jsonBytes))
		req.Header.Set("Content-Type", "application/json")
		// No auth token -> Guest
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var res response.Envelope
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		dataMap, ok := res.Data.(map[string]interface{})
		if !ok {
			t.Fatalf("Expected object data, got: %v", res.Data)
		}
		if dataMap["username"] != "Khách Nghe Thử" {
			t.Fatalf("Expected username 'Khách Nghe Thử', got '%v'", dataMap["username"])
		}
		if dataMap["role"] != domain.RoleGuest {
			t.Fatalf("Expected role GUEST, got '%v'", dataMap["role"])
		}
	})

	// 6. Test Admin endpoints
	adminUser := domain.User{
		Username:   "admin_tester",
		Email:      "admin@test.com",
		Role:       domain.RoleAdmin,
		Membership: domain.MembershipVIP,
	}
	db.Create(&adminUser)
	adminToken, _ := middleware.GenerateToken(adminUser, jwtSecret)

	t.Run("GET /api/v1/community/stats as Admin", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/community/stats", nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
		}
		var res response.Envelope
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		statsMap, ok := res.Data.(map[string]interface{})
		if !ok || statsMap["totalMessages"] == nil {
			t.Fatalf("Expected totalMessages in stats, got %v", res.Data)
		}
	})

	t.Run("DELETE /api/v1/community/messages/:id as Admin", func(t *testing.T) {
		var firstMsg domain.CommunityMessage
		db.First(&firstMsg)

		req := httptest.NewRequest(http.MethodDelete, "/api/v1/community/messages/1", nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
		}
	})

	t.Run("DELETE /api/v1/community/messages as Admin", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/community/messages", nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var count int64
		db.Model(&domain.CommunityMessage{}).Count(&count)
		if count != 0 {
			t.Fatalf("Expected 0 messages after clear, got %d", count)
		}
	})
}
