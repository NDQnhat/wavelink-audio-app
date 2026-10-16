package db

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"time"

	"audio-app-backend/core/domain"
	"audio-app-backend/core/logic"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// CategoriesToSeed chứa danh mục 20 thể loại audio chuẩn của WaveLink
var CategoriesToSeed = []domain.Category{
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

// TagsToSeed chứa danh sách 32 thẻ phân loại thông dụng
var TagsToSeed = []domain.Tag{
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

// SeedResult thống kê số lượng dữ liệu đã nạp
type SeedResult struct {
	CategoriesAdded   int
	CategoriesUpdated int
	TagsAdded         int
	TagsUpdated       int
	UsersCreated      int
	UsersUpdated      int
	AudiosCreated     int
	EpisodesCreated   int
	SettingsCreated   int
	MessagesCreated   int
	NotificationsSent int
}

// SeedDefaultCategories nạp hoặc cập nhật thể loại
func SeedDefaultCategories(db *gorm.DB) (int, int, error) {
	added, updated := 0, 0
	for _, c := range CategoriesToSeed {
		var existing domain.Category
		if err := db.Where("slug = ? OR name = ?", c.Slug, c.Name).First(&existing).Error; err == nil {
			db.Model(&existing).Updates(map[string]interface{}{
				"name":        c.Name,
				"slug":        c.Slug,
				"description": c.Description,
				"color":       c.Color,
			})
			updated++
		} else {
			newCat := domain.Category{
				Name:        c.Name,
				Slug:        c.Slug,
				Description: c.Description,
				Color:       c.Color,
			}
			if err := db.Create(&newCat).Error; err == nil {
				added++
			}
		}
	}
	return added, updated, nil
}

// SeedDefaultTags nạp hoặc cập nhật thẻ phân loại
func SeedDefaultTags(db *gorm.DB) (int, int, error) {
	added, updated := 0, 0
	for _, t := range TagsToSeed {
		var existing domain.Tag
		if err := db.Where("slug = ? OR name = ?", t.Slug, t.Name).First(&existing).Error; err == nil {
			db.Model(&existing).Updates(map[string]interface{}{
				"name": t.Name,
				"slug": t.Slug,
			})
			updated++
		} else {
			newTag := domain.Tag{
				Name: t.Name,
				Slug: t.Slug,
			}
			if err := db.Create(&newTag).Error; err == nil {
				added++
			}
		}
	}
	return added, updated, nil
}

// SeedDefaultUsers nạp tài khoản ADMIN, VIP và User chuẩn
func SeedDefaultUsers(db *gorm.DB) (int, int, error) {
	adminUsername := os.Getenv("ADMIN_USERNAME")
	if adminUsername == "" {
		adminUsername = "admin123"
	}
	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = "admin123@audioapp.com"
	}
	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		adminPassword = "admin123"
	}

	adminPass, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	vipPass, _ := bcrypt.GenerateFromPassword([]byte("vip123"), bcrypt.DefaultCost)
	userPass, _ := bcrypt.GenerateFromPassword([]byte("user123"), bcrypt.DefaultCost)

	vipFuture := time.Now().Add(365 * 24 * time.Hour) // 1 năm
	adminVip := time.Now().Add(10 * 365 * 24 * time.Hour)

	defaultUsers := []domain.User{
		{
			Username:     "admin",
			Email:        "admin@audioapp.com",
			PasswordHash: string(adminPass),
			Role:         domain.RoleAdmin,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &adminVip,
			AvatarURL:    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces",
			CoverURL:     "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=400&fit=crop",
			IsGuest:      false,
		},
		{
			Username:     adminUsername,
			Email:        adminEmail,
			PasswordHash: string(adminPass),
			Role:         domain.RoleAdmin,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &adminVip,
			AvatarURL:    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces",
			CoverURL:     "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=400&fit=crop",
			IsGuest:      false,
		},
		{
			Username:     "vip_member",
			Email:        "vip@audioapp.com",
			PasswordHash: string(vipPass),
			Role:         domain.RoleVIP,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &vipFuture,
			AvatarURL:    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
			IsGuest:      false,
		},
		{
			Username:     "vip123",
			Email:        "vip123@audioapp.com",
			PasswordHash: string(vipPass),
			Role:         domain.RoleVIP,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &vipFuture,
			AvatarURL:    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
			IsGuest:      false,
		},
		{
			Username:     "user123",
			Email:        "user123@audioapp.com",
			PasswordHash: string(userPass),
			Role:         domain.RoleUser,
			Membership:   domain.MembershipFree,
			VipExpiresAt: nil,
			AvatarURL:    "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&h=200&fit=crop",
			IsGuest:      false,
		},
		{
			Username:     "regular_user",
			Email:        "user@audioapp.com",
			PasswordHash: string(userPass),
			Role:         domain.RoleUser,
			Membership:   domain.MembershipFree,
			VipExpiresAt: nil,
			AvatarURL:    "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&h=200&fit=crop",
			IsGuest:      false,
		},
		{
			Username:     "HoangAudio",
			Email:        "hoang@audioapp.com",
			PasswordHash: string(vipPass),
			Role:         domain.RoleVIP,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &vipFuture,
			AvatarURL:    "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&h=200&fit=crop",
			IsGuest:      false,
		},
		{
			Username:     "MinhNhat99",
			Email:        "minhnhat@audioapp.com",
			PasswordHash: string(vipPass),
			Role:         domain.RoleVIP,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &vipFuture,
			AvatarURL:    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
			IsGuest:      false,
		},
		{
			Username:     "LanAnh_VIP",
			Email:        "lananh@audioapp.com",
			PasswordHash: string(vipPass),
			Role:         domain.RoleVIP,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &vipFuture,
			AvatarURL:    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
			IsGuest:      false,
		},
		{
			Username:     "TieuViVu",
			Email:        "tieuvivu@audioapp.com",
			PasswordHash: string(userPass),
			Role:         domain.RoleUser,
			Membership:   domain.MembershipFree,
			VipExpiresAt: nil,
			AvatarURL:    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
			IsGuest:      false,
		},
		{
			Username:     "BachNgocSach",
			Email:        "bachngoc@audioapp.com",
			PasswordHash: string(vipPass),
			Role:         domain.RoleVIP,
			Membership:   domain.MembershipVIP,
			VipExpiresAt: &vipFuture,
			AvatarURL:    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
			IsGuest:      false,
		},
	}

	created, updated := 0, 0
	for _, u := range defaultUsers {
		var existing domain.User
		if err := db.Where("username = ?", u.Username).First(&existing).Error; err != nil {
			if err := db.Create(&u).Error; err == nil {
				created++
			}
		} else {
			db.Model(&existing).Updates(map[string]interface{}{
				"password_hash":  u.PasswordHash,
				"role":           u.Role,
				"membership":     u.Membership,
				"vip_expires_at": u.VipExpiresAt,
				"avatar_url":     u.AvatarURL,
				"cover_url":      u.CoverURL,
				"email":          u.Email,
			})
			updated++
		}
	}

	return created, updated, nil
}

// SeedDemoAudio nạp video demo YouTube mẫu từ link: https://youtu.be/ymcBpznvRHM?si=rXhqX59Gt9_G39vh
func SeedDemoAudio(db *gorm.DB, adminID uint) (*domain.Audio, int, error) {
	videoID := "ymcBpznvRHM"
	videoURL := "https://www.youtube.com/watch?v=ymcBpznvRHM"
	title := "Full 700 Tập | HÓA THÀNH THẦN THỤ, 1 CHIẾC LÁ CỦA TA ĐẾ CŨNG PHẢI SỢ | NỮ VIETSUB"
	author := "NỮ vietsub"
	thumbnailURL := "https://i.ytimg.com/vi/ymcBpznvRHM/hqdefault.jpg"
	duration := 50946 // 14 giờ 09 phút 06 giây
	desc := "Hóa Thành Thần Thụ, 1 Chiếc Lá Của Ta Đế Cũng Phải SỢ - Siêu phẩm audio truyện tiên hiệp huyền huyễn cực cuốn trọn bộ 700 tập. Nhân vật chính chuyển sinh thành một cây liễu thần thụ, từng bước thức tỉnh dị năng bảo hộ thôn làng, chống lại dị tộc, sát phạt quyết đoán, một chiếc lá trảm phá thương khung!"

	// Tìm category Huyền Huyễn hoặc Tiên Hiệp
	var cat domain.Category
	if err := db.Where("slug = ?", "huyen-huyen").First(&cat).Error; err != nil {
		db.Where("slug = ?", "tien-hiep").First(&cat)
	}

	var audio domain.Audio
	err := db.Where("youtube_video_id = ?", videoID).First(&audio).Error
	epCount := 0

	if err != nil {
		audio = domain.Audio{
			YoutubeVideoID:       videoID,
			YoutubeURL:           videoURL,
			Title:                title,
			Description:          desc,
			Author:               author,
			ThumbnailURL:         thumbnailURL,
			TotalDurationSeconds: duration,
			CategoryID:           cat.ID,
			Status:               domain.StatusActive,
			IsVIPOnly:            false,
			CreatedBy:            adminID,
		}
		if err := db.Create(&audio).Error; err != nil {
			return nil, 0, fmt.Errorf("không thể tạo audio mẫu: %w", err)
		}

		// Chia các tập logic 4 giờ / tập (14400s)
		epDrafts := logic.ComputeLogicalEpisodes(audio.ID, duration, 14400)
		for _, draft := range epDrafts {
			ep := domain.Episode{
				AudioID:         audio.ID,
				EpisodeNumber:   draft.EpisodeNumber,
				Title:           draft.Title,
				StartSeconds:    draft.StartSeconds,
				EndSeconds:      draft.EndSeconds,
				DurationSeconds: draft.DurationSeconds,
				IsVIP:           false,
			}
			if err := db.Create(&ep).Error; err == nil {
				epCount++
			}
		}

		// Gắn tags phù hợp
		tagSlugs := []string{"huyen-huyen", "vo-dich-luu", "he-thong", "full-tron-bo", "sieu-pham-cay-dem", "tien-do-nhanh", "sat-phat-quyet-doan"}
		var tagsToAdd []domain.Tag
		db.Where("slug IN ?", tagSlugs).Find(&tagsToAdd)
		if len(tagsToAdd) > 0 {
			_ = db.Model(&audio).Association("Tags").Append(tagsToAdd)
		}
	} else {
		// Đảm bảo audio cập nhật đúng thông tin chuẩn
		db.Model(&audio).Updates(map[string]interface{}{
			"title":            title,
			"author_name":      author,
			"thumbnail_url":    thumbnailURL,
			"duration_seconds": duration,
			"description":      desc,
			"status":           domain.StatusActive,
		})

		// Đảm bảo các tập logic đã tồn tại
		var existingEps []domain.Episode
		db.Where("audio_id = ?", audio.ID).Find(&existingEps)
		if len(existingEps) == 0 {
			epDrafts := logic.ComputeLogicalEpisodes(audio.ID, duration, 14400)
			for _, draft := range epDrafts {
				ep := domain.Episode{
					AudioID:         audio.ID,
					EpisodeNumber:   draft.EpisodeNumber,
					Title:           draft.Title,
					StartSeconds:    draft.StartSeconds,
					EndSeconds:      draft.EndSeconds,
					DurationSeconds: draft.DurationSeconds,
					IsVIP:           false,
				}
				if err := db.Create(&ep).Error; err == nil {
					epCount++
				}
			}
		} else {
			epCount = len(existingEps)
		}
	}

	return &audio, epCount, nil
}

// SeedSystemSettings nạp thông tin ngân hàng VietQR và các gói VIP mặc định
func SeedSystemSettings(db *gorm.DB) (int, error) {
	vipPackagesJSON := `[
  {
    "id": "VIP_1M",
    "name": "Gói 1 Tháng (Standard VIP)",
    "amount": 49000,
    "priceVND": 49000,
    "durationDays": 30,
    "originalCost": 59000,
    "discount": "Tiết kiệm 17%",
    "description": "Trải nghiệm toàn bộ kho truyện VIP & không giới hạn lượt import YouTube",
    "perks": [
      "Mở khóa 100% truyện độc quyền VIP",
      "Không giới hạn số lượt nạp link YouTube mỗi ngày",
      "Huy hiệu VIP vinh danh trên BXH và khung chat Cộng đồng",
      "Đồng bộ tiến trình nghe thời gian thực trên mọi thiết bị",
      "Chất lượng âm thanh tối ưu 320kbps không độ trễ"
    ]
  },
  {
    "id": "VIP_3M",
    "name": "Gói 3 Tháng (Popular VIP)",
    "amount": 129000,
    "priceVND": 129000,
    "durationDays": 90,
    "originalCost": 177000,
    "discount": "Tiết kiệm 27%",
    "description": "Lựa chọn phổ biến nhất cho người cày truyện chuyên nghiệp",
    "perks": [
      "Toàn bộ đặc quyền của gói VIP 1 Tháng",
      "Huy hiệu VIP Kim Cương tỏa sáng",
      "Ưu tiên hỗ trợ kỹ thuật và đề xuất phân đoạn tập 24/7",
      "Tiết kiệm 48.000đ so với thanh toán từng tháng"
    ]
  },
  {
    "id": "VIP_1Y",
    "name": "Gói 1 Năm (Ultimate VIP)",
    "amount": 399000,
    "priceVND": 399000,
    "durationDays": 365,
    "originalCost": 588000,
    "discount": "Tiết kiệm 32%",
    "description": "Đặc quyền cao nhất trọn vẹn 365 ngày nghe truyện đỉnh cao",
    "perks": [
      "Toàn bộ đặc quyền cao cấp nhất của WaveLink",
      "Huy hiệu Chí Tôn Độc Nhất trên Bảng Vàng",
      "Tự do đề xuất thêm các tính năng mới trong roadmap",
      "Tiết kiệm gần 200.000đ trọn vẹn cả năm"
    ]
  }
]`

	settings := []domain.SystemSetting{
		{Key: "bank_name", Value: "MB Bank (Ngân hàng Quân Đội)"},
		{Key: "account_number", Value: "0987654321"},
		{Key: "account_name", Value: "COMIC AUDIO HUB"},
		{Key: "note_prefix", Value: "VIP"},
		{Key: "vip_packages", Value: stringsTrim(vipPackagesJSON)},
	}

	count := 0
	for _, s := range settings {
		var existing domain.SystemSetting
		if err := db.Where("`key` = ?", s.Key).First(&existing).Error; err != nil {
			if err := db.Create(&s).Error; err == nil {
				count++
			}
		} else {
			db.Model(&existing).Update("value", s.Value)
			count++
		}
	}
	return count, nil
}

func stringsTrim(s string) string {
	var v interface{}
	if err := json.Unmarshal([]byte(s), &v); err == nil {
		if b, err := json.Marshal(v); err == nil {
			return string(b)
		}
	}
	return s
}

// SeedCommunityMessages nạp các tin nhắn thảo luận cộng đồng sống động kèm chia sẻ audio mẫu
func SeedCommunityMessages(db *gorm.DB, demoAudioID uint) (int, error) {
	var count int64
	db.Model(&domain.CommunityMessage{}).Count(&count)
	if count > 0 {
		return 0, nil
	}

	var adminUser domain.User
	db.Where("username = ?", "admin").First(&adminUser)

	now := time.Now()
	messages := []domain.CommunityMessage{
		{
			UserID:        adminUser.ID,
			Username:      "admin",
			AvatarURL:     "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces",
			IsVIP:         true,
			Role:          domain.RoleAdmin,
			Message:       "🎉 Chào mừng quý thính giả đến với WaveLink Audio Library! Chúc các bạn có những giờ phút nghe truyện thư giãn và tuyệt vời nhất.",
			CreatedAt:     now.Add(-3 * time.Hour),
		},
		{
			UserID:        adminUser.ID + 1,
			Username:      "HoangAudio",
			AvatarURL:     "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&h=200&fit=crop",
			IsVIP:         true,
			Role:          domain.RoleVIP,
			Message:       "🔥 Bộ Hóa Thành Thần Thụ nghe cuốn thực sự mọi người ơi! 1 chiếc lá chém thiên hạ luôn, vừa cày xong tập 1!",
			SharedAudioID: &demoAudioID,
			CreatedAt:     now.Add(-2 * time.Hour),
		},
		{
			UserID:        adminUser.ID + 2,
			Username:      "LanAnh_VIP",
			AvatarURL:     "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
			IsVIP:         true,
			Role:          domain.RoleVIP,
			Message:       "Giọng đọc truyền cảm, nghe tai nghe ban đêm êm ru. Hệ thống tự lưu tiến trình nghe chuẩn từng giây thích quá ✨",
			CreatedAt:     now.Add(-1 * time.Hour),
		},
		{
			UserID:        adminUser.ID + 3,
			Username:      "MinhNhat99",
			AvatarURL:     "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
			IsVIP:         true,
			Role:          domain.RoleVIP,
			Message:       "Vừa nâng cấp gói VIP 1 năm qua VietQR tự động cực nhanh, mở khóa toàn bộ tập không giới hạn luôn nha anh em!",
			CreatedAt:     now.Add(-30 * time.Minute),
		},
	}

	created := 0
	for _, m := range messages {
		if err := db.Create(&m).Error; err == nil {
			created++
		}
	}
	return created, nil
}

// SeedProgressAndHistory nạp tiến trình nghe dở, lịch sử cày giờ cho BXH Top Listeners
func SeedProgressAndHistory(db *gorm.DB, audio *domain.Audio) error {
	if audio == nil || audio.ID == 0 {
		return nil
	}

	var firstEp domain.Episode
	if err := db.Where("audio_id = ? AND episode_number = 1", audio.ID).First(&firstEp).Error; err != nil {
		return nil
	}

	var adminUser domain.User
	db.Where("username = ?", "admin").First(&adminUser)

	// 1. Tiến trình nghe dở cho Admin (hiển thị trên Tiếp tục nghe ở HomePage)
	if adminUser.ID > 0 {
		var prog domain.ListeningProgress
		if err := db.Where("user_id = ? AND episode_id = ?", adminUser.ID, firstEp.ID).First(&prog).Error; err != nil {
			prog = domain.ListeningProgress{
				UserID:          adminUser.ID,
				AudioID:         audio.ID,
				EpisodeID:       firstEp.ID,
				PositionSeconds: 4520, // ~1h 15m 20s
				DurationSeconds: firstEp.DurationSeconds,
				ProgressPercent: 31.39,
				Completed:       false,
				UpdatedAt:       time.Now().Add(-10 * time.Minute),
			}
			db.Create(&prog)
		}

		// Yêu thích cho Admin
		var fav domain.Favorite
		if err := db.Where("user_id = ? AND audio_id = ?", adminUser.ID, audio.ID).First(&fav).Error; err != nil {
			db.Create(&domain.Favorite{
				UserID:    adminUser.ID,
				AudioID:   audio.ID,
				CreatedAt: time.Now(),
			})
		}
	}

	// 2. Lịch sử nghe cho bảng xếp hạng Top Listeners
	usersHours := []struct {
		username string
		seconds  int
	}{
		{"HoangAudio", 162000},   // 45 giờ
		{"MinhNhat99", 115200},   // 32 giờ
		{"LanAnh_VIP", 100800},   // 28 giờ
		{"TieuViVu", 68400},      // 19 giờ
		{"BachNgocSach", 54000},  // 15 giờ
		{"admin", 43200},         // 12 giờ
	}

	for _, uh := range usersHours {
		var u domain.User
		if err := db.Where("username = ?", uh.username).First(&u).Error; err == nil {
			var histCount int64
			db.Model(&domain.ListeningHistory{}).Where("user_id = ?", u.ID).Count(&histCount)
			if histCount == 0 {
				db.Create(&domain.ListeningHistory{
					UserID:           u.ID,
					AudioID:          audio.ID,
					EpisodeID:        firstEp.ID,
					DurationListened: uh.seconds,
					StartedAt:        time.Now().Add(-24 * time.Hour),
					CreatedAt:        time.Now().Add(-1 * time.Hour),
				})
			}
		}
	}

	return nil
}

// SeedNotifications nạp thông báo hệ thống và tùy chọn thông báo
func SeedNotifications(db *gorm.DB, demoAudioID uint) (int, error) {
	var adminUser domain.User
	db.Where("username = ?", "admin").First(&adminUser)
	if adminUser.ID == 0 {
		return 0, nil
	}

	// Tùy chọn thông báo
	var pref domain.NotificationPreference
	if err := db.Where("user_id = ?", adminUser.ID).First(&pref).Error; err != nil {
		pref = domain.NotificationPreference{
			UserID:          adminUser.ID,
			SystemAlerts:    true,
			NovelUpdates:    true,
			PromotionAlerts: true,
			ExternalAudio:   true,
			BlockAll:        false,
			WelcomeSeeded:   true,
			UpdatedAt:       time.Now(),
		}
		db.Create(&pref)
	}

	notifs := []domain.Notification{
		{
			UserID:    adminUser.ID,
			Title:     "Chào mừng bạn đến với WaveLink Audio Library!",
			Message:   "Hệ thống audio truyện YouTube đã được cấu hình hoàn chỉnh: kết nối YouTube API, chia tập logic 4h, tự lưu tiến trình và phân quyền VIP đa tầng.",
			Type:      "SYSTEM",
			Link:      "/",
			IsRead:    false,
			CreatedAt: time.Now().Add(-2 * time.Hour),
		},
		{
			UserID:    adminUser.ID,
			Title:     "Truyện mới: Hóa Thành Thần Thụ (700 Tập Trọn Bộ)",
			Message:   "Siêu phẩm audio truyện tiên hiệp chuyển sinh vừa được thêm vào thư viện. Thưởng thức ngay với 4 tập siêu dài chuẩn âm thanh chất lượng cao.",
			Type:      "NOVEL_UPDATE",
			Link:      fmt.Sprintf("/player?id=%d", demoAudioID),
			IsRead:    false,
			CreatedAt: time.Now().Add(-1 * time.Hour),
		},
		{
			UserID:    adminUser.ID,
			Title:     "Đặc quyền Quản Trị Viên (ADMIN & VIP)",
			Message:   "Tài khoản của bạn sở hữu toàn quyền quản trị, thêm truyện không giới hạn, duyệt đơn VIP và cấu hình thông số hệ thống.",
			Type:      "VIP",
			Link:      "/admin",
			IsRead:    true,
			CreatedAt: time.Now().Add(-30 * time.Minute),
		},
	}

	created := 0
	for _, n := range notifs {
		var existing domain.Notification
		if err := db.Where("user_id = ? AND title = ?", n.UserID, n.Title).First(&existing).Error; err != nil {
			if err := db.Create(&n).Error; err == nil {
				created++
			}
		}
	}
	return created, nil
}

// RunComprehensiveSeed thực hiện nạp toàn bộ dữ liệu mẫu cho toàn hệ thống
func RunComprehensiveSeed(db *gorm.DB) (*SeedResult, error) {
	res := &SeedResult{}

	// 1. Categories
	catAdd, catUp, err := SeedDefaultCategories(db)
	if err != nil {
		return res, fmt.Errorf("lỗi nạp thể loại: %w", err)
	}
	res.CategoriesAdded = catAdd
	res.CategoriesUpdated = catUp

	// 2. Tags
	tagAdd, tagUp, err := SeedDefaultTags(db)
	if err != nil {
		return res, fmt.Errorf("lỗi nạp tags: %w", err)
	}
	res.TagsAdded = tagAdd
	res.TagsUpdated = tagUp

	// 3. Users (Admin, VIP, Regular, Leaderboard)
	uAdd, uUp, err := SeedDefaultUsers(db)
	if err != nil {
		return res, fmt.Errorf("lỗi nạp tài khoản: %w", err)
	}
	res.UsersCreated = uAdd
	res.UsersUpdated = uUp

	var adminUser domain.User
	db.Where("username = ?", "admin").First(&adminUser)

	// 4. Demo Audio (Video ymcBpznvRHM)
	audio, epCount, err := SeedDemoAudio(db, adminUser.ID)
	if err != nil {
		return res, fmt.Errorf("lỗi nạp audio mẫu: %w", err)
	}
	res.AudiosCreated = 1
	res.EpisodesCreated = epCount

	// 5. System Settings (VietQR & VIP Packages)
	setCount, err := SeedSystemSettings(db)
	if err != nil {
		slog.Warn("Cảnh báo nạp cài đặt hệ thống", "error", err)
	}
	res.SettingsCreated = setCount

	// 6. Community Messages
	if audio != nil {
		msgCount, err := SeedCommunityMessages(db, audio.ID)
		if err != nil {
			slog.Warn("Cảnh báo nạp tin nhắn cộng đồng", "error", err)
		}
		res.MessagesCreated = msgCount

		// 7. Listening Progress & History for Leaderboard
		_ = SeedProgressAndHistory(db, audio)

		// 8. Notifications
		notifCount, err := SeedNotifications(db, audio.ID)
		if err != nil {
			slog.Warn("Cảnh báo nạp thông báo", "error", err)
		}
		res.NotificationsSent = notifCount
	}

	return res, nil
}

// EnsureBaselineSeed tự động kiểm tra và nạp dự phòng dữ liệu mặc định khi Backend khởi động
// Không ghi đè hoặc tạo trùng lặp nếu hệ thống đã có dữ liệu.
func EnsureBaselineSeed(db *gorm.DB, isProduction bool) error {
	if os.Getenv("SEED_DATA") == "false" || os.Getenv("SEED_DATA") == "0" {
		slog.Info("⚙️ SEED_DATA=false: Bỏ qua nạp dữ liệu mẫu ban đầu theo cấu hình môi trường.")
		return nil
	}

	var adminCount int64
	db.Model(&domain.User{}).Where("role = ?", domain.RoleAdmin).Count(&adminCount)

	var catCount int64
	db.Model(&domain.Category{}).Count(&catCount)

	var audioCount int64
	db.Model(&domain.Audio{}).Count(&audioCount)

	// Nếu thiếu bất kỳ thành phần cốt lõi nào (chưa có Admin, chưa có Thể loại, hoặc chưa có Audio mẫu)
	if adminCount == 0 || catCount == 0 || audioCount == 0 {
		slog.Info("🌱 Phát hiện dữ liệu mẫu mặc định còn thiếu, đang tự động nạp dự phòng cho hệ thống...")
		_, err := RunComprehensiveSeed(db)
		if err != nil {
			slog.Warn("Tự động nạp seed dự phòng gặp cảnh báo", "error", err)
			return err
		}
		slog.Info("✅ Đã hoàn tất nạp dữ liệu mẫu mặc định (Tài khoản Admin, Danh mục, Audio mẫu).")
		return nil
	}

	// Nếu đã có đầy đủ thì không làm gì thêm, chỉ ghi log an toàn
	slog.Info("🔒 Dữ liệu mặc định hệ thống (Tài khoản ADMIN, Danh mục, Audio mẫu) đã sẵn sàng.")
	return nil
}
