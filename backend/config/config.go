package config

import (
	"bufio"
	"log"
	"os"
	"strconv"
	"strings"
)

const (
	DefaultJWTSecret = "audio-library-super-secret-jwt-key-2026"
	DefaultMySQLDSN  = "root:310306@tcp(127.0.0.1:3306)/audio_app?charset=utf8mb4&parseTime=True&loc=Local"
)

type Config struct {
	AppEnv              string // "development", "staging", "production"
	Port                string
	DBDriver            string
	DBSource            string
	JWTSecret           string
	StaticDir           string
	EpisodeBlockSec     int
	AllowedOrigins      string
	VietQRBankName      string
	VietQRAccountNumber string
	VietQRAccountName   string
	VietQRNotePrefix    string
}

func (c *Config) IsProduction() bool {
	return strings.EqualFold(c.AppEnv, "production")
}

// loadDotEnv đọc file .env ở thư mục hiện tại hoặc thư mục backend nếu có
func loadDotEnv() {
	paths := []string{".env", "backend/.env", "../.env"}
	for _, p := range paths {
		f, err := os.Open(p)
		if err != nil {
			continue
		}
		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				k := strings.TrimSpace(parts[0])
				v := strings.TrimSpace(parts[1])
				// Chỉ set nếu chưa có trong os.Env
				if os.Getenv(k) == "" {
					os.Setenv(k, v)
				}
			}
		}
		f.Close()
		break
	}
}

func Load() *Config {
	loadDotEnv()

	appEnv := getEnv("APP_ENV", "development")
	port := getEnv("PORT", "8080")
	dbDriver := getEnv("DB_DRIVER", "mysql")
	dbSource := getEnv("DB_SOURCE", DefaultMySQLDSN)
	jwtSecret := getEnv("JWT_SECRET", DefaultJWTSecret)
	staticDir := getEnv("STATIC_DIR", "../frontend")
	allowedOrigins := getEnv("ALLOWED_ORIGINS", "*")

	// Đọc EPISODE_BLOCK_SECONDS (khớp với .env.example) và fallback sang EPISODE_BLOCK_SEC
	blockSecStr := os.Getenv("EPISODE_BLOCK_SECONDS")
	if blockSecStr == "" {
		blockSecStr = getEnv("EPISODE_BLOCK_SEC", "14400")
	}
	blockSec, err := strconv.Atoi(blockSecStr)
	if err != nil || blockSec <= 0 {
		blockSec = 14400
	}

	cfg := &Config{
		AppEnv:              appEnv,
		Port:                port,
		DBDriver:            dbDriver,
		DBSource:            dbSource,
		JWTSecret:           jwtSecret,
		StaticDir:           staticDir,
		EpisodeBlockSec:     blockSec,
		AllowedOrigins:      allowedOrigins,
		VietQRBankName:      getEnv("VIETQR_BANK_NAME", "MB Bank (Quân Đội)"),
		VietQRAccountNumber: getEnv("VIETQR_ACCOUNT_NUMBER", "0987654321"),
		VietQRAccountName:   getEnv("VIETQR_ACCOUNT_NAME", "COMIC AUDIO HUB"),
		VietQRNotePrefix:    getEnv("VIETQR_NOTE_PREFIX", "VIP"),
	}

	// Kiểm tra an toàn: Nếu môi trường là Production, tuyệt đối cấm dùng JWT Secret mặc định
	if cfg.IsProduction() && (cfg.JWTSecret == DefaultJWTSecret || cfg.JWTSecret == "") {
		log.Fatal("LỖI BẢO MẬT PRODUCTION: Biến môi trường JWT_SECRET bắt buộc phải được cấu hình riêng và không được dùng khóa mặc định!")
	}

	return cfg
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
