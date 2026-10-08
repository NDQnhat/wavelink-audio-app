package database

import (
	"database/sql"
	"fmt"
	"log/slog"
	"time"

	_ "github.com/go-sql-driver/mysql"
	_ "modernc.org/sqlite"
)

type DB struct {
	*sql.DB
	Driver string
}

func Connect(driver, source string) (*DB, error) {
	if driver == "" {
		driver = "sqlite"
	}
	if source == "" {
		if driver == "mysql" {
			source = "root:root@tcp(127.0.0.1:3306)/audio_library?charset=utf8mb4&parseTime=True&loc=Local"
		} else {
			source = "audio_library.db"
		}
	}

	db, err := sql.Open(driver, source)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Cấu hình Connection Pool tối ưu cho máy chủ tài nguyên thấp (1GB - 2GB RAM)
	if driver == "mysql" {
		db.SetMaxOpenConns(40)
		db.SetMaxIdleConns(10)
		db.SetConnMaxLifetime(5 * time.Minute)
		db.SetConnMaxIdleTime(2 * time.Minute)
	} else {
		// SQLite: single writer hoặc WAL mode
		db.SetMaxOpenConns(10)
		db.SetMaxIdleConns(5)
		db.SetConnMaxLifetime(1 * time.Hour)
	}

	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	slog.Info("Connected to database successfully", "driver", driver)
	return &DB{DB: db, Driver: driver}, nil
}
