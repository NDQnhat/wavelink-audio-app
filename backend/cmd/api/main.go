package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"audio-app-backend/config"
	infraDB "audio-app-backend/infra/db"
	"audio-app-backend/server"
)

// enableCORS bọc router để cấp phép CORS và xử lý Preflight (OPTIONS)
func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Kiểm tra domain hợp lệ (Vercel production, preview deployments và localhost)
		isAllowed := origin == "https://wavelink-audio-app.vercel.app" ||
			origin == "http://localhost:5173" ||
			origin == "http://localhost:3000" ||
			strings.HasSuffix(origin, ".vercel.app")

		if isAllowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD")
		w.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With")

		// Trình duyệt gửi request OPTIONS (Preflight) trước khi gửi Authorization header
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	// 1. Nạp cấu hình trước
	cfg := config.Load()

	// 2. Khởi tạo Structured Logger
	opts := &slog.HandlerOptions{Level: slog.LevelInfo}
	if cfg.IsProduction() {
		slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, opts)))
	} else {
		slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, opts)))
	}
	slog.Info("🚀 Khởi động YouTube Audio Library Backend...", "env", cfg.AppEnv, "port", cfg.Port)

	// 3. Kết nối Cơ sở dữ liệu
	db, err := infraDB.InitDatabase(cfg.DBDriver, cfg.DBSource, cfg.IsProduction())
	if err != nil {
		slog.Error("Không thể kết nối cơ sở dữ liệu", "error", err)
		os.Exit(1)
	}

	// Tự động kiểm tra seed mặc định
	if err := infraDB.EnsureBaselineSeed(db, cfg.IsProduction()); err != nil {
		slog.Warn("Tự động kiểm tra seed mặc định gặp cảnh báo", "error", err)
	}

	// 4. Khởi tạo Router và các Modules
	router := server.SetupRouter(cfg, db)

	// 5. Khởi động HTTP Server với Graceful Shutdown (Bọc router qua enableCORS)
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      enableCORS(router),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 20 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		slog.Info(fmt.Sprintf("Máy chủ đang lắng nghe tại: http://localhost:%s", cfg.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Lỗi khởi động máy chủ", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("Nhận tín hiệu dừng, đang xả kết nối...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("Dừng máy chủ khẩn cấp", "error", err)
	} else {
		slog.Info("Máy chủ đã dừng an toàn (Graceful Shutdown)")
	}
}