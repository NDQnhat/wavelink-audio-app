package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"audio-app-backend/internal/config"
	"audio-app-backend/internal/modules/audio"
	"audio-app-backend/internal/modules/auth"
	"audio-app-backend/internal/modules/category"
	"audio-app-backend/internal/modules/episode"
	"audio-app-backend/internal/modules/favorite"
	"audio-app-backend/internal/modules/history"
	"audio-app-backend/internal/modules/progress"
	"audio-app-backend/internal/modules/stats"
	"audio-app-backend/internal/modules/tag"
	"audio-app-backend/internal/modules/user"
	"audio-app-backend/internal/platform/database"
	"audio-app-backend/internal/platform/logger"
	"audio-app-backend/internal/platform/middleware"
	"audio-app-backend/internal/platform/response"

	"github.com/go-chi/chi/v5"
)

func main() {
	// 1. Khởi tạo Structured Logger
	logger.Init()
	slog.Info("Starting Audio Library Backend Service...")

	// 2. Nạp cấu hình
	cfg := config.Load()

	// 3. Kết nối Cơ sở Dữ liệu
	db, err := database.Connect(cfg.DBDriver, cfg.DBSource)
	if err != nil {
		slog.Warn("Kết nối cấu hình DB mặc định thất bại, thử chuyển sang SQLite cục bộ", "error", err)
		// Fallback an toàn sang SQLite nếu MySQL chưa tạo database/password
		db, err = database.Connect("sqlite", "audio_library.db")
		if err != nil {
			slog.Error("Không thể kết nối cơ sở dữ liệu", "error", err)
			os.Exit(1)
		}
	}
	defer db.Close()

	// 4. Chạy Migration và Seed dữ liệu mẫu
	if err := db.Migrate(); err != nil {
		slog.Error("Lỗi khởi tạo Migration", "error", err)
		os.Exit(1)
	}
	if err := db.Seed(); err != nil {
		slog.Warn("Lỗi seed dữ liệu", "error", err)
	}

	// 5. Khởi tạo các Modules độc lập (Modular Monolith)
	categoryRepo := category.NewRepository(db.DB)
	categoryService := category.NewService(categoryRepo)
	categoryHandler := category.NewHandler(categoryService)

	tagRepo := tag.NewRepository(db.DB)
	tagService := tag.NewService(tagRepo)
	tagHandler := tag.NewHandler(tagService)

	authRepo := auth.NewRepository(db.DB)
	authService := auth.NewService(authRepo, cfg.JWTSecret)
	authHandler := auth.NewHandler(authService)

	userRepo := user.NewRepository(db.DB)
	userService := user.NewService(userRepo)
	userHandler := user.NewHandler(userService)

	episodeRepo := episode.NewRepository(db.DB)
	episodeService := episode.NewService(episodeRepo)
	episodeHandler := episode.NewHandler(episodeService)

	audioRepo := audio.NewRepository(db.DB, episodeRepo)
	audioService := audio.NewService(audioRepo, episodeRepo, cfg.EpisodeBlockSec)
	audioHandler := audio.NewHandler(audioService)

	progressRepo := progress.NewRepository(db.DB, db.Driver)
	progressService := progress.NewService(progressRepo)
	progressHandler := progress.NewHandler(progressService)

	historyRepo := history.NewRepository(db.DB)
	historyService := history.NewService(historyRepo)
	historyHandler := history.NewHandler(historyService)

	favRepo := favorite.NewRepository(db.DB)
	favService := favorite.NewService(favRepo)
	favHandler := favorite.NewHandler(favService)

	statsService := stats.NewService(db.DB)
	statsHandler := stats.NewHandler(statsService)

	// 6. Cấu hình Chi Router và Middleware
	r := chi.NewRouter()
	r.Use(middleware.Recovery)
	r.Use(middleware.RequestLogger)
	r.Use(middleware.NewCORS(cfg.AllowedOrigins))
	r.Use(middleware.SessionMiddleware(cfg.JWTSecret))

	// Healthcheck Endpoint
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		response.JSON(w, http.StatusOK, map[string]interface{}{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"dbDriver":  db.Driver,
		}, nil)
	})

	// API v1 Routing
	r.Route("/api/v1", func(api chi.Router) {
		api.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			response.JSON(w, http.StatusOK, map[string]string{"status": "ok"}, nil)
		})

		authHandler.RegisterRoutes(api)
		userHandler.RegisterRoutes(api)
		categoryHandler.RegisterRoutes(api)
		tagHandler.RegisterRoutes(api)
		audioHandler.RegisterRoutes(api)
		episodeHandler.RegisterRoutes(api)
		progressHandler.RegisterRoutes(api)
		historyHandler.RegisterRoutes(api)
		favHandler.RegisterRoutes(api)
		statsHandler.RegisterRoutes(api)
	})

	// Static File Serving cho Frontend tĩnh
	serveStaticFiles(r, cfg.StaticDir)

	// 7. Khởi động HTTP Server với Graceful Shutdown
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 20 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		slog.Info(fmt.Sprintf("Server is listening on http://localhost:%s", cfg.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server listen error", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("Shutdown signal received, draining active connections...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("Server forced shutdown", "error", err)
	} else {
		slog.Info("Server stopped gracefully")
	}
}

func serveStaticFiles(r chi.Router, staticDir string) {
	absDir, err := filepath.Abs(staticDir)
	if err != nil {
		absDir = staticDir
	}

	if _, err := os.Stat(absDir); os.IsNotExist(err) {
		slog.Warn("Static directory does not exist, skipping static files server", "dir", absDir)
		return
	}

	fs := http.FileServer(http.Dir(absDir))
	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") || r.URL.Path == "/health" {
			http.NotFound(w, r)
			return
		}
		fs.ServeHTTP(w, r)
	})
	slog.Info("Serving frontend static files", "directory", absDir)
}
