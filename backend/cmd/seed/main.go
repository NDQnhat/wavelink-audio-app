package main

import (
	"fmt"
	"log/slog"
	"os"

	"audio-app-backend/config"
	infraDB "audio-app-backend/infra/db"
)

func main() {
	cfg := config.Load()
	slog.Info("Ket noi co so du lieu...", "driver", cfg.DBDriver)

	db, err := infraDB.InitDatabase(cfg.DBDriver, cfg.DBSource, cfg.IsProduction())
	if err != nil {
		slog.Error("Loi ket noi database", "error", err)
		os.Exit(1)
	}

	fmt.Println("================================================================================")
	fmt.Println(" 🚀 BẮT ĐẦU KHỞI TẠO DỮ LIỆU MẪU TOÀN DIỆN CHO WAVELINK AUDIO LIBRARY")
	fmt.Println("================================================================================")

	result, err := infraDB.RunComprehensiveSeed(db)
	if err != nil {
		slog.Error("Lỗi trong quá trình nạp seed", "error", err)
		os.Exit(1)
	}

	fmt.Println("--------------------------------------------------------------------------------")
	fmt.Printf(" [1/7] THỂ LOẠI (CATEGORIES): +%d thêm mới, ~%d cập nhật (Tổng: 20 danh mục chuẩn)\n",
		result.CategoriesAdded, result.CategoriesUpdated)
	fmt.Printf(" [2/7] THẺ TÌM KIẾM (TAGS):   +%d thêm mới, ~%d cập nhật (Tổng: 32 tags thông dụng)\n",
		result.TagsAdded, result.TagsUpdated)
	fmt.Printf(" [3/7] TÀI KHOẢN (ACCOUNTS):   +%d tạo mới, ~%d cập nhật (Admin: admin/admin123)\n",
		result.UsersCreated, result.UsersUpdated)
	fmt.Printf(" [4/7] AUDIO MẪU YOUTUBE:     +1 audio (ymcBpznvRHM) | +%d tập logic 4 giờ\n",
		result.EpisodesCreated)
	fmt.Printf(" [5/7] CÀI ĐẶT HỆ THỐNG:      +%d thiết lập (VietQR MB Bank & Gói VIP động)\n",
		result.SettingsCreated)
	fmt.Printf(" [6/7] CỘNG ĐỒNG & BXH:       +%d tin nhắn chat sống động kèm thẻ chia sẻ truyện\n",
		result.MessagesCreated)
	fmt.Printf(" [7/7] THÔNG BÁO & TIẾN ĐỘ:   +%d thông báo chào mừng & tiến trình nghe dở\n",
		result.NotificationsSent)
	fmt.Println("================================================================================")
	fmt.Println(" ✅ HOÀN TẤT NẠP SEED: Hệ thống đã sẵn sàng 100% dữ liệu thực cho toàn bộ trang!")
	fmt.Println("================================================================================")
}
