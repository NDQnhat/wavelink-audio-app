package database

import (
	"fmt"
	"log/slog"
)

func (db *DB) Migrate() error {
	slog.Info("Running database migrations...", "driver", db.Driver)

	var ddl []string

	if db.Driver == "sqlite" {
		ddl = []string{
			`CREATE TABLE IF NOT EXISTS users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				username TEXT NOT NULL UNIQUE,
				email TEXT UNIQUE,
				password_hash TEXT,
				is_guest BOOLEAN NOT NULL DEFAULT 0,
				role TEXT DEFAULT 'USER',
				membership TEXT DEFAULT 'FREE',
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);`,
			`CREATE TABLE IF NOT EXISTS categories (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL UNIQUE,
				slug TEXT NOT NULL UNIQUE,
				description TEXT,
				color TEXT DEFAULT 'primary',
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);`,
			`CREATE TABLE IF NOT EXISTS tags (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL UNIQUE,
				slug TEXT NOT NULL UNIQUE,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);`,
			`CREATE TABLE IF NOT EXISTS youtube_videos (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				youtube_video_id TEXT NOT NULL UNIQUE,
				youtube_url TEXT NOT NULL,
				title TEXT NOT NULL,
				description TEXT,
				author_name TEXT,
				channel_id TEXT,
				thumbnail_url TEXT,
				duration_seconds INTEGER NOT NULL DEFAULT 0,
				category_id INTEGER,
				published_at DATETIME,
				status TEXT DEFAULT 'ACTIVE',
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
			);`,
			`CREATE TABLE IF NOT EXISTS audio_tags (
				audio_id INTEGER NOT NULL,
				tag_id INTEGER NOT NULL,
				PRIMARY KEY (audio_id, tag_id),
				FOREIGN KEY (audio_id) REFERENCES youtube_videos (id) ON DELETE CASCADE,
				FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
			);`,
			`CREATE TABLE IF NOT EXISTS episodes (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				audio_id INTEGER NOT NULL,
				episode_number INTEGER NOT NULL,
				title TEXT NOT NULL,
				start_seconds INTEGER NOT NULL DEFAULT 0,
				end_seconds INTEGER NOT NULL,
				duration_seconds INTEGER NOT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				UNIQUE (audio_id, episode_number),
				FOREIGN KEY (audio_id) REFERENCES youtube_videos (id) ON DELETE CASCADE
			);`,
			`CREATE TABLE IF NOT EXISTS listening_progress (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id INTEGER NOT NULL,
				audio_id INTEGER NOT NULL,
				episode_id INTEGER NOT NULL,
				position_seconds INTEGER NOT NULL DEFAULT 0,
				duration_seconds INTEGER NOT NULL DEFAULT 0,
				progress_percent REAL NOT NULL DEFAULT 0.0,
				completed BOOLEAN NOT NULL DEFAULT 0,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				UNIQUE (user_id, episode_id),
				FOREIGN KEY (audio_id) REFERENCES youtube_videos (id) ON DELETE CASCADE,
				FOREIGN KEY (episode_id) REFERENCES episodes (id) ON DELETE CASCADE
			);`,
			`CREATE TABLE IF NOT EXISTS listening_history (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id INTEGER NOT NULL,
				audio_id INTEGER NOT NULL,
				episode_id INTEGER NOT NULL,
				started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				ended_at DATETIME,
				duration_listened INTEGER NOT NULL DEFAULT 0,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (audio_id) REFERENCES youtube_videos (id) ON DELETE CASCADE,
				FOREIGN KEY (episode_id) REFERENCES episodes (id) ON DELETE CASCADE
			);`,
			`CREATE TABLE IF NOT EXISTS favorites (
				user_id INTEGER NOT NULL,
				audio_id INTEGER NOT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (user_id, audio_id),
				FOREIGN KEY (audio_id) REFERENCES youtube_videos (id) ON DELETE CASCADE
			);`,
		}
	} else {
		// MySQL 8.x
		ddl = []string{
			`CREATE TABLE IF NOT EXISTS users (
				id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				username VARCHAR(50) NOT NULL UNIQUE,
				email VARCHAR(100) NULL UNIQUE,
				password_hash VARCHAR(255) NULL,
				is_guest BOOLEAN NOT NULL DEFAULT FALSE,
				role VARCHAR(20) DEFAULT 'USER',
				membership VARCHAR(20) DEFAULT 'FREE',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
			`CREATE TABLE IF NOT EXISTS categories (
				id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				name VARCHAR(100) NOT NULL UNIQUE,
				slug VARCHAR(100) NOT NULL UNIQUE,
				description VARCHAR(255) NULL,
				color VARCHAR(50) NULL DEFAULT 'primary',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
			`CREATE TABLE IF NOT EXISTS tags (
				id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				name VARCHAR(50) NOT NULL UNIQUE,
				slug VARCHAR(50) NOT NULL UNIQUE,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
			`CREATE TABLE IF NOT EXISTS youtube_videos (
				id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				youtube_video_id VARCHAR(20) NOT NULL UNIQUE,
				youtube_url VARCHAR(500) NOT NULL,
				title VARCHAR(255) NOT NULL,
				description TEXT NULL,
				author_name VARCHAR(150) NULL,
				channel_id VARCHAR(100) NULL,
				thumbnail_url VARCHAR(500) NULL,
				duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
				category_id INT UNSIGNED NULL,
				published_at TIMESTAMP NULL,
				status VARCHAR(20) DEFAULT 'ACTIVE',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				INDEX idx_category (category_id),
				CONSTRAINT fk_videos_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
			`CREATE TABLE IF NOT EXISTS audio_tags (
				audio_id INT UNSIGNED NOT NULL,
				tag_id INT UNSIGNED NOT NULL,
				PRIMARY KEY (audio_id, tag_id),
				INDEX idx_tag (tag_id),
				CONSTRAINT fk_at_audio FOREIGN KEY (audio_id) REFERENCES youtube_videos (id) ON DELETE CASCADE,
				CONSTRAINT fk_at_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
			`CREATE TABLE IF NOT EXISTS episodes (
				id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				audio_id INT UNSIGNED NOT NULL,
				episode_number INT UNSIGNED NOT NULL,
				title VARCHAR(200) NOT NULL,
				start_seconds INT UNSIGNED NOT NULL DEFAULT 0,
				end_seconds INT UNSIGNED NOT NULL,
				duration_seconds INT UNSIGNED NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				UNIQUE KEY uk_audio_episode (audio_id, episode_number),
				CONSTRAINT fk_episodes_audio FOREIGN KEY (audio_id) REFERENCES youtube_videos (id) ON DELETE CASCADE
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
			`CREATE TABLE IF NOT EXISTS listening_progress (
				id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				user_id INT UNSIGNED NOT NULL,
				audio_id INT UNSIGNED NOT NULL,
				episode_id INT UNSIGNED NOT NULL,
				position_seconds INT UNSIGNED NOT NULL DEFAULT 0,
				duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
				progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
				completed BOOLEAN NOT NULL DEFAULT FALSE,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				UNIQUE KEY uk_user_episode (user_id, episode_id),
				INDEX idx_user_audio (user_id, audio_id),
				CONSTRAINT fk_lp_audio FOREIGN KEY (audio_id) REFERENCES youtube_videos (id) ON DELETE CASCADE,
				CONSTRAINT fk_lp_episode FOREIGN KEY (episode_id) REFERENCES episodes (id) ON DELETE CASCADE
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
			`CREATE TABLE IF NOT EXISTS listening_history (
				id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				user_id INT UNSIGNED NOT NULL,
				audio_id INT UNSIGNED NOT NULL,
				episode_id INT UNSIGNED NOT NULL,
				started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				ended_at TIMESTAMP NULL,
				duration_listened INT UNSIGNED NOT NULL DEFAULT 0,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				INDEX idx_user_history (user_id, created_at),
				CONSTRAINT fk_lh_audio FOREIGN KEY (audio_id) REFERENCES youtube_videos (id) ON DELETE CASCADE,
				CONSTRAINT fk_lh_episode FOREIGN KEY (episode_id) REFERENCES episodes (id) ON DELETE CASCADE
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
			`CREATE TABLE IF NOT EXISTS favorites (
				user_id INT UNSIGNED NOT NULL,
				audio_id INT UNSIGNED NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (user_id, audio_id),
				CONSTRAINT fk_fav_audio FOREIGN KEY (audio_id) REFERENCES youtube_videos (id) ON DELETE CASCADE
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`,
		}
	}

	for i, query := range ddl {
		if _, err := db.Exec(query); err != nil {
			return fmt.Errorf("migration step %d failed: %w", i+1, err)
		}
	}

	slog.Info("Database migrations completed successfully")
	return nil
}
