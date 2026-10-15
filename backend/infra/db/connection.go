package db

import (
	"fmt"
	"log/slog"
	"time"

	"audio-app-backend/core/domain"
	"audio-app-backend/core/logic"

	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// InitDatabase khởi tạo kết nối GORM cho SQLite (dev/test) hoặc MySQL (production)
func InitDatabase(driver, source string, isProduction bool) (*gorm.DB, error) {
	var dialector gorm.Dialector

	switch driver {
	case "mysql":
		dialector = mysql.Open(source)
	case "sqlite":
		dialector = sqlite.Open(source)
	default:
		slog.Warn("Driver không xác định, sử dụng mặc định SQLite", "driver", driver)
		dialector = sqlite.Open(source)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		return nil, fmt.Errorf("không thể mở kết nối database: %w", err)
	}

	// Cấu hình Connection Pool & SQLite WAL Mode
	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(50)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	if driver == "sqlite" {
		// Bật WAL mode, busy_timeout 5s để tránh nghẽn thread và lỗi SQLITE_BUSY
		db.Exec("PRAGMA journal_mode = WAL;")
		db.Exec("PRAGMA busy_timeout = 5000;")
		db.Exec("PRAGMA synchronous = NORMAL;")
		slog.Info(" Đã kích hoạt SQLite WAL mode và busy_timeout (5000ms)")
	}

	// Kiểm tra kết nối ping thực tế
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("không thể ping cơ sở dữ liệu: %w", err)
	}
	slog.Info(" Kết nối cơ sở dữ liệu thành công", "driver", driver)

	// Khởi động Background Cleaner dọn dẹp tài khoản Guest rác
	StartGuestCleanupCron(db)

	return db, nil
}

// AutoMigrate tự động đồng bộ hóa cấu trúc Schema từ các Struct Domain
func AutoMigrate(db *gorm.DB) error {
	slog.Info("Đang chạy GORM AutoMigrate cho tất cả thực thể...")
	return db.AutoMigrate(
		&domain.User{},
		&domain.Category{},
		&domain.Tag{},
		&domain.Audio{},
		&domain.Episode{},
		&domain.ListeningProgress{},
		&domain.ListeningHistory{},
		&domain.Favorite{},
		&domain.Notification{},
		&domain.NotificationPreference{},
		&domain.MembershipOrder{},
	)
}

// SeedInitialData nạp danh mục, tag và chỉ tạo tài khoản mẫu nếu KHÔNG PHẢI Production
func SeedInitialData(db *gorm.DB, isProduction bool) error {
	// 1. Luôn Seed Thể loại cơ bản nếu trống
	var catCount int64
	db.Model(&domain.Category{}).Count(&catCount)
	if catCount == 0 {
		categories := []domain.Category{
			{Name: "Tiên Hiệp", Slug: "tien-hiep", Description: "Tu chân, phi thăng, đại đạo", Color: "primary"},
			{Name: "Kiếm Hiệp", Slug: "kiem-hiep", Description: "Giang hồ ân oán, võ lâm", Color: "warning"},
			{Name: "Huyền Huyễn", Slug: "huyen-huan", Description: "Ma pháp, thế giới kỳ ảo", Color: "accent"},
			{Name: "Trinh Thám", Slug: "trinh-tham", Description: "Phá án, suy luận, hình sự", Color: "neutral"},
			{Name: "Đô Thị", Slug: "do-thi", Description: "Thương trường, hào môn, dị năng", Color: "success"},
			{Name: "Khoa Huyễn", Slug: "khoa-huan", Description: "Tương lai, cơ giáp, tinh tế", Color: "secondary"},
		}
		for _, cat := range categories {
			db.FirstOrCreate(&cat, domain.Category{Slug: cat.Slug})
		}
	}

	// 2. Luôn Seed Thẻ cơ bản nếu trống
	var tagCount int64
	db.Model(&domain.Tag{}).Count(&tagCount)
	if tagCount == 0 {
		tags := []domain.Tag{
			{Name: "Tu tiên", Slug: "tu-tien"},
			{Name: "Audio dài", Slug: "audio-dai"},
			{Name: "Dị giới", Slug: "di-gioi"},
			{Name: "Xuyên không", Slug: "xuyen-khong"},
			{Name: "Hài hước", Slug: "hai-huoc"},
			{Name: "Trọn bộ", Slug: "tron-bo"},
		}
		for _, tag := range tags {
			db.FirstOrCreate(&tag, domain.Tag{Slug: tag.Slug})
		}
	}

	// 3. Nếu là PRODUCTION: Tuyệt đối KHÔNG tạo tài khoản mặc định và audio mẫu!
	if isProduction {
		slog.Info("🔒 Môi trường Production: Bỏ qua tạo tài khoản mẫu admin123/vip123 và truyện thử nghiệm.")
		return nil
	}

	// 4. Seed Tài khoản Mẫu cho Môi trường Development / Testing
	adminPass, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	vipPass, _ := bcrypt.GenerateFromPassword([]byte("vip123"), bcrypt.DefaultCost)
	userPass, _ := bcrypt.GenerateFromPassword([]byte("user123"), bcrypt.DefaultCost)
	vipExpiry := time.Now().Add(30 * 24 * time.Hour)

	defaultUsers := []domain.User{
		{
			Username:     "admin123",
			Email:        "admin123@audioapp.com",
			PasswordHash: string(adminPass),
			Role:         domain.RoleAdmin,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &vipExpiry,
			IsGuest:      false,
		},
		{
			Username:     "admin",
			Email:        "admin@audioapp.com",
			PasswordHash: string(adminPass),
			Role:         domain.RoleAdmin,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &vipExpiry,
			IsGuest:      false,
		},
		{
			Username:     "vip123",
			Email:        "vip123@audioapp.com",
			PasswordHash: string(vipPass),
			Role:         domain.RoleVIP,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &vipExpiry,
			IsGuest:      false,
		},
		{
			Username:     "vip_member",
			Email:        "vip@audioapp.com",
			PasswordHash: string(vipPass),
			Role:         domain.RoleVIP,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &vipExpiry,
			IsGuest:      false,
		},
		{
			Username:     "user123",
			Email:        "user123@audioapp.com",
			PasswordHash: string(userPass),
			Role:         domain.RoleUser,
			Membership:   domain.MembershipFree,
			VipExpiresAt: nil,
			IsGuest:      false,
		},
		{
			Username:     "regular_user",
			Email:        "user@audioapp.com",
			PasswordHash: string(userPass),
			Role:         domain.RoleUser,
			Membership:   domain.MembershipFree,
			VipExpiresAt: nil,
			IsGuest:      false,
		},
	}

	for _, u := range defaultUsers {
		var existing domain.User
		if err := db.Where("username = ?", u.Username).First(&existing).Error; err != nil {
			db.Create(&u)
		} else {
			// Ensure password, role, membership and vip_expires_at match specifications
			db.Model(&existing).Updates(map[string]interface{}{
				"password_hash":  u.PasswordHash,
				"role":           u.Role,
				"membership":     u.Membership,
				"vip_expires_at": u.VipExpiresAt,
			})
		}
	}

	// 5. Seed Audio mẫu kèm tập 4h
	var audioCount int64
	db.Model(&domain.Audio{}).Count(&audioCount)
	if audioCount == 0 {
		var defaultCat domain.Category
		db.First(&defaultCat, "slug = ?", "tien-hiep")

		sampleAudios := []struct {
			videoID  string
			title    string
			author   string
			duration int
		}{
			{"dQw4w9WgXcQ", "Phàm Nhân Tu Tiên - Trọn Bộ Phần 1 (26 Giờ Siêu Dài)", "Hàn Lập Audio", 93600}, // 26h
			{"jNQXAC9IVRw", "Tinh Thần Biến - Trọn Bộ Tuyệt Phẩm (12 Giờ)", "Tiêu Đỉnh Channel", 43200},     // 12h
			{"9bZkp7q19f0", "Già Thiên - Bản Đọc Độc Quyền (4 Giờ)", "Thần Thoại Ký", 14400},                // 4h
		}

		for _, s := range sampleAudios {
			audio := domain.Audio{
				YoutubeVideoID:       s.videoID,
				YoutubeURL:           fmt.Sprintf("https://www.youtube.com/watch?v=%s", s.videoID),
				Title:                s.title,
				Author:               s.author,
				ThumbnailURL:         fmt.Sprintf("https://img.youtube.com/vi/%s/hqdefault.jpg", s.videoID),
				TotalDurationSeconds: s.duration,
				CategoryID:           defaultCat.ID,
				Status:               domain.StatusActive,
				CreatedBy:            1,
			}
			if err := db.Create(&audio).Error; err == nil {
				epDrafts := logic.ComputeLogicalEpisodes(audio.ID, audio.TotalDurationSeconds, 14400)
				for _, ep := range epDrafts {
					db.Create(&domain.Episode{
						AudioID:         audio.ID,
						EpisodeNumber:   ep.EpisodeNumber,
						Title:           ep.Title,
						StartSeconds:    ep.StartSeconds,
						EndSeconds:      ep.EndSeconds,
						DurationSeconds: ep.DurationSeconds,
					})
				}
			}
		}
	}

	return nil
}

// StartGuestCleanupCron chạy nền mỗi 24h để dọn dẹp các tài khoản Guest rác cũ hơn 30 ngày
func StartGuestCleanupCron(db *gorm.DB) {
	go func() {
		ticker := time.NewTicker(24 * time.Hour)
		for range ticker.C {
			cutoff := time.Now().Add(-30 * 24 * time.Hour)
			// Xóa các guest được tạo hơn 30 ngày trước và không có tiến trình nghe nào
			res := db.Exec(`
				DELETE FROM users 
				WHERE is_guest = 1 
				  AND created_at < ? 
				  AND id NOT IN (SELECT DISTINCT user_id FROM listening_progress)
			`, cutoff)
			if res.Error == nil && res.RowsAffected > 0 {
				slog.Info("🧹 Đã dọn dẹp tài khoản khách rác cũ", "deleted_rows", res.RowsAffected)
			}
		}
	}()
}
