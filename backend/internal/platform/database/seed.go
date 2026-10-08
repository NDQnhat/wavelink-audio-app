package database

import (
	"database/sql"
	"log/slog"
)

func (db *DB) Seed() error {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM categories").Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		return nil // Already seeded
	}

	slog.Info("Seeding initial data into database...")

	// 1. Seed Categories
	categories := []struct {
		Name  string
		Slug  string
		Color string
		Desc  string
	}{
		{"Tiên hiệp", "tien-hiep", "primary", "Tiểu thuyết tu chân, cầu đạo trường sinh"},
		{"Huyền huyễn", "huyen-huyen", "secondary", "Dị giới ma pháp, huyền ảo kỳ bí"},
		{"Kiếm hiệp", "kiem-hiep", "tertiary", "Võ lâm giang hồ, ân oán tình thù"},
		{"Đô thị", "do-thi", "primary", "Thương trường, hào môn, đô thị dị năng"},
		{"Khoa huyễn", "khoa-huyen", "secondary", "Khoa học viễn tưởng, không gian tương lai"},
		{"Lịch sử quân sự", "lich-su", "tertiary", "Lịch sử chiến tranh, triều đại dã sử"},
		{"Podcast & Đàm luận", "podcast", "primary", "Đàm luận văn hóa, tri thức đời sống"},
		{"Sách nói kỹ năng", "sach-noi", "secondary", "Phát triển bản thân, tư duy tài chính"},
	}

	for _, c := range categories {
		_, err := db.Exec(
			"INSERT INTO categories (name, slug, color, description) VALUES (?, ?, ?, ?)",
			c.Name, c.Slug, c.Color, c.Desc,
		)
		if err != nil {
			slog.Warn("Failed to seed category", "name", c.Name, "error", err)
		}
	}

	// 2. Seed Tags
	tags := []struct {
		Name string
		Slug string
	}{
		{"Tu tiên", "tu-tien"},
		{"Audio dài", "audio-dai"},
		{"Trọn bộ", "tron-bo"},
		{"Bạch Ngọc Sách", "bach-ngoc-sach"},
		{"Audiobook", "audiobook"},
		{"Đông Nam Á", "dong-nam-a"},
		{"Trọng sinh", "trong-sinh"},
		{"Hài hước", "hai-huoc"},
	}

	for _, t := range tags {
		_, err := db.Exec("INSERT INTO tags (name, slug) VALUES (?, ?)", t.Name, t.Slug)
		if err != nil {
			slog.Warn("Failed to seed tag", "name", t.Name, "error", err)
		}
	}

	// 3. Seed Default Guest / Test User
	_, _ = db.Exec("INSERT INTO users (username, email, is_guest) VALUES (?, ?, ?)", "guest_default", "guest@example.com", true)
	_, _ = db.Exec("INSERT INTO users (username, email, is_guest) VALUES (?, ?, ?)", "admin", "admin@audioapp.com", false)

	// 4. Seed Sample Audios
	sampleAudios := []struct {
		YTID        string
		URL         string
		Title       string
		Author      string
		Channel     string
		Thumb       string
		Duration    int
		Category    string
		Tags        []string
		EpisodeList []struct {
			Num   int
			Title string
			Start int
			End   int
		}
	}{
		{
			YTID:     "dQw4w9WgXcQ",
			URL:      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			Title:    "Phàm Nhân Tu Tiên",
			Author:   "Vong Ngữ",
			Channel:  "Bạch Ngọc Sách",
			Thumb:    "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
			Duration: 99480, // ~27h38m
			Category: "Tiên hiệp",
			Tags:     []string{"Tu tiên", "Audio dài", "Trọn bộ"},
			EpisodeList: []struct {
				Num   int
				Title string
				Start int
				End   int
			}{
				{1, "Tập 1: Khởi Đầu Sơn Thôn", 0, 14400},
				{2, "Tập 2: Thất Huyền Môn Bí Mật", 14400, 28800},
				{3, "Tập 3: Luyện Đan Nhập Đạo", 28800, 43200},
				{4, "Tập 4: Thăng Tiên Lệnh Xuất Thế", 43200, 57600},
				{5, "Tập 5: Hoàng Phong Cốc Nhập Môn", 57600, 72000},
				{6, "Tập 6: Huyết Sắc Thí Luyện", 72000, 86400},
				{7, "Tập 7: Trúc Cơ Thành Công (Hết Phần 1)", 86400, 99480},
			},
		},
		{
			YTID:     "k3_tw44QsZQ",
			URL:      "https://www.youtube.com/watch?v=k3_tw44QsZQ",
			Title:    "Đại Phụng Đả Canh Nhân",
			Author:   "Mại Báo Tiểu Lang Quân",
			Channel:  "Giọng Đọc Audio Hay",
			Thumb:    "https://img.youtube.com/vi/k3_tw44QsZQ/hqdefault.jpg",
			Duration: 144000, // 40h
			Category: "Tiên hiệp",
			Tags:     []string{"Trọng sinh", "Hài hước"},
			EpisodeList: []struct {
				Num   int
				Title string
				Start int
				End   int
			}{
				{1, "Tập 1: Thuế Ngân Kỳ Án", 0, 14400},
				{2, "Tập 2: Đả Canh Ty Nhập Môn", 14400, 28800},
				{3, "Tập 3: Luyện Kim Thuật Sĩ Trợ Giúp", 28800, 43200},
			},
		},
		{
			YTID:     "L_LUpnjgPso",
			URL:      "https://www.youtube.com/watch?v=L_LUpnjgPso",
			Title:    "Tri Thức Vô Tận - Lịch Sử Đông Nam Á",
			Author:   "Tri Thức Radio",
			Channel:  "Podcast Tri Thức",
			Thumb:    "https://img.youtube.com/vi/L_LUpnjgPso/hqdefault.jpg",
			Duration: 28800, // 8h
			Category: "Podcast & Đàm luận",
			Tags:     []string{"Podcast", "Đông Nam Á"},
			EpisodeList: []struct {
				Num   int
				Title string
				Start int
				End   int
			}{
				{1, "Tập 1: Văn Minh Sông Hồng & Phù Nam", 0, 14400},
				{2, "Tập 2: Thời Kỳ Hàng Hải & Khởi Nghĩa", 14400, 28800},
			},
		},
	}

	for _, sa := range sampleAudios {
		var catID sql.NullInt64
		_ = db.QueryRow("SELECT id FROM categories WHERE name = ?", sa.Category).Scan(&catID)

		var res sql.Result
		if catID.Valid {
			res, err = db.Exec(
				`INSERT INTO youtube_videos (youtube_video_id, youtube_url, title, author_name, channel_id, thumbnail_url, duration_seconds, category_id)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				sa.YTID, sa.URL, sa.Title, sa.Author, sa.Channel, sa.Thumb, sa.Duration, catID.Int64,
			)
		} else {
			res, err = db.Exec(
				`INSERT INTO youtube_videos (youtube_video_id, youtube_url, title, author_name, channel_id, thumbnail_url, duration_seconds)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				sa.YTID, sa.URL, sa.Title, sa.Author, sa.Channel, sa.Thumb, sa.Duration,
			)
		}
		if err != nil {
			slog.Warn("Failed to seed audio", "title", sa.Title, "error", err)
			continue
		}

		audioID, _ := res.LastInsertId()

		// Tags linking
		for _, tagStr := range sa.Tags {
			var tID int64
			err := db.QueryRow("SELECT id FROM tags WHERE name = ?", tagStr).Scan(&tID)
			if err == nil {
				_, _ = db.Exec("INSERT INTO audio_tags (audio_id, tag_id) VALUES (?, ?)", audioID, tID)
			}
		}

		// Episodes
		for _, ep := range sa.EpisodeList {
			_, _ = db.Exec(
				`INSERT INTO episodes (audio_id, episode_number, title, start_seconds, end_seconds, duration_seconds)
				 VALUES (?, ?, ?, ?, ?, ?)`,
				audioID, ep.Num, ep.Title, ep.Start, ep.End, ep.End-ep.Start,
			)
		}
	}

	slog.Info("Seed completed successfully")
	return nil
}
