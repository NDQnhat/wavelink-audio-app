package server_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"audio-app-backend/config"
	infraDB "audio-app-backend/infra/db"
	"audio-app-backend/server"
	"audio-app-backend/server/response"
)

func setupTestApp(t *testing.T) http.Handler {
	testDBPath := "test_audio_library.db"
	_ = os.Remove(testDBPath)

	cfg := &config.Config{
		Port:            "8080",
		DBDriver:        "sqlite",
		DBSource:        testDBPath,
		JWTSecret:       "test-secret-key-1234567890123456",
		StaticDir:       "../../frontend",
		EpisodeBlockSec: 14400,
		AllowedOrigins:  "*",
	}

	db, err := infraDB.InitDatabase(cfg.DBDriver, cfg.DBSource, false)
	if err != nil {
		t.Fatalf("Failed to init test database: %v", err)
	}

	if err := infraDB.AutoMigrate(db); err != nil {
		t.Fatalf("Failed to auto-migrate test database: %v", err)
	}
	if err := infraDB.SeedInitialData(db, false); err != nil {
		t.Fatalf("Failed to seed test database: %v", err)
	}

	t.Cleanup(func() {
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			_ = sqlDB.Close()
		}
		_ = os.Remove(testDBPath)
	})

	return server.SetupRouter(cfg, db)
}

func TestEndToEndAPI(t *testing.T) {
	app := setupTestApp(t)

	// 1. Healthcheck
	t.Run("Health check", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		w := httptest.NewRecorder()
		app.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d", w.Code)
		}
	})

	// 2. Guest Login
	var guestToken string
	t.Run("Guest 1-Click Login", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/guest", nil)
		w := httptest.NewRecorder()
		app.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var res response.Envelope
		if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
			t.Fatalf("Invalid JSON: %v", err)
		}
		if !res.Success {
			t.Fatalf("Expected success=true, got error: %+v", res.Error)
		}

		dataMap := res.Data.(map[string]interface{})
		guestToken = dataMap["token"].(string)
		if guestToken == "" {
			t.Fatal("Guest token is empty")
		}
	})

	// 3. Admin Login
	var adminToken string
	t.Run("Admin Login", func(t *testing.T) {
		payload := map[string]string{
			"username": "admin",
			"password": "admin123",
		}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		app.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var res response.Envelope
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		dataMap := res.Data.(map[string]interface{})
		adminToken = dataMap["token"].(string)
		if adminToken == "" {
			t.Fatal("Admin token is empty")
		}
	})

	// 4. List Categories
	t.Run("List Categories with Counts", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/categories", nil)
		w := httptest.NewRecorder()
		app.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d", w.Code)
		}
		var res response.Envelope
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		cats := res.Data.([]interface{})
		if len(cats) == 0 {
			t.Fatal("Expected seeded categories, got empty")
		}
	})

	// 5. List Audios & Verify 4h Episodes
	var targetAudioID float64
	var targetEpisodeID float64
	t.Run("List Audios & Inspect Seeded Stories", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/audios", nil)
		req.Header.Set("Authorization", "Bearer "+guestToken)
		w := httptest.NewRecorder()
		app.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d", w.Code)
		}
		var res response.Envelope
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		audios := res.Data.([]interface{})
		if len(audios) == 0 {
			t.Fatal("Expected seeded audios, got empty")
		}

		firstAudio := audios[0].(map[string]interface{})
		targetAudioID = firstAudio["id"].(float64)
		if firstAudio["formattedDuration"] == "" {
			t.Fatal("Formatted duration is missing")
		}
	})

	// 6. Get Audio Detail with Episodes & Resume State
	t.Run("Get Audio Detail with Continuous Episodes", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/audios/%.0f", targetAudioID), nil)
		req.Header.Set("Authorization", "Bearer "+guestToken)
		w := httptest.NewRecorder()
		app.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d", w.Code)
		}
		var res response.Envelope
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		audioData := res.Data.(map[string]interface{})

		eps := audioData["episodes"].([]interface{})
		if len(eps) == 0 {
			t.Fatal("Expected episodes list, got 0")
		}
		firstEp := eps[0].(map[string]interface{})
		targetEpisodeID = firstEp["id"].(float64)

		if audioData["currentEpisodeNumber"].(float64) != 1 {
			t.Fatalf("Expected resume episode 1, got %v", audioData["currentEpisodeNumber"])
		}
	})

	// 7. Update Progress (Sync 60s & Seek)
	t.Run("Sync Progress & Verify UPSERT", func(t *testing.T) {
		payload := map[string]interface{}{
			"audioId":         targetAudioID,
			"episodeId":       targetEpisodeID,
			"positionSeconds": 3600, // 1 hour into episode
			"progressPercent": 25.0,
			"completed":       false,
		}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPut, "/api/v1/progress", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+guestToken)
		w := httptest.NewRecorder()
		app.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
		}

		// Verify that fetching the audio detail now shows resume at 3600 seconds!
		detailReq := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/audios/%.0f", targetAudioID), nil)
		detailReq.Header.Set("Authorization", "Bearer "+guestToken)
		detailW := httptest.NewRecorder()
		app.ServeHTTP(detailW, detailReq)

		var res response.Envelope
		_ = json.Unmarshal(detailW.Body.Bytes(), &res)
		audioData := res.Data.(map[string]interface{})
		if audioData["lastPositionSeconds"].(float64) != 3600 {
			t.Fatalf("Expected resume position 3600, got %v", audioData["lastPositionSeconds"])
		}
	})

	// 8. Toggle Favorite
	t.Run("Toggle Favorite", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/v1/favorites/%.0f", targetAudioID), nil)
		req.Header.Set("Authorization", "Bearer "+guestToken)
		w := httptest.NewRecorder()
		app.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
		}
		var res response.Envelope
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		favData := res.Data.(map[string]interface{})
		if favData["isFavorite"] != true {
			t.Fatalf("Expected isFavorite=true, got %v", favData["isFavorite"])
		}
	})

	// 9. Stats Endpoint
	t.Run("Get System & User Stats", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/stats", nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)
		w := httptest.NewRecorder()
		app.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
		}
		var res response.Envelope
		_ = json.Unmarshal(w.Body.Bytes(), &res)
		statsData := res.Data.(map[string]interface{})
		if statsData["totalAudios"].(float64) == 0 {
			t.Fatal("Expected totalAudios > 0")
		}
	})

	// 10. Update Audio Permissions (Owner/Admin only)
	t.Run("Update Audio Permissions (Reject Guest, Allow Admin)", func(t *testing.T) {
		updatePayload := map[string]interface{}{
			"title": "Tên Truyện Mới Đã Chỉnh Sửa",
		}
		body, _ := json.Marshal(updatePayload)

		// A. Guest cố tình sửa truyện của người khác -> 403 Forbidden
		guestReq := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v1/audios/%.0f", targetAudioID), bytes.NewReader(body))
		guestReq.Header.Set("Content-Type", "application/json")
		guestReq.Header.Set("Authorization", "Bearer "+guestToken)
		guestW := httptest.NewRecorder()
		app.ServeHTTP(guestW, guestReq)

		if guestW.Code != http.StatusForbidden {
			t.Fatalf("Expected 403 Forbidden for guest updating audio, got %d: %s", guestW.Code, guestW.Body.String())
		}

		// B. Admin sửa truyện -> 200 OK
		adminReq := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v1/audios/%.0f", targetAudioID), bytes.NewReader(body))
		adminReq.Header.Set("Content-Type", "application/json")
		adminReq.Header.Set("Authorization", "Bearer "+adminToken)
		adminW := httptest.NewRecorder()
		app.ServeHTTP(adminW, adminReq)

		if adminW.Code != http.StatusOK {
			t.Fatalf("Expected 200 OK for admin updating audio, got %d: %s", adminW.Code, adminW.Body.String())
		}
	})

	// 11. VIP Audio Access Protection
	t.Run("VIP Audio Protection (Reject Guest, Allow VIP/Admin)", func(t *testing.T) {
		// Admin đánh dấu truyện là VIP
		vipPayload := map[string]interface{}{
			"isVipOnly": true,
		}
		body, _ := json.Marshal(vipPayload)
		setVipReq := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v1/audios/%.0f", targetAudioID), bytes.NewReader(body))
		setVipReq.Header.Set("Content-Type", "application/json")
		setVipReq.Header.Set("Authorization", "Bearer "+adminToken)
		setVipW := httptest.NewRecorder()
		app.ServeHTTP(setVipW, setVipReq)
		if setVipW.Code != http.StatusOK {
			t.Fatalf("Failed to mark audio as VIP: %d", setVipW.Code)
		}

		// A. Khách hoặc thành viên thường cố nghe truyện VIP -> 403 Forbidden
		guestReq := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/audios/%.0f", targetAudioID), nil)
		guestReq.Header.Set("Authorization", "Bearer "+guestToken)
		guestW := httptest.NewRecorder()
		app.ServeHTTP(guestW, guestReq)

		if guestW.Code != http.StatusForbidden {
			t.Fatalf("Expected 403 Forbidden for guest accessing VIP audio, got %d: %s", guestW.Code, guestW.Body.String())
		}

		// B. Admin truy cập truyện VIP -> 200 OK
		adminReq := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/audios/%.0f", targetAudioID), nil)
		adminReq.Header.Set("Authorization", "Bearer "+adminToken)
		adminW := httptest.NewRecorder()
		app.ServeHTTP(adminW, adminReq)

		if adminW.Code != http.StatusOK {
			t.Fatalf("Expected 200 OK for admin accessing VIP audio, got %d: %s", adminW.Code, adminW.Body.String())
		}
	})

	// 12. Test Admin123, Vip123, User123 Login & Email Login (ISSUE 10)
	t.Run("Login with admin123, vip123 and user123", func(t *testing.T) {
		creds := []struct {
			username string
			password string
			role     string
		}{
			{"admin123", "admin123", "ADMIN"},
			{"vip123", "vip123", "VIP"},
			{"user123", "user123", "USER"},
			{"admin123@audioapp.com", "admin123", "ADMIN"}, // Email login
		}

		for _, cred := range creds {
			payload := map[string]string{
				"username": cred.username,
				"password": cred.password,
			}
			body, _ := json.Marshal(payload)
			req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			app.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Fatalf("Expected 200 OK for credential %q, got %d: %s", cred.username, w.Code, w.Body.String())
			}

			var res response.Envelope
			_ = json.Unmarshal(w.Body.Bytes(), &res)
			data := res.Data.(map[string]interface{})
			userMap := data["user"].(map[string]interface{})
			if userMap["role"] != cred.role {
				t.Fatalf("Expected role %s for user %s, got %s", cred.role, cred.username, userMap["role"])
			}
		}
	})

	// 13. Test Toggle Favorite (Add & Remove) (ISSUE 05)
	t.Run("Toggle Favorite (Add then Remove)", func(t *testing.T) {
		// Toggle ON
		reqOn := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/v1/favorites/%.0f/toggle", targetAudioID), nil)
		reqOn.Header.Set("Authorization", "Bearer "+guestToken)
		wOn := httptest.NewRecorder()
		app.ServeHTTP(wOn, reqOn)

		if wOn.Code != http.StatusOK {
			t.Fatalf("Expected 200 OK on toggle ON, got %d", wOn.Code)
		}
		var resOn response.Envelope
		_ = json.Unmarshal(wOn.Body.Bytes(), &resOn)
		dataOn := resOn.Data.(map[string]interface{})
		// Note: previously in test 8 we added favorite, so toggle should remove it, or if it was removed toggle adds it
		firstState := dataOn["isFavorite"].(bool)

		// Toggle again -> opposite state
		reqOff := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/v1/favorites/%.0f/toggle", targetAudioID), nil)
		reqOff.Header.Set("Authorization", "Bearer "+guestToken)
		wOff := httptest.NewRecorder()
		app.ServeHTTP(wOff, reqOff)

		if wOff.Code != http.StatusOK {
			t.Fatalf("Expected 200 OK on toggle again, got %d", wOff.Code)
		}
		var resOff response.Envelope
		_ = json.Unmarshal(wOff.Body.Bytes(), &resOff)
		dataOff := resOff.Data.(map[string]interface{})
		secondState := dataOff["isFavorite"].(bool)

		if firstState == secondState {
			t.Fatalf("Expected toggle to flip state: first=%v, second=%v", firstState, secondState)
		}
	})

	// 14. Test Consolidated History (No undefined, no duplicates) (ISSUE 04)
	t.Run("Consolidated History without undefined or duplicates", func(t *testing.T) {
		// Record history multiple times for the same audio
		for i := 0; i < 3; i++ {
			histPayload := map[string]interface{}{
				"audioId":          targetAudioID,
				"episodeId":        targetEpisodeID,
				"durationListened": 45,
			}
			histBody, _ := json.Marshal(histPayload)
			histReq := httptest.NewRequest(http.MethodPost, "/api/v1/history", bytes.NewReader(histBody))
			histReq.Header.Set("Content-Type", "application/json")
			histReq.Header.Set("Authorization", "Bearer "+guestToken)
			histW := httptest.NewRecorder()
			app.ServeHTTP(histW, histReq)
			if histW.Code != http.StatusCreated {
				t.Fatalf("Failed to record history %d: %d", i, histW.Code)
			}
		}

		// Query history
		getHistReq := httptest.NewRequest(http.MethodGet, "/api/v1/history", nil)
		getHistReq.Header.Set("Authorization", "Bearer "+guestToken)
		getHistW := httptest.NewRecorder()
		app.ServeHTTP(getHistW, getHistReq)

		if getHistW.Code != http.StatusOK {
			t.Fatalf("Expected 200 OK for history, got %d", getHistW.Code)
		}

		var res response.Envelope
		_ = json.Unmarshal(getHistW.Body.Bytes(), &res)
		items := res.Data.([]interface{})
		if len(items) == 0 {
			t.Fatal("Expected history items, got 0")
		}

		// Ensure that targetAudioID only appears ONCE
		audioCount := 0
		for _, rawItem := range items {
			item := rawItem.(map[string]interface{})
			if item["audioId"].(float64) == targetAudioID {
				audioCount++
				if item["title"] == nil || item["title"].(string) == "" || item["title"].(string) == "undefined" {
					t.Fatalf("History item has invalid title: %v", item["title"])
				}
				if item["currentEpisodeTitle"] == nil || item["currentEpisodeTitle"].(string) == "" {
					t.Fatalf("History item has invalid currentEpisodeTitle: %v", item["currentEpisodeTitle"])
				}
			}
		}
		if audioCount != 1 {
			t.Fatalf("Expected exactly 1 consolidated history item for audio %.0f, got %d duplicates", targetAudioID, audioCount)
		}
	})

	// 15. Test VIP Membership Order & Simulated QR Payment (ISSUE 13)
	t.Run("Create VIP Order & Simulate Payment", func(t *testing.T) {
		// Login as user123 (Free member)
		userPayload := map[string]string{
			"username": "user123",
			"password": "user123",
		}
		userBody, _ := json.Marshal(userPayload)
		loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(userBody))
		loginReq.Header.Set("Content-Type", "application/json")
		loginW := httptest.NewRecorder()
		app.ServeHTTP(loginW, loginReq)
		if loginW.Code != http.StatusOK {
			t.Fatalf("Login failed for user123: %d", loginW.Code)
		}
		var loginRes response.Envelope
		_ = json.Unmarshal(loginW.Body.Bytes(), &loginRes)
		user123Token := loginRes.Data.(map[string]interface{})["token"].(string)

		// Verify user123 cannot access VIP audio
		vipAccessReq := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/audios/%.0f", targetAudioID), nil)
		vipAccessReq.Header.Set("Authorization", "Bearer "+user123Token)
		vipAccessW := httptest.NewRecorder()
		app.ServeHTTP(vipAccessW, vipAccessReq)
		if vipAccessW.Code != http.StatusForbidden {
			t.Fatalf("Expected 403 Forbidden for free user accessing VIP audio, got %d", vipAccessW.Code)
		}

		// Create VIP 1 Month Order
		orderPayload := map[string]string{
			"packageId": "1_MONTH",
		}
		orderBody, _ := json.Marshal(orderPayload)
		orderReq := httptest.NewRequest(http.MethodPost, "/api/v1/membership/orders", bytes.NewReader(orderBody))
		orderReq.Header.Set("Content-Type", "application/json")
		orderReq.Header.Set("Authorization", "Bearer "+user123Token)
		orderW := httptest.NewRecorder()
		app.ServeHTTP(orderW, orderReq)
		if orderW.Code != http.StatusCreated {
			t.Fatalf("Expected 201 Created for VIP order, got %d: %s", orderW.Code, orderW.Body.String())
		}
		var orderRes response.Envelope
		_ = json.Unmarshal(orderW.Body.Bytes(), &orderRes)
		orderData := orderRes.Data.(map[string]interface{})
		orderCode := orderData["orderCode"].(string)
		if orderCode == "" || orderData["qrCodeUrl"] == "" {
			t.Fatalf("Order code or QR URL is missing: %+v", orderData)
		}

		// Simulate Payment SUCCESS
		simPayload := map[string]string{
			"status": "SUCCESS",
		}
		simBody, _ := json.Marshal(simPayload)
		simReq := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/v1/membership/orders/%s/simulate", orderCode), bytes.NewReader(simBody))
		simReq.Header.Set("Content-Type", "application/json")
		simReq.Header.Set("Authorization", "Bearer "+user123Token)
		simW := httptest.NewRecorder()
		app.ServeHTTP(simW, simReq)
		if simW.Code != http.StatusOK {
			t.Fatalf("Expected 200 OK on payment simulation, got %d: %s", simW.Code, simW.Body.String())
		}

		// Verify user123 CAN NOW access the VIP audio!
		vipAccessReq2 := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/audios/%.0f", targetAudioID), nil)
		vipAccessReq2.Header.Set("Authorization", "Bearer "+user123Token)
		vipAccessW2 := httptest.NewRecorder()
		app.ServeHTTP(vipAccessW2, vipAccessReq2)
		if vipAccessW2.Code != http.StatusOK {
			t.Fatalf("Expected 200 OK for upgraded VIP user accessing VIP audio, got %d: %s", vipAccessW2.Code, vipAccessW2.Body.String())
		}
	})

	// 16. Test Data Isolation Between User A and User B (ISSUE 07)
	t.Run("Data Isolation Between Separate Identities", func(t *testing.T) {
		// User A (guestToken) has progress and history on targetAudioID
		// Create a separate Guest B
		guestBReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/guest", nil)
		guestBW := httptest.NewRecorder()
		app.ServeHTTP(guestBW, guestBReq)
		var guestBRes response.Envelope
		_ = json.Unmarshal(guestBW.Body.Bytes(), &guestBRes)
		guestBToken := guestBRes.Data.(map[string]interface{})["token"].(string)

		// Check Guest B's history -> Must be empty!
		bHistReq := httptest.NewRequest(http.MethodGet, "/api/v1/history", nil)
		bHistReq.Header.Set("Authorization", "Bearer "+guestBToken)
		bHistW := httptest.NewRecorder()
		app.ServeHTTP(bHistW, bHistReq)
		var bHistRes response.Envelope
		_ = json.Unmarshal(bHistW.Body.Bytes(), &bHistRes)
		bItems := bHistRes.Data.([]interface{})
		if len(bItems) != 0 {
			t.Fatalf("Data Leak: Guest B saw %d history items from another user!", len(bItems))
		}

		// Reset targetAudioID to non-VIP so guest B can read details to inspect progress
		resetReq := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v1/audios/%.0f", targetAudioID), bytes.NewReader([]byte(`{"isVipOnly": false}`)))
		resetReq.Header.Set("Content-Type", "application/json")
		resetReq.Header.Set("Authorization", "Bearer "+adminToken)
		resetW := httptest.NewRecorder()
		app.ServeHTTP(resetW, resetReq)

		// Check Guest B's progress on targetAudioID -> Must be 0
		bDetailReq := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/audios/%.0f", targetAudioID), nil)
		bDetailReq.Header.Set("Authorization", "Bearer "+guestBToken)
		bDetailW := httptest.NewRecorder()
		app.ServeHTTP(bDetailW, bDetailReq)
		var bDetailRes response.Envelope
		_ = json.Unmarshal(bDetailW.Body.Bytes(), &bDetailRes)
		bAudioData, ok := bDetailRes.Data.(map[string]interface{})
		if !ok || bAudioData == nil {
			t.Fatalf("Expected audio detail data for guest B, got status %d: %s", bDetailW.Code, bDetailW.Body.String())
		}
		if bAudioData["lastPositionSeconds"].(float64) != 0 {
			t.Fatalf("Data Leak: Guest B saw lastPositionSeconds %v from user A!", bAudioData["lastPositionSeconds"])
		}
	})
}
