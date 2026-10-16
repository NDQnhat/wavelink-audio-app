-- 003_add_vip_columns.sql: Thêm cột và bảng cho tính năng VIP & Cài đặt hệ thống (MySQL 8.x)

-- 1. Bổ sung cột is_vip vào bảng episodes nếu chưa có
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'episodes' AND COLUMN_NAME = 'is_vip');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE episodes ADD COLUMN is_vip BOOLEAN NOT NULL DEFAULT FALSE', 'SELECT "Column is_vip already exists"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Bổ sung cột is_vip_only vào bảng youtube_videos nếu chưa có
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'youtube_videos' AND COLUMN_NAME = 'is_vip_only');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE youtube_videos ADD COLUMN is_vip_only BOOLEAN NOT NULL DEFAULT FALSE', 'SELECT "Column is_vip_only already exists"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Bổ sung cột created_by vào bảng youtube_videos nếu chưa có
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'youtube_videos' AND COLUMN_NAME = 'created_by');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE youtube_videos ADD COLUMN created_by INT UNSIGNED NOT NULL DEFAULT 0', 'SELECT "Column created_by already exists"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Tạo bảng system_settings nếu chưa có
CREATE TABLE IF NOT EXISTS system_settings (
    `key` VARCHAR(100) NOT NULL PRIMARY KEY,
    `value` TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Tạo bảng membership_orders nếu chưa có
CREATE TABLE IF NOT EXISTS membership_orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_code VARCHAR(50) NOT NULL UNIQUE,
    user_id INT UNSIGNED NOT NULL,
    package_id VARCHAR(30) NOT NULL,
    package_name VARCHAR(100) NOT NULL,
    amount INT NOT NULL,
    duration_days INT NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING',
    qr_code_url VARCHAR(500) NULL,
    expires_at TIMESTAMP NOT NULL,
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_user (user_id),
    INDEX idx_order_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
