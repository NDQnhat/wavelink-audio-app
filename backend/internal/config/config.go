package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port           string
	DBDriver       string
	DBSource       string
	JWTSecret      string
	AllowedOrigins []string
	StaticDir      string
	EpisodeBlockSec int
}

func Load() *Config {
	port := getEnv("PORT", "8080")
	dbDriver := getEnv("DB_DRIVER", "sqlite")
	dbSource := getEnv("DB_SOURCE", "audio_library.db")
	jwtSecret := getEnv("JWT_SECRET", "super-secret-key-change-in-prod-audio-app-2026")
	originsStr := getEnv("ALLOWED_ORIGINS", "*")
	staticDir := getEnv("STATIC_DIR", "../frontend")
	blockSecStr := getEnv("EPISODE_BLOCK_SECONDS", "14400") // 4 hours default

	blockSec, err := strconv.Atoi(blockSecStr)
	if err != nil || blockSec <= 0 {
		blockSec = 14400
	}

	var origins []string
	if originsStr == "*" {
		origins = []string{"*"}
	} else {
		for _, o := range strings.Split(originsStr, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				origins = append(origins, o)
			}
		}
	}

	return &Config{
		Port:            port,
		DBDriver:        dbDriver,
		DBSource:        dbSource,
		JWTSecret:       jwtSecret,
		AllowedOrigins:  origins,
		StaticDir:       staticDir,
		EpisodeBlockSec: blockSec,
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
