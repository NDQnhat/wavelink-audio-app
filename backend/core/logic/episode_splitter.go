package logic

import (
	"fmt"

	"audio-app-backend/core/domain"
)

const (
	DefaultBlockSizeSec = 14400 // 4 giờ = 14,400 giây
)

// GetRemainderThreshold xác định ngưỡng phần dư để tính gộp vào tập cuối
// Mẫu thời gian chuẩn:
// - 4 giờ / tập (14400s): lẻ <= 30 phút (1800s) -> gộp vào tập cuối
// - 2 giờ / tập (7200s): lẻ <= 20 phút (1200s) -> gộp vào tập cuối
// - 1 giờ / tập (3600s): lẻ <= 10 phút (600s) -> gộp vào tập cuối
// - 30 phút / tập (1800s): lẻ <= 5 phút (300s) -> gộp vào tập cuối
func GetRemainderThreshold(blockSizeSec int) int {
	switch blockSizeSec {
	case 14400: // 4 giờ
		return 1800 // 30 phút
	case 7200: // 2 giờ
		return 1200 // 20 phút
	case 3600: // 1 giờ
		return 600 // 10 phút
	case 1800: // 30 phút
		return 300 // 5 phút
	default:
		thresh := int(float64(blockSizeSec) * 0.20)
		if thresh > 1800 {
			thresh = 1800
		}
		if thresh < 300 {
			thresh = 300
		}
		return thresh
	}
}

// ComputeLogicalEpisodes chia video dài thành các tập logic không có kẽ hở thời gian
// Áp dụng công thức tập cuối thông minh:
// Nếu có phần lẻ nhỏ (ví dụ video 4h 10m 22s chia 4h/tập), số lẻ 10m 22s được tính luôn vào tập cuối
// Tập cuối luôn đảm bảo kết thúc chính xác tại totalDurationSec (không mất giây lẻ)
func ComputeLogicalEpisodes(audioID uint, totalDurationSec int, blockSizeSec int) []domain.EpisodeDraft {
	if blockSizeSec <= 0 {
		blockSizeSec = DefaultBlockSizeSec
	}
	if totalDurationSec <= 0 {
		totalDurationSec = blockSizeSec // Ít nhất 1 tập với thời lượng mặc định
	}

	forceHour := totalDurationSec >= 3600

	// Nếu tổng thời lượng nhỏ hơn hoặc bằng 1 block size -> duy nhất 1 tập
	if totalDurationSec <= blockSizeSec {
		return []domain.EpisodeDraft{
			{
				AudioID:         audioID,
				EpisodeNumber:   1,
				Title:           fmt.Sprintf("Tập 1 (%s - %s)", FormatTimeWithHourForce(0, forceHour), FormatTimeWithHourForce(totalDurationSec, forceHour)),
				StartSeconds:    0,
				EndSeconds:      totalDurationSec,
				DurationSeconds: totalDurationSec,
			},
		}
	}

	fullBlocks := totalDurationSec / blockSizeSec
	remainder := totalDurationSec % blockSizeSec
	threshold := GetRemainderThreshold(blockSizeSec)

	// Kiểm tra xem phần dư có được gộp vào tập cuối hay không
	mergeIntoLast := remainder > 0 && remainder <= threshold
	totalEpisodes := fullBlocks
	if remainder > 0 && !mergeIntoLast {
		totalEpisodes = fullBlocks + 1
	}

	episodes := make([]domain.EpisodeDraft, 0, totalEpisodes)

	for i := 0; i < totalEpisodes; i++ {
		start := i * blockSizeSec
		var end int
		if i == totalEpisodes-1 {
			// Tập cuối cùng luôn chạm đúng mốc totalDurationSec
			end = totalDurationSec
		} else {
			end = (i + 1) * blockSizeSec
		}

		duration := end - start
		if duration <= 0 {
			continue
		}

		title := fmt.Sprintf("Tập %d (%s - %s)", i+1, FormatTimeWithHourForce(start, forceHour), FormatTimeWithHourForce(end, forceHour))

		episodes = append(episodes, domain.EpisodeDraft{
			AudioID:         audioID,
			EpisodeNumber:   i + 1,
			Title:           title,
			StartSeconds:    start,
			EndSeconds:      end,
			DurationSeconds: duration,
		})
	}

	return episodes
}
