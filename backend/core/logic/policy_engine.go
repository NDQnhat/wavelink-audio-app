package logic

import (
	"audio-app-backend/core/domain"
)

const (
	MaxFreeImportsPerDay = 5
)

// CanImportYouTube kiểm tra quyền nhập link YouTube theo cấp bậc người dùng
func CanImportYouTube(user domain.User, todayImportCount int) (bool, string) {
	if user.Role == domain.RoleAdmin || user.Membership == domain.MembershipVIP {
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

// CanAccessAudio kiểm tra quyền nghe audio (ví dụ Audio gắn nhãn VIP)
func CanAccessAudio(user domain.User, audio domain.Audio) (bool, string) {
	if !audio.IsVIPOnly {
		return true, ""
	}

	if user.Role == domain.RoleAdmin || user.Membership == domain.MembershipVIP {
		return true, ""
	}

	return false, "Nội dung này dành riêng cho thành viên VIP. Vui lòng nâng cấp gói để tiếp tục nghe."
}

// CanManageContent kiểm tra quyền chỉnh sửa audio, tập, phân mục
func CanManageContent(user domain.User) bool {
	return user.Role == domain.RoleAdmin
}

// CanManageUsers kiểm tra quyền phân hạng tài khoản, cấp VIP
func CanManageUsers(user domain.User) bool {
	return user.Role == domain.RoleAdmin
}
