package main

import (
	"fmt"
	"log/slog"
	"os"

	"audio-app-backend/config"
	"audio-app-backend/core/domain"
	infraDB "audio-app-backend/infra/db"
)

type CategoryItem struct {
	Name        string
	Slug        string
	Description string
	Color       string
}

type TagItem struct {
	Name string
	Slug string
}

var categoriesToSeed = []CategoryItem{
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

var tagsToSeed = []TagItem{
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

func main() {
	cfg := config.Load()
	slog.Info("Ket noi co so du lieu...", "driver", cfg.DBDriver)

	db, err := infraDB.InitDatabase(cfg.DBDriver, cfg.DBSource, cfg.IsProduction())
	if err != nil {
		slog.Error("Loi ket noi database", "error", err)
		os.Exit(1)
	}

	fmt.Println("==================================================")
	fmt.Println(" BẮT ĐẦU NẠP DANH MỤC VÀ THẺ PHÂN LOẠI (TAXONOMY)")
	fmt.Println("==================================================")

	// 1. Seed Categories
	catAdded := 0
	catUpdated := 0
	for _, c := range categoriesToSeed {
		var existing domain.Category
		res := db.Where("slug = ? OR name = ?", c.Slug, c.Name).First(&existing)
		if res.Error == nil {
			db.Model(&existing).Updates(map[string]interface{}{
				"name":        c.Name,
				"slug":        c.Slug,
				"description": c.Description,
				"color":       c.Color,
			})
			catUpdated++
			fmt.Printf(" [CẬP NHẬT] Thể loại: [%s] %s\n", c.Slug, c.Name)
		} else {
			newCat := domain.Category{
				Name:        c.Name,
				Slug:        c.Slug,
				Description: c.Description,
				Color:       c.Color,
			}
			if err := db.Create(&newCat).Error; err != nil {
				fmt.Printf(" [LỖI] Tạo thể loại %s: %v\n", c.Name, err)
			} else {
				catAdded++
				fmt.Printf(" [THÊM MỚI] Thể loại: [%s] %s\n", c.Slug, c.Name)
			}
		}
	}

	// 2. Seed Tags
	tagAdded := 0
	tagUpdated := 0
	for _, t := range tagsToSeed {
		var existing domain.Tag
		res := db.Where("slug = ? OR name = ?", t.Slug, t.Name).First(&existing)
		if res.Error == nil {
			db.Model(&existing).Updates(map[string]interface{}{
				"name": t.Name,
				"slug": t.Slug,
			})
			tagUpdated++
			fmt.Printf(" [CẬP NHẬT] Tag: #%s (%s)\n", t.Name, t.Slug)
		} else {
			newTag := domain.Tag{
				Name: t.Name,
				Slug: t.Slug,
			}
			if err := db.Create(&newTag).Error; err != nil {
				fmt.Printf(" [LỖI] Tạo tag %s: %v\n", t.Name, err)
			} else {
				tagAdded++
				fmt.Printf(" [THÊM MỚI] Tag: #%s (%s)\n", t.Name, t.Slug)
			}
		}
	}

	fmt.Println("==================================================")
	fmt.Printf(" HOÀN TẤT: Thể loại (+%d mới, ~%d cập nhật) | Tags (+%d mới, ~%d cập nhật)\n",
		catAdded, catUpdated, tagAdded, tagUpdated)
	fmt.Println("==================================================")
}
