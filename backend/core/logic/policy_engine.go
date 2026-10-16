package logic

import (
	"audio-app-backend/core/domain"
)

const (
	MaxFreeImportsPerDay = 5
)

// CanImportYouTube kiểm tra quyền nhập link YouTube theo cấp bậc người dùng
func CanImportYouTube(user domain.User, todayImportCount int) (bool, string) {
	if user.Role == domain.RoleAdmin || user.Role == domain.RoleVIP || user.Membership == domain.MembershipVIP {
		return true, ""
	}

	if user.IsGuest || user.Role == domain.RoleGuest {
		return false, "Khách vãng lai không thể nhập link. Vui lòng đăng nhập hoặc nâng cấp tài khoản."
	}

	// Tài khoản thường (FREE)
	if todayImportCount >= MaxFreeImportsPerDay {
		return false, "Bạn đã dùng hết lượt nhập link miễn phí hôm nay (5 lượt/ngày). Vui lòng nâng cấp VIP để không giới hạn."
	}

	return true, ""
}

// CanAccessAudio kiểm tra quyền truy cập truyện (Khách vãng lai bị chặn nếu truyện là VIP, hoặc user thường nếu truyện chỉ có 1 tập)
func CanAccessAudio(user domain.User, audio domain.Audio) (bool, string) {
	if !audio.IsVIPOnly {
		return true, ""
	}

	if user.Role == domain.RoleAdmin || user.Role == domain.RoleVIP || user.Membership == domain.MembershipVIP {
		return true, ""
	}

	if user.IsGuest || user.Role == domain.RoleGuest {
		return false, "Nội dung này dành riêng cho thành viên VIP. Vui lòng đăng nhập hoặc nâng cấp gói để tiếp tục nghe."
	}

	// Nếu audio VIP chỉ có đúng 1 tập -> Không có tập 2 trở đi để áp dụng khóa -> Chặn toàn bộ user thường
	if audio.TotalEpisodes == 1 || (len(audio.Episodes) == 1) {
		return false, "Nội dung này dành riêng cho thành viên VIP. Vui lòng nâng cấp gói để tiếp tục nghe."
	}

	// User thường (FREE) được phép vào xem trang audio để nghe thử tập 1 nếu truyện có từ 2 tập trở lên
	return true, ""
}

// CanAccessEpisode kiểm tra quyền nghe từng tập audio (tập 1 miễn phí nghe thử nếu truyện có >1 tập, tập 2+ khóa nếu là VIP)
func CanAccessEpisode(user domain.User, audio domain.Audio, episode domain.Episode) (bool, string) {
	if !audio.IsVIPOnly && !episode.IsVIP {
		return true, ""
	}

	if user.Role == domain.RoleAdmin || user.Role == domain.RoleVIP || user.Membership == domain.MembershipVIP {
		return true, ""
	}

	if user.IsGuest || user.Role == domain.RoleGuest {
		return false, "Nội dung này dành riêng cho hội viên. Vui lòng đăng nhập để nghe thử tập 1 hoặc nâng cấp VIP."
	}

	// Nếu audio chỉ có 1 tập duy nhất và là VIP -> Khóa đối với user thường
	if (audio.TotalEpisodes == 1 || len(audio.Episodes) == 1) && (audio.IsVIPOnly || episode.IsVIP) {
		return false, "Nội dung này dành riêng cho thành viên VIP. Vui lòng nâng cấp gói để nghe."
	}

	if episode.EpisodeNumber <= 1 {
		return true, "" // Xem trước 1 tập đầu tiên khi truyện có từ 2 tập trở lên
	}

	return false, "Tập 2 trở đi chỉ dành riêng cho thành viên VIP. Vui lòng nâng cấp gói để tiếp tục nghe."
}

// CanManageContent kiểm tra quyền chỉnh sửa audio, tập, phân mục
func CanManageContent(user domain.User) bool {
	return user.Role == domain.RoleAdmin
}

// CanManageUsers kiểm tra quyền phân hạng tài khoản, cấp VIP
func CanManageUsers(user domain.User) bool {
	return user.Role == domain.RoleAdmin
}
