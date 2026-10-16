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

	// Luôn tự động AutoMigrate để bổ sung bảng/cột mới mà không mất dữ liệu cũ
	if err := AutoMigrate(db); err != nil {
		slog.Warn("Cảnh báo GORM AutoMigrate khi khởi động", "error", err)
	}

	// Khởi động Background Cleaner dọn dẹp tài khoản Guest rác
	StartGuestCleanupCron(db)

	return db, nil
}

// AutoMigrate tự động đồng bộ hóa cấu trúc Schema từ các Struct Domain
func AutoMigrate(db *gorm.DB) error {
	slog.Info("Đang chạy GORM AutoMigrate cho tất cả thực thể...")
	err := db.AutoMigrate(
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
		&domain.SystemSetting{},
		&domain.CommunityMessage{},
	)
	if err != nil {
		slog.Warn("GORM AutoMigrate gặp cảnh báo", "error", err)
	}

	// Đảm bảo an toàn tuyệt đối cho MySQL/SQLite nếu bảng đã tồn tại từ migration cũ
	m := db.Migrator()
	if !m.HasColumn(&domain.Episode{}, "is_vip") {
		_ = m.AddColumn(&domain.Episode{}, "is_vip")
	}
	if !m.HasColumn(&domain.Audio{}, "is_vip_only") {
		_ = m.AddColumn(&domain.Audio{}, "is_vip_only")
	}
	if !m.HasColumn(&domain.Audio{}, "created_by") {
		_ = m.AddColumn(&domain.Audio{}, "created_by")
	}
	if !m.HasColumn(&domain.NotificationPreference{}, "external_audio") {
		_ = m.AddColumn(&domain.NotificationPreference{}, "external_audio")
	}
	if !m.HasColumn(&domain.NotificationPreference{}, "block_all") {
		_ = m.AddColumn(&domain.NotificationPreference{}, "block_all")
	}
	if !m.HasColumn(&domain.NotificationPreference{}, "welcome_seeded") {
		_ = m.AddColumn(&domain.NotificationPreference{}, "welcome_seeded")
	}

	return err
}

// SeedInitialData nạp danh mục, tag và chỉ tạo tài khoản mẫu nếu KHÔNG PHẢI Production
func SeedInitialData(db *gorm.DB, isProduction bool) error {
	// 1. Luôn Seed Thể loại đầy đủ
	categories := []domain.Category{
		{Name: "Xuyên Không", Slug: "xuyen-khong", Description: "Du hành không gian, xuyên qua thế giới khác", Color: "primary"},
		{Name: "Xuyên Nhanh", Slug: "xuyen-nhanh", Description: "Khoái xuyên, thực hiện nhiệm vụ qua nhiều thế giới", Color: "secondary"},
		{Name: "Sảng Văn", Slug: "sang-van", Description: "Nội dung giải trí, nhân vật chính bá đạo thuận buồm xuôi gió", Color: "warning"},
		{Name: "Hệ Thống", Slug: "he-thong", Description: "Nhân vật chính sở hữu hệ thống hỗ trợ", Color: "accent"},
		{Name: "Trọng Sinh", Slug: "trong-sinh", Description: "Chết đi sống lại, bắt đầu lại cuộc đời", Color: "success"},
		{Name: "Võng Du", Slug: "vong-du", Description: "Thế giới game online, thực tế ảo", Color: "neutral"},
		{Name: "Mạt Thế", Slug: "mat-the", Description: "Tận thế, thây ma, sinh tồn khắc nghiệt", Color: "danger"},
		{Name: "Dị Năng", Slug: "di-nang", Description: "Năng lực đặc biệt, siêu năng lực", Color: "primary"},
		{Name: "Vô Địch Lưu", Slug: "vo-dich", Description: "Vừa xuất hiện đã vô địch thiên hạ", Color: "warning"},
		{Name: "Lịch Sử Quân Sự", Slug: "lich-su-quan-su", Description: "Chiến tranh, mưu lược, cải biến lịch sử", Color: "secondary"},
		{Name: "Linh Dị Ma Quái", Slug: "ma-kinh-di", Description: "Kinh dị, trừ tà, bắt ma quái", Color: "neutral"},
		{Name: "Đồng Nhân", Slug: "dong-nhan", Description: "Phóng tác dựa trên tác phẩm hoặc nhân vật có sẵn", Color: "accent"},
		{Name: "Cung Đấu Gia Đấu", Slug: "cung-dau", Description: "Tranh giành quyền lực chốn hoàng cung, gia tộc", Color: "danger"},
		{Name: "Khoa Huyễn", Slug: "khoa-huyen", Description: "Khoa học viễn tưởng, tương lai, cơ giáp, tinh tế", Color: "secondary"},
		{Name: "Huyền Huyễn", Slug: "huyen-huyen", Description: "Ma pháp, thế giới kỳ ảo, tu vi phân tầng", Color: "accent"},
		{Name: "Tiên Hiệp", Slug: "tien-hiep", Description: "Tu chân, phi thăng, đại đạo, nghịch thiên", Color: "primary"},
		{Name: "Kiếm Hiệp", Slug: "kiem-hiep", Description: "Giang hồ ân oán, võ lâm hiệp nghĩa", Color: "warning"},
		{Name: "Đô Thị", Slug: "do-thi", Description: "Thương trường, hào môn, đời sống hiện đại", Color: "success"},
		{Name: "Dị Giới", Slug: "di-gioi", Description: "Thế giới song song, nền văn minh khác biệt", Color: "primary"},
		{Name: "Kỳ Huyễn", Slug: "ky-huyen", Description: "Huyền bí, phép thuật Tây phương, rồng và ma thuật", Color: "secondary"},
	}
	for _, cat := range categories {
		var existing domain.Category
		if err := db.Where("slug = ? OR name = ?", cat.Slug, cat.Name).First(&existing).Error; err == nil {
			db.Model(&existing).Updates(map[string]interface{}{
				"name":        cat.Name,
				"slug":        cat.Slug,
				"description": cat.Description,
				"color":       cat.Color,
			})
		} else {
			db.Create(&cat)
		}
	}

	// 2. Luôn Seed Thẻ phân loại đầy đủ
	tags := []domain.Tag{
		{Name: "Xuyên Không", Slug: "xuyen-khong"},
		{Name: "Xuyên Nhanh", Slug: "xuyen-nhanh"},
		{Name: "Xuyên Qua Dị Giới", Slug: "xuyen-qua-di-gioi"},
		{Name: "Xuyên Thư", Slug: "xuyen-thu"},
		{Name: "Phản Xuyên", Slug: "phan-xuyen"},
		{Name: "Vô Địch Lưu", Slug: "vo-dich-luu"},
		{Name: "Cẩu Đạo", Slug: "cau-dao"},
		{Name: "Hắc Ám", Slug: "hac-am"},
		{Name: "Vả Mặt", Slug: "va-mat"},
		{Name: "Thông Minh", Slug: "thong-minh"},
		{Name: "Hài Bựa", Slug: "hai-bua"},
		{Name: "Điểm Danh", Slug: "diem-danh"},
		{Name: "Không Gian Tùy Thân", Slug: "khong-gian-tuy-than"},
		{Name: "Tiến Hóa Vô Hạn", Slug: "tien-hoa-vo-han"},
		{Name: "Trăm Lần Bạo Kích", Slug: "tram-lan-bao-kich"},
		{Name: "Đô Thị Tu Tiên", Slug: "do-thi-tu-tien"},
		{Name: "Thần Hào", Slug: "than-hao"},
		{Name: "Hậu Cung", Slug: "hau-cung"},
		{Name: "Đơn Nữ Chính", Slug: "don-nu-chinh"},
		{Name: "Không Nữ Chính", Slug: "khong-nu-chinh"},
		{Name: "Toàn Dân Chuyển Chức", Slug: "toan-dan-chuyen-chuc"},
		{Name: "Lãnh Chúa Chiến Tranh", Slug: "lanh-chua-chien-tranh"},
		{Name: "Quy Tắc Quái Đàm", Slug: "quy-tac-quai-dam"},
		{Name: "Sát Phạt Quyết Đoán", Slug: "sat-phat-quyet-doan"},
		{Name: "Heo Ăn Thịt Hổ", Slug: "heo-an-thit-ho"},
		{Name: "Giả HEO Ăn Hổ", Slug: "gia-heo-an-ho"},
		{Name: "Nuôi Thú Cưng", Slug: "nuoi-thu-cung"},
		{Name: "Tận Thế Tái Sinh", Slug: "tan-the-tai-sinh"},
		{Name: "Full Trọn Bộ", Slug: "full-tron-bo"},
		{Name: "Siêu Phẩm Cày Đêm", Slug: "sieu-pham-cay-dem"},
		{Name: "Trên 1000 Chương", Slug: "tren-1000-chuong"},
		{Name: "Tiến Độ Nhanh", Slug: "tien-do-nhanh"},
	}
	for _, tag := range tags {
		var existing domain.Tag
		if err := db.Where("slug = ? OR name = ?", tag.Slug, tag.Name).First(&existing).Error; err == nil {
			db.Model(&existing).Updates(map[string]interface{}{
				"name": tag.Name,
				"slug": tag.Slug,
			})
		} else {
			db.Create(&tag)
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
		{
			Username:     "HoangAudio",
			Email:        "hoang@audioapp.com",
			PasswordHash: string(vipPass),
			Role:         domain.RoleVIP,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &vipExpiry,
			IsGuest:      false,
		},
		{
			Username:     "MinhNhat99",
			Email:        "minhnhat@audioapp.com",
			PasswordHash: string(vipPass),
			Role:         domain.RoleVIP,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &vipExpiry,
			IsGuest:      false,
		},
		{
			Username:     "LanAnh_VIP",
			Email:        "lananh@audioapp.com",
			PasswordHash: string(vipPass),
			Role:         domain.RoleVIP,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &vipExpiry,
			IsGuest:      false,
		},
		{
			Username:     "TieuViVu",
			Email:        "tieuvivu@audioapp.com",
			PasswordHash: string(userPass),
			Role:         domain.RoleUser,
			Membership:   domain.MembershipFree,
			VipExpiresAt: nil,
			IsGuest:      false,
		},
		{
			Username:     "BachNgocSach",
			Email:        "bachngoc@audioapp.com",
			PasswordHash: string(vipPass),
			Role:         domain.RoleVIP,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &vipExpiry,
			IsGuest:      false,
		},
		{
			Username:     "PhongVanAudio",
			Email:        "phongvan@audioapp.com",
			PasswordHash: string(vipPass),
			Role:         domain.RoleVIP,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &vipExpiry,
			IsGuest:      false,
		},
		{
			Username:     "ThienDaoDocGia",
			Email:        "thiendao@audioapp.com",
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

// StartGuestCleanupCron chạy nền dọn dẹp toàn bộ tài khoản khách rác cũ để tối ưu DB
func StartGuestCleanupCron(db *gorm.DB) {
	go func() {
		cleanup := func() {
			if !db.Migrator().HasTable("users") {
				return
			}
			// Xóa các guest cũ và tiến trình/lịch sử mồ côi
			res := db.Exec(`
				DELETE FROM users 
				WHERE is_guest = 1
			`)
			if res.Error == nil && res.RowsAffected > 0 {
				slog.Info("🧹 Đã dọn dẹp tài khoản khách rác cũ trong DB", "deleted_rows", res.RowsAffected)
			}
			if db.Migrator().HasTable("listening_progress") {
				db.Exec(`DELETE FROM listening_progress WHERE user_id NOT IN (SELECT id FROM users)`)
			}
			if db.Migrator().HasTable("listening_history") {
				db.Exec(`DELETE FROM listening_history WHERE user_id NOT IN (SELECT id FROM users)`)
			}
		}

		cleanup()
		ticker := time.NewTicker(24 * time.Hour)
		for range ticker.C {
			cleanup()
		}
	}()
}
